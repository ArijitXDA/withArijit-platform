import { createServiceClient } from '@/lib/supabase/service'
import GroupEnrolClient from './_components/GroupEnrolClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Group Enrolment | oStaran',
  description: 'Enrol multiple students in an AI course at once. Pay once, invite your team.',
}

export const dynamic = 'force-dynamic'

export default async function GroupEnrolPage() {
  const service = createServiceClient()

  const [{ data: courses }, { data: batches }] = await Promise.all([
    service
      .from('awa_courses')
      .select('id, name, slug, mrp, target_audience, total_sessions')
      .eq('is_active', true)
      .order('sort_order'),
    service
      .from('awa_batches')
      .select('id, course_id, label, day_of_week, start_time, start_date, max_seats, seats_filled, is_open, is_active')
      .eq('is_active', true)
      .eq('is_open', true)
      .order('sort_order'),
  ])

  return (
    <GroupEnrolClient
      courses={courses ?? []}
      batches={batches ?? []}
    />
  )
}
