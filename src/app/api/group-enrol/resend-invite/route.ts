import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── POST /api/group-enrol/resend-invite ───────────────────────────────────────
// Lets the purchaser resend an invite to a specific seat.
// Requires manage_token + seat_id for authorisation (no login needed).
// Rate-limited: max 3 resends per seat.
// Regenerates the invite token (extends expiry, invalidates old link).

const MAX_RESENDS   = 3
const EXPIRY_DAYS   = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { manage_token, seat_id } = body

    if (!manage_token || !seat_id)
      return NextResponse.json({ error: 'manage_token and seat_id are required' }, { status: 400 })

    const supabase = createServiceClient()

    // ── 1. Verify manage_token owns this seat ─────────────────────────────────
    const { data: ge } = await supabase
      .from('group_enrolments')
      .select('id, purchaser_name, course_name, organization_name, batch_id, payment_status')
      .eq('manage_token', manage_token)
      .single()

    if (!ge)
      return NextResponse.json({ error: 'Invalid manage token' }, { status: 404 })

    if (ge.payment_status !== 'paid')
      return NextResponse.json({ error: 'Payment not confirmed' }, { status: 400 })

    const { data: seat } = await supabase
      .from('group_enrolment_seats')
      .select('id, invitee_name, invitee_email, invite_token, status, resend_count, invite_claimed_at')
      .eq('id', seat_id)
      .eq('group_enrolment_id', ge.id)   // ownership check
      .single()

    if (!seat)
      return NextResponse.json({ error: 'Seat not found or does not belong to this group enrolment' }, { status: 404 })

    // ── 2. Guard: already enrolled ────────────────────────────────────────────
    if (seat.status === 'enrolled' || seat.invite_claimed_at)
      return NextResponse.json({ error: 'This seat has already been activated — no need to resend' }, { status: 400 })

    // ── 3. Rate limit check ────────────────────────────────────────────────────
    if ((seat.resend_count ?? 0) >= MAX_RESENDS)
      return NextResponse.json({
        error: `Maximum ${MAX_RESENDS} resends allowed. Please contact support if the student is still unable to activate.`,
      }, { status: 429 })

    // ── 4. Generate a fresh invite token + extend expiry ─────────────────────
    const newToken  = crypto.randomUUID()
    const newExpiry = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { error: updateErr } = await supabase
      .from('group_enrolment_seats')
      .update({
        invite_token:    newToken,
        invite_expires_at: newExpiry,
        invite_sent_at:  new Date().toISOString(),
        resend_count:    (seat.resend_count ?? 0) + 1,
        last_resent_at:  new Date().toISOString(),
        status:          'invited',   // reset in case it was 'opened' but not claimed
      })
      .eq('id', seat_id)

    if (updateErr)
      return NextResponse.json({ error: `Failed to update seat: ${updateErr.message}` }, { status: 500 })

    // ── 5. Send fresh invite email ─────────────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ostaran.com'

    if (resendKey) {
      const activateUrl = `${appUrl}/activate?token=${newToken}`
      const firstName   = seat.invitee_name.split(' ')[0]
      const gifterFirst = ge.purchaser_name.split(' ')[0]
      const resendNum   = (seat.resend_count ?? 0) + 1

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
  🔔 Reminder: Activate your seat in ${ge.course_name}
</td></tr>

<tr><td style="font-size:14px;color:#374151;line-height:1.8;padding-bottom:20px;">
  Hi <strong>${firstName}</strong>,<br/><br/>
  This is a reminder that <strong>${gifterFirst}</strong>${ge.organization_name ? ` (${ge.organization_name})` : ''}
  has enrolled you in <strong>${ge.course_name}</strong>.<br/><br/>
  Your previous invitation link has been replaced with this fresh one.
  Click below to activate your seat now.
</td></tr>

<tr><td style="padding-bottom:24px;">
  <a href="${activateUrl}"
    style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
           border-radius:8px;font-weight:bold;font-size:16px;text-decoration:none;">
    Activate My Seat →
  </a>
</td></tr>

<tr><td style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px;font-size:13px;color:#92400e;line-height:1.7;margin-bottom:16px;">
  ⚠️ Your old invitation link is no longer valid. Please use the button above.
  This link expires in ${EXPIRY_DAYS} days.
</td></tr>

<tr><td style="font-size:12px;color:#9ca3af;padding-top:16px;">
  Resend ${resendNum} of ${MAX_RESENDS}. If you continue to have trouble, contact
  <a href="mailto:ai@ostaran.com" style="color:#4f46e5;">ai@ostaran.com</a>.
</td></tr>

<tr><td style="font-size:13px;color:#6b7280;padding-top:20px;border-top:1px solid #e5e7eb;margin-top:24px;">
  Star Analytix Pvt Ltd · Mira Road East, Mumbai ·
  <a href="mailto:ai@ostaran.com" style="color:#4f46e5;">ai@ostaran.com</a>
</td></tr>
</table>
</body></html>`

      await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    'oStaran AI Education <ai@ostaran.com>',
          to:      [seat.invitee_email],
          subject: `🔔 Reminder: Activate your seat in ${ge.course_name}`,
          html,
        }),
      })
    }

    return NextResponse.json({
      success:      true,
      resend_count: (seat.resend_count ?? 0) + 1,
      remaining_resends: MAX_RESENDS - ((seat.resend_count ?? 0) + 1),
    })

  } catch (err: any) {
    console.error('[group-enrol/resend-invite] unhandled:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
