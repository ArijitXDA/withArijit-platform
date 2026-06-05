import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── POST /api/group-enrol/submit-seats ────────────────────────────────────────
// Called after payment success, from the seat-fill page.
// Accepts an array of { name, email, mobile } — one entry per seat.
// For each seat:
//   1. Validates the email is not already enrolled in this course
//   2. Upserts into group_enrolment_seats (allows partial re-submission)
//   3. Sends personalised invite email via Resend (batched — 10/sec max)
// Partial submissions are allowed — purchaser can add more seats later.
// Already-invited seats are skipped (idempotent).

const BATCH_SIZE  = 10     // emails per batch
const BATCH_DELAY = 1000   // ms between batches

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface SeatInput {
  name:   string
  email:  string
  mobile: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { manage_token, seats }: { manage_token: string; seats: SeatInput[] } = body

    if (!manage_token)
      return NextResponse.json({ error: 'manage_token is required' }, { status: 400 })

    if (!Array.isArray(seats) || seats.length === 0)
      return NextResponse.json({ error: 'At least one seat is required' }, { status: 400 })

    const supabase   = createServiceClient()
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ostaran.com'
    const resendKey  = process.env.RESEND_API_KEY

    // ── 1. Validate manage_token — fetch the paid group enrolment ─────────────
    const { data: ge, error: geErr } = await supabase
      .from('group_enrolments')
      .select('id, purchaser_name, purchaser_email, course_id, course_name, quantity, seats_filled, batch_id, payment_status')
      .eq('manage_token', manage_token)
      .single()

    if (geErr || !ge)
      return NextResponse.json({ error: 'Invalid or expired manage token' }, { status: 404 })

    if (ge.payment_status !== 'paid')
      return NextResponse.json({ error: 'Payment has not been confirmed yet' }, { status: 400 })

    // Validate submitted count doesn't exceed purchased quantity
    const currentFilled = ge.seats_filled ?? 0
    const newSeats      = seats.length
    if (currentFilled + newSeats > ge.quantity)
      return NextResponse.json({
        error: `You are trying to add ${newSeats} seats but only ${ge.quantity - currentFilled} remain unfilled`,
      }, { status: 400 })

    // ── 2. Validate + normalise each seat ─────────────────────────────────────
    const errors: string[] = []
    const normalised: SeatInput[] = []
    const emailSet = new Set<string>()

    for (let i = 0; i < seats.length; i++) {
      const s     = seats[i]
      const label = `Seat ${currentFilled + i + 1}`
      const email = s.email?.trim().toLowerCase()

      if (!s.name?.trim())  { errors.push(`${label}: Name is required`);  continue }
      if (!email)           { errors.push(`${label}: Email is required`);  continue }
      if (!s.mobile?.trim()) { errors.push(`${label}: Mobile is required`); continue }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`${label}: "${email}" is not a valid email address`); continue
      }
      if (email === ge.purchaser_email) {
        errors.push(`${label}: Purchaser cannot enrol themselves via a group invite`); continue
      }
      if (emailSet.has(email)) {
        errors.push(`${label}: Duplicate email "${email}" in this submission`); continue
      }
      emailSet.add(email)
      normalised.push({ name: s.name.trim(), email, mobile: s.mobile.trim() })
    }

    if (errors.length > 0)
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })

    // ── 3. Check for already-invited seats (idempotency) ─────────────────────
    const { data: existingSeats } = await supabase
      .from('group_enrolment_seats')
      .select('invitee_email, status, invite_token')
      .eq('group_enrolment_id', ge.id)

    const alreadyInvited = new Set(
      (existingSeats ?? [])
        .filter(s => s.status !== 'unfilled')
        .map(s => s.invitee_email)
    )

    const toProcess = normalised.filter(s => !alreadyInvited.has(s.email))
    const skipped   = normalised.length - toProcess.length

    if (toProcess.length === 0)
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped,
        message: 'All submitted emails have already been invited',
      })

    // ── 4. Insert seat rows + generate invite tokens ──────────────────────────
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

    const seatRows = toProcess.map((s, idx) => ({
      group_enrolment_id: ge.id,
      seat_number:        currentFilled + idx + 1,
      invitee_name:       s.name,
      invitee_email:      s.email,
      invitee_mobile:     s.mobile,
      invite_expires_at:  expires,
      status:             'invited',
      // invite_token auto-generated by DB default (gen_random_uuid())
    }))

    const { data: insertedSeats, error: insertErr } = await supabase
      .from('group_enrolment_seats')
      .insert(seatRows)
      .select('id, invitee_name, invitee_email, invite_token, seat_number')

    if (insertErr)
      return NextResponse.json({ error: `Failed to create seat records: ${insertErr.message}` }, { status: 500 })

    // ── 5. Update seats_filled count on parent record ─────────────────────────
    await supabase
      .from('group_enrolments')
      .update({ seats_filled: currentFilled + toProcess.length })
      .eq('id', ge.id)

    // ── 6. Send invite emails in batches (non-blocking after response) ────────
    // Fire the email loop async — don't await it
    void sendInviteEmailsBatched({
      seats:         insertedSeats ?? [],
      ge,
      appUrl,
      resendKey:     resendKey ?? '',
      supabase,
    })

    return NextResponse.json({
      success:    true,
      processed:  toProcess.length,
      skipped,
      total_filled: currentFilled + toProcess.length,
      total_seats:  ge.quantity,
      remaining:    ge.quantity - (currentFilled + toProcess.length),
    })

  } catch (err: any) {
    console.error('[group-enrol/submit-seats] unhandled:', err.message)
    return NextResponse.json({ error: `Failed to submit seats: ${err.message}` }, { status: 500 })
  }
}

