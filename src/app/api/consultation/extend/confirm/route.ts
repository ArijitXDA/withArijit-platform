import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyPaymentSignature } from '@/lib/razorpay'
import { todayISO } from '@/lib/sessionSchedule'

// POST /api/consultation/extend/confirm — after the top-up payment: append N sessions to the
// SAME batch (continuing the weekly slot, reusing the Teams link), record the top-up, mint the
// invoice. Idempotent: the razorpay_payment_id claim + the extension_applied latch make the
// append exactly-once (webhook backstop / retry safe).

const hhmm = (t: string) => String(t).slice(0, 5)
const ymd = (y: number, mo: number, d: number) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
function addDaysStr(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const t = new Date(Date.UTC(y, mo - 1, d + days, 12))
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const orderId = String(body?.razorpay_order_id ?? '')
    const paymentId = String(body?.razorpay_payment_id ?? '')
    const signature = String(body?.razorpay_signature ?? '')

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    const fromWebhook = !!webhookSecret && req.headers.get('x-webhook-secret') === webhookSecret
    if (!orderId || !paymentId) return NextResponse.json({ error: 'Missing payment fields.' }, { status: 400 })
    if (!fromWebhook && (!signature || !verifyPaymentSignature(orderId, paymentId, signature))) {
      return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // Atomic idempotency claim on the extension order.
    const { data: ext } = await supabase
      .from('consultation_orders')
      .update({ razorpay_payment_id: paymentId, status: 'paid', updated_at: now })
      .eq('razorpay_order_id', orderId)
      .eq('order_kind', 'extension')
      .is('razorpay_payment_id', null)
      .select('*')
      .maybeSingle()

    if (!ext) {
      // Already claimed (other path / retry) — return idempotently.
      const { data: existing } = await supabase
        .from('consultation_orders')
        .select('id')
        .eq('razorpay_order_id', orderId)
        .maybeSingle()
      return existing
        ? NextResponse.json({ success: true, already: true })
        : NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    // Own the append via the extension_applied latch (exactly-once).
    const { data: latch } = await supabase
      .from('consultation_orders')
      .update({ extension_applied: true })
      .eq('id', ext.id)
      .eq('extension_applied', false)
      .select('id')
      .maybeSingle()

    if (latch) {
      const batchId = ext.parent_order_id ? await parentBatchId(supabase, ext.parent_order_id) : null
      let batch: any = null
      if (batchId) {
        const { data } = await supabase
          .from('awa_batches')
          .select('id, start_time, total_sessions, end_date, meeting_link, session_days')
          .eq('id', batchId)
          .maybeSingle()
        batch = data
      }

      if (!batch) {
        console.error('[consultation extend confirm] batch not found for ext', ext.id)
      } else {
        const extra = Number(ext.extra_sessions) || 0
        const sessionDays: any[] = Array.isArray(batch.session_days) ? batch.session_days : []
        const durationMins = sessionDays[0]?.duration_mins ?? 60
        const time = hhmm(batch.start_time)
        // Anchor after the latest existing session date (honours any prior extension).
        const lastDate = sessionDays.reduce<string>((mx, s) => (s?.date && s.date > mx ? s.date : mx), batch.end_date || sessionDays.at(-1)?.date || todayISO())
        const startN = Number(batch.total_sessions) || sessionDays.length

        const newDays: any[] = []
        const links: any[] = []
        for (let k = 1; k <= extra; k++) {
          const n = startN + k
          const date = addDaysStr(lastDate, 7 * k)
          newDays.push({ n, date, time, duration_mins: durationMins })
          links.push({
            batch_id: batch.id,
            session_number: n,
            session_title: `Consultation session ${n}`,
            meeting_link: batch.meeting_link,
            status: 'scheduled',
            override_date: date,
            override_time: `${time}:00`,
          })
        }

        const newEnd = newDays.length ? newDays[newDays.length - 1].date : batch.end_date
        await supabase
          .from('awa_batches')
          .update({ total_sessions: startN + extra, end_date: newEnd, session_days: [...sessionDays, ...newDays] })
          .eq('id', batch.id)
        const { error: linkErr } = await supabase
          .from('awa_session_links')
          .upsert(links, { onConflict: 'batch_id,session_number' })
        if (linkErr) console.warn('[consultation extend confirm] session_links upsert:', linkErr.message)
      }
    }

    // Record the top-up against the parent enrolment (best-effort) + mint the invoice number.
    const { data: parent } = await supabase
      .from('consultation_orders')
      .select('enrolment_id')
      .eq('id', ext.parent_order_id)
      .maybeSingle()
    const isDomestic = ext.tax_regime === 'domestic_gst'
    const bookInr = isDomestic ? Number(ext.total_inr) || 0 : Number(ext.inr_amount) || 0
    if (parent?.enrolment_id) {
      try {
        await supabase.rpc('create_payment_transaction', {
          p_enrolment_id: parent.enrolment_id,
          p_payment_type: 'full',
          p_instalment_number: 1,
          p_total_instalments: 1,
          p_amount_paid: bookInr,
          p_payment_mode: 'other',
          p_payment_date: todayISO(),
          p_payment_reference: paymentId,
          p_razorpay_order_id: orderId,
          p_partner_code: null,
        })
      } catch (e: any) {
        console.warn('[consultation extend confirm] payment_transaction:', e?.message)
      }
    }

    // Consume the discount code (once).
    if (ext.discount_code) {
      try {
        await supabase.rpc('increment_discount_uses', { p_code: String(ext.discount_code) })
      } catch (e: any) {
        console.warn('[consultation extend confirm] discount increment:', e?.message)
      }
    }

    let invoiceNumber = (ext.invoice_number as string | null) ?? null
    if (!invoiceNumber) {
      try {
        const { data: inv } = await supabase.rpc('consultation_next_invoice_number')
        if (typeof inv === 'string') invoiceNumber = inv
      } catch { /* non-fatal */ }
    }
    await supabase.from('consultation_orders').update({ invoice_number: invoiceNumber, updated_at: now }).eq('id', ext.id)

    return NextResponse.json({ success: true, scheduleToken: ext.schedule_token })
  } catch (err: any) {
    console.error('[consultation extend confirm]', err?.message)
    return NextResponse.json({ error: 'Payment received — we are adding your sessions. Please refresh in a moment.' }, { status: 500 })
  }
}

async function parentBatchId(supabase: ReturnType<typeof createServiceClient>, parentId: string): Promise<string | null> {
  const { data } = await supabase.from('consultation_orders').select('batch_id').eq('id', parentId).maybeSingle()
  return data?.batch_id ?? null
}
