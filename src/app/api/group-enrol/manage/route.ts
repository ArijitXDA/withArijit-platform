import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── GET /api/group-enrol/manage?token=[manage_token] ──────────────────────────
// Passwordless management endpoint — the manage_token IS the auth.
// Returns the full group enrolment status for the purchaser's management page.
// Includes per-seat status so the purchaser can see who has activated.

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token)
      return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const supabase = createServiceClient()

    // ── Fetch group enrolment by manage_token ─────────────────────────────────
    const { data: ge, error: geErr } = await supabase
      .from('group_enrolments')
      .select(`
        id, purchaser_name, purchaser_email, purchaser_type,
        organization_name, course_name, course_id,
        quantity, seats_filled, seats_claimed,
        mrp_per_seat, total_mrp, total_discount, total_payable,
        discount_code, payment_status, paid_at,
        batch_id, created_at
      `)
      .eq('manage_token', token)
      .single()

    if (geErr || !ge)
      return NextResponse.json({ error: 'Invalid or expired manage token' }, { status: 404 })

    // ── Fetch all seats ───────────────────────────────────────────────────────
    const { data: seats } = await supabase
      .from('group_enrolment_seats')
      .select(`
        id, seat_number, invitee_name, invitee_email, invitee_mobile,
        invite_sent_at, invite_expires_at, invite_opened_at, invite_claimed_at,
        status, resend_count, last_resent_at,
        enrolment_id
      `)
      .eq('group_enrolment_id', ge.id)
      .order('seat_number')

    // ── Fetch batch info if pre-selected ─────────────────────────────────────
    let batchInfo: any = null
    if (ge.batch_id) {
      const { data: batch } = await supabase
        .from('awa_batches')
        .select('label, day_of_week, start_time, start_date, instructor_name')
        .eq('id', ge.batch_id)
        .single()
      batchInfo = batch
    }

    // ── Compute summary stats ─────────────────────────────────────────────────
    const allSeats     = seats ?? []
    const filled       = allSeats.length
    const invited      = allSeats.filter(s => ['invited','opened','signed_up','batch_selected','enrolled'].includes(s.status)).length
    const enrolled     = allSeats.filter(s => s.status === 'enrolled').length
    const pending      = allSeats.filter(s => s.status === 'invited').length
    const opened       = allSeats.filter(s => s.status === 'opened').length
    const unfilled     = ge.quantity - filled

    return NextResponse.json({
      group_enrolment: {
        ...ge,
        unfilled_seats: unfilled,
      },
      batch:    batchInfo,
      seats:    allSeats,
      summary: {
        total:    ge.quantity,
        filled,
        unfilled,
        invited,
        opened,
        enrolled,
        pending,
        activation_rate_pct: filled > 0 ? Math.round(enrolled / filled * 100) : 0,
      },
    })

  } catch (err: any) {
    console.error('[group-enrol/manage GET] unhandled:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
