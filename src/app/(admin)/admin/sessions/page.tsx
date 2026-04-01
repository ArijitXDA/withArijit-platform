import { createServiceClient } from '@/lib/supabase/service'
import SessionsAdminClient from './_components/SessionsAdminClient'

export default async function AdminSessionsPage() {
  const service = createServiceClient()

  // Fetch all active batches with course info, ordered by sort_order
  const { data: batches } = await service
    .from('awa_batches')
    .select(`
      id, batch_code, label, day_of_week,
      start_time, start_date, duration_mins,
      course:course_id(id, name, short_name)
    `)
    .eq('is_active', true)
    .order('sort_order')

  return <SessionsAdminClient batches={(batches as any) ?? []} />
}