// ── Batched invite email sender ────────────────────────────────────────────────
async function sendInviteEmailsBatched(params: {
  seats:    { id: string; invitee_name: string; invitee_email: string; invite_token: string; seat_number: number }[]
  ge:       any
  appUrl:   string
  resendKey: string
  supabase: ReturnType<typeof createServiceClient>
}) {
  const { seats, ge, appUrl, resendKey, supabase } = params
  if (!resendKey) return

  const batches: (typeof seats)[] = []
  for (let i = 0; i < seats.length; i += BATCH_SIZE) {
    batches.push(seats.slice(i, i + BATCH_SIZE))
  }

  for (let b = 0; b < batches.length; b++) {
    if (b > 0) await sleep(BATCH_DELAY)

    await Promise.allSettled(
      batches[b].map(seat => sendInviteEmail({ seat, ge, appUrl, resendKey, supabase }))
    )
  }

  console.log(`[group-enrol] Sent ${seats.length} invite emails for group ${ge.id}`)
}

// ── Single invite email ────────────────────────────────────────────────────────
async function sendInviteEmail(params: {
  seat:     { id: string; invitee_name: string; invitee_email: string; invite_token: string; seat_number: number }
  ge:       any
  appUrl:   string
  resendKey: string
  supabase: ReturnType<typeof createServiceClient>
}) {
  const { seat, ge, appUrl, resendKey, supabase } = params
  const activateUrl = `${appUrl}/activate?token=${seat.invite_token}`
  const firstName   = seat.invitee_name.split(' ')[0]
  const gifterFirst = ge.purchaser_name.split(' ')[0]

  const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px 0;">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:8px;padding:32px;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.06);">

<tr><td>
  <div style="background:#000;padding:4px 12px;border-radius:6px;display:inline-block;margin-bottom:24px;">
    <img src="https://www.ostaran.com/ostaran-logo.png" alt="oStaran" style="height:32px;display:block;" />
  </div>
</td></tr>

<tr><td style="font-size:22px;font-weight:bold;color:#111827;padding-bottom:12px;">
  🎁 You've been enrolled in an AI Course!
</td></tr>

<tr><td style="font-size:14px;color:#374151;line-height:1.8;padding-bottom:20px;">
  Hi <strong>${firstName}</strong>,<br/><br/>
  <strong>${gifterFirst}</strong>${ge.organization_name ? ` (${ge.organization_name})` : ''} has enrolled you in
  <strong>${ge.course_name}</strong> on oStaran.<br/><br/>
  Click the button below to activate your seat, create your account and get started.
  This is your personal invitation — do not share it.
</td></tr>

<tr><td style="padding-bottom:24px;">
  <a href="${activateUrl}"
    style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
           border-radius:8px;font-weight:bold;font-size:16px;text-decoration:none;">
    Activate My Seat →
  </a>
</td></tr>

<tr><td style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px;color:#6b7280;line-height:1.7;">
  <strong>Course:</strong> ${ge.course_name}<br/>
  ${ge.batch_id ? '<strong>Batch:</strong> Pre-selected — you\'ll see the schedule after sign-in<br/>' : '<strong>Batch:</strong> You\'ll choose your preferred schedule after signing in<br/>'}
  <strong>Invitation expires:</strong> 30 days from now
</td></tr>

<tr><td style="font-size:12px;color:#9ca3af;padding-bottom:16px;">
  ⚠️ This link is unique to you. Do not forward this email.
  If you believe you received this in error, you can safely ignore it.
</td></tr>

<tr><td style="font-size:13px;color:#6b7280;padding-top:20px;border-top:1px solid #e5e7eb;">
  Star Analytix Pvt Ltd · Mira Road East, Mumbai ·
  <a href="mailto:ai@ostaran.com" style="color:#4f46e5;">ai@ostaran.com</a>
</td></tr>
</table>
</body></html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'oStaran AI Education <ai@ostaran.com>',
        to:      [seat.invitee_email],
        subject: `🎁 ${gifterFirst} has enrolled you in ${ge.course_name} — Activate your seat`,
        html,
      }),
    })

    if (res.ok) {
      await supabase
        .from('group_enrolment_seats')
        .update({ invite_sent_at: new Date().toISOString() })
        .eq('id', seat.id)
    } else {
      const errBody = await res.text()
      console.warn(`[group-enrol invite] Email to ${seat.invitee_email} failed:`, errBody)
      await supabase
        .from('group_enrolment_seats')
        .update({ status: 'invited' })  // keep status but log via console
        .eq('id', seat.id)
    }
  } catch (e: any) {
    console.warn(`[group-enrol invite] Email to ${seat.invitee_email} threw:`, e.message)
  }
}
