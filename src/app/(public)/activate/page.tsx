import { createServiceClient } from '@/lib/supabase/service'
import { createClient }        from '@/lib/supabase/server'
import { redirect }            from 'next/navigation'
import ActivateClient          from './_components/ActivateClient'

// ── /activate?token=UUID ──────────────────────────────────────────────────────
// Invitee lands here from their invite email.
// Server component handles all validation + auth state before rendering client.

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) redirect('/')

  const service = createServiceClient()

  // ── 1. Validate invite token ───────────────────────────────────────────────
  const { data: seat, error: seatErr } = await service
    .from('group_enrolment_seats')
    .select(`
      id, seat_number, invitee_name, invitee_email, invitee_mobile,
      invite_token, invite_expires_at, invite_claimed_at,
      status, enrolment_id, group_enrolment_id
    `)
    .eq('invite_token', token)
    .single()

  if (seatErr || !seat) {
    return <ActivateClient state="invalid" token={token} />
  }

  // ── 2. Already enrolled ────────────────────────────────────────────────────
  if (seat.status === 'enrolled' || seat.invite_claimed_at) {
    return <ActivateClient state="already_enrolled" seat={seat} token={token} />
  }

  // ── 3. Expired ─────────────────────────────────────────────────────────────
  if (seat.invite_expires_at && new Date(seat.invite_expires_at) < new Date()) {
    return <ActivateClient state="expired" seat={seat} token={token} />
  }

  // ── 4. Fetch parent group enrolment ────────────────────────────────────────
  const { data: ge } = await service
    .from('group_enrolments')
    .select('id, purchaser_name, organization_name, course_id, course_name, batch_id, payment_status')
    .eq('id', seat.group_enrolment_id)
    .single()

  if (!ge || ge.payment_status !== 'paid') {
    return <ActivateClient state="invalid" token={token} />
  }

  // ── 5. Mark seat as opened (first visit) ──────────────────────────────────
  if (seat.status === 'invited') {
    await service
      .from('group_enrolment_seats')
      .update({ status: 'opened', invite_opened_at: new Date().toISOString() })
      .eq('id', seat.id)
  }

  // ── 6. Check if invitee is already signed in ───────────────────────────────
  const supabase   = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isSignedIn = !!user && user.email?.toLowerCase() === seat.invitee_email.toLowerCase()

  // ── 7. Fetch batch info if pre-selected ───────────────────────────────────
  let batchInfo: any = null
  if (ge.batch_id) {
    const { data: batch } = await service
      .from('awa_batches')
      .select('label, day_of_week, start_time, start_date, instructor_name')
      .eq('id', ge.batch_id)
      .single()
    batchInfo = batch
  }

  return (
    <ActivateClient
      state="valid"
      token={token}
      seat={seat}
      ge={ge}
      batchInfo={batchInfo}
      isSignedIn={isSignedIn}
      existingUserEmail={user?.email ?? null}
    />
  )
}
