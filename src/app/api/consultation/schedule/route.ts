import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SKU_SESSIONS, type DurationSku } from '@/lib/consultationCheckoutPricing'

// POST /api/consultation/schedule — the buyer picks their slot AFTER paying. Given a paid
// order (via schedule_token) + a chosen IST date/time, this creates the custom-dated batch,
// mints ONE Teams meeting (via the partner app's Graph integration), fills the session_links,
// and attaches the batch to the enrolment.
//
// Idempotency/concurrency: the UNIQUE awa_batches.batch_code (deterministic per order) is the
// atomic latch — the first request INSERTs the batch and becomes the "owner"; any concurrent
// or retried request hits the unique violation and ADOPTS the existing batch instead of
// double-creating. So a double-click, a webhook-style retry, or a crash-then-retry all
// converge on exactly one batch + one Teams meeting.

const PARTNER_ORIGIN = 'https://partner.ostaran.com'
const IST_DAYS = new Set([1, 2, 4]) // Mon, Tue, Thu (ISO weekday)
const MINT_TIMEOUT_MS = 6000

function allowedStarts(durationMins: number): Set<string> {
  const windows: [number, number][] = [
    [10 * 60, 12 * 60],
    [17 * 60, 19 * 60],
  ]
  const set = new Set<string>()
  for (const [from, to] of windows) {
    for (let m = from; m + durationMins <= to; m += durationMins) {
      set.add(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
    }
  }
  return set
}

function isoWeekday(y: number, mo: number, d: number): number {
  return ((new Date(Date.UTC(y, mo - 1, d, 12)).getUTCDay() + 6) % 7) + 1
}
function istToUtcISO(y: number, mo: number, d: number, hh: number, mm: number): string {
  return new Date(Date.UTC(y, mo - 1, d, hh - 5, mm - 30)).toISOString()
}
function addDays(y: number, mo: number, d: number, days: number) {
  const t = new Date(Date.UTC(y, mo - 1, d + days, 12))
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() }
}
const ymd = (y: number, mo: number, d: number) =>
  `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

async function mintMeeting(
  supabase: ReturnType<typeof createServiceClient>,
  subject: string,
  startISO: string,
  endISO: string,
): Promise<string | null> {
  try {
    const { data: cfg } = await supabase
      .from('transcript_fetch_config')
      .select('cron_key')
      .eq('id', 1)
      .maybeSingle()
    const cronKey = cfg?.cron_key
    if (!cronKey) return null
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), MINT_TIMEOUT_MS)
    try {
      const res = await fetch(`${PARTNER_ORIGIN}/api/consultation/mint-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronKey}` },
        body: JSON.stringify({ subject, startISO, endISO }),
        signal: ctrl.signal,
      })
      const r = await res.json().catch(() => ({}))
      if (res.ok && r?.joinWebUrl) return r.joinWebUrl
      console.warn('[consultation schedule] meeting mint failed:', r?.error)
      return null
    } finally {
      clearTimeout(timer)
    }
  } catch (e: any) {
    console.warn('[consultation schedule] meeting mint error:', e?.message)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const token = String(body?.schedule_token ?? '').trim()
    const startDate = String(body?.start_date ?? '').trim()
    const startTime = String(body?.start_time ?? '').trim()

    if (!token || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json({ error: 'A valid slot is required.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    const { data: order } = await supabase
      .from('consultation_orders')
      .select('*')
      .eq('schedule_token', token)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

    // Fast path: already scheduled.
    if (order.status === 'scheduled' && order.batch_id) {
      const { data: b } = await supabase
        .from('awa_batches')
        .select('meeting_link')
        .eq('id', order.batch_id)
        .maybeSingle()
      return NextResponse.json({ success: true, alreadyScheduled: true, joinUrl: b?.meeting_link ?? null })
    }
    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'This booking is not ready to schedule.' }, { status: 400 })
    }

    // ── Validate the chosen slot ─────────────────────────────────────────────
    const [y, mo, d] = startDate.split('-').map(Number)
    const [hh, mm] = startTime.split(':').map(Number)
    const durationMins = order.duration_sku === 'min30' ? 30 : 60
    if (!IST_DAYS.has(isoWeekday(y, mo, d))) {
      return NextResponse.json({ error: 'Please pick a Monday, Tuesday or Thursday.' }, { status: 400 })
    }
    if (!allowedStarts(durationMins).has(startTime)) {
      return NextResponse.json({ error: 'Please pick a time within the available windows.' }, { status: 400 })
    }
    if (istToUtcISO(y, mo, d, hh, mm) <= now) {
      return NextResponse.json({ error: 'Please pick a future slot.' }, { status: 400 })
    }

    const sessions = Number(order.sessions) || SKU_SESSIONS[order.duration_sku as DurationSku] || 1
    const sessionDays: { n: number; date: string; time: string; duration_mins: number }[] = []
    for (let n = 1; n <= sessions; n++) {
      const dd = addDays(y, mo, d, 7 * (n - 1))
      sessionDays.push({ n, date: ymd(dd.y, dd.mo, dd.d), time: startTime, duration_mins: durationMins })
    }
    const lastDay = sessionDays[sessionDays.length - 1]

    // ── Course guard (before any side effect) ────────────────────────────────
    const { data: course } = await supabase
      .from('awa_courses')
      .select('id')
      .eq('slug', 'expert-consultation')
      .maybeSingle()
    if (!course) {
      console.error('[consultation schedule] expert-consultation course missing')
      return NextResponse.json({ error: 'Consultation product missing.' }, { status: 500 })
    }

    const batchCode = `CONSULT-${String(order.id).slice(0, 8)}`

    // ── Atomic latch: try to INSERT the batch; adopt the existing one on conflict ─
    let batchId: string
    let joinUrl: string | null
    const { data: inserted, error: insErr } = await supabase
      .from('awa_batches')
      .insert({
        course_id: course.id,
        batch_code: batchCode,
        label: `Expert Consultation · ${order.buyer_name ?? ''}`.trim(),
        day_of_week: DAY_NAMES[isoWeekday(y, mo, d)],
        start_time: `${startTime}:00`,
        duration_mins: durationMins,
        timezone: 'Asia/Kolkata',
        start_date: startDate,
        end_date: lastDay.date,
        max_seats: Math.max(1, (Number(order.attendees) || 1) + 1),
        total_sessions: sessions,
        variant: 'long26', // inert placeholder — is_custom_format guards the UI label
        is_custom_format: true,
        session_days: sessionDays,
        is_open: false,
        meeting_link: null,
      })
      .select('id, meeting_link')
      .single()

    if (insErr) {
      if ((insErr as any).code === '23505') {
        // Concurrent/retry: adopt the batch another invocation already created.
        const { data: existing } = await supabase
          .from('awa_batches')
          .select('id, meeting_link')
          .eq('batch_code', batchCode)
          .maybeSingle()
        if (!existing) {
          console.error('[consultation schedule] batch conflict but none found:', batchCode)
          return NextResponse.json({ error: 'Could not create your sessions. Please retry.' }, { status: 500 })
        }
        batchId = existing.id
        joinUrl = existing.meeting_link
      } else {
        console.error('[consultation schedule] batch insert failed:', insErr.message)
        return NextResponse.json({ error: 'Could not create your sessions. Our team has been alerted.' }, { status: 500 })
      }
    } else {
      batchId = inserted!.id
      joinUrl = inserted!.meeting_link
    }

    // ── Mint the Teams meeting if the batch doesn't have one yet (best-effort) ─
    if (!joinUrl) {
      const startISO = istToUtcISO(y, mo, d, hh, mm)
      const endISO = new Date(new Date(startISO).getTime() + durationMins * 60000).toISOString()
      joinUrl = await mintMeeting(supabase, `Expert Consultation — ${order.buyer_name ?? 'Session'}`, startISO, endISO)
      if (joinUrl) {
        // Only set it if still null, so a racing adopter can't clobber the owner's link.
        await supabase.from('awa_batches').update({ meeting_link: joinUrl }).eq('id', batchId).is('meeting_link', null)
      }
    }

    // ── Session links (idempotent upsert; dates on override_date/time) ────────
    const links = sessionDays.map((s) => ({
      batch_id: batchId,
      session_number: s.n,
      session_title: sessions > 1 ? `Consultation session ${s.n}` : 'Expert Consultation',
      meeting_link: joinUrl,
      status: 'scheduled',
      override_date: s.date,
      override_time: `${s.time}:00`,
    }))
    const { error: linkErr } = await supabase
      .from('awa_session_links')
      .upsert(links, { onConflict: 'batch_id,session_number' })
    if (linkErr) console.warn('[consultation schedule] session_links upsert failed:', linkErr.message)

    // ── Attach the batch to the enrolment + finalise the order (idempotent) ──
    if (order.enrolment_id) {
      await supabase.from('student_enrolments').update({ batch_id: batchId }).eq('id', order.enrolment_id)
    }
    await supabase
      .from('consultation_orders')
      .update({ status: 'scheduled', batch_id: batchId, updated_at: now })
      .eq('id', order.id)

    return NextResponse.json({
      success: true,
      joinUrl,
      sessions: sessionDays.map((s) => ({ date: s.date, time: s.time })),
    })
  } catch (err: any) {
    console.error('[consultation schedule]', err?.message)
    return NextResponse.json({ error: 'Could not schedule your sessions. Please contact support.' }, { status: 500 })
  }
}
