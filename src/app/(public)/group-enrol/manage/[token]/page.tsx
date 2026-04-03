import { createServiceClient } from '@/lib/supabase/service'
import { notFound }            from 'next/navigation'
import ManageClient            from './_components/ManageClient'

export const dynamic = 'force-dynamic'

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const service = createServiceClient()

  const { data: ge } = await service
    .from('group_enrolments')
    .select(`
      id, purchaser_name, purchaser_email, purchaser_type,
      organization_name, course_name, course_id,
      quantity, seats_filled, seats_claimed,
      mrp_per_seat, total_mrp, total_discount, total_payable, gst_amount,
      discount_code, payment_status, paid_at, batch_id, created_at
    `)
    .eq('manage_token', token)
    .single()

  if (!ge || ge.payment_status !== 'paid') notFound()

  const { data: seats } = await service
    .from('group_enrolment_seats')
    .select(`
      id, seat_number, invitee_name, invitee_email, invitee_mobile,
      invite_sent_at, invite_expires_at, invite_opened_at, invite_claimed_at,
      status, resend_count, last_resent_at, enrolment_id
    `)
    .eq('group_enrolment_id', ge.id)
    .order('seat_number')

  let batchInfo: any = null
  if (ge.batch_id) {
    const { data } = await service
      .from('awa_batches')
      .select('label, day_of_week, start_time, start_date')
      .eq('id', ge.batch_id)
      .single()
    batchInfo = data
  }

  return (
    <ManageClient
      ge={ge}
      seats={seats ?? []}
      batchInfo={batchInfo}
      manageToken={token}
    />
  )
}
