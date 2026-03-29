import { createServiceClient } from '@/lib/supabase/service'
import CommunicationsClient from './_components/CommunicationsClient'

export default async function CommunicationsPage() {
  const service = createServiceClient()

  // Load upcoming webinar sessions for broadcast target picker
  const { data: sessions } = await service
    .from('awa_webinar_sessions')
    .select('id, course_name, webinar_date, webinar_time, status, countdown_sent_at, live_notified_at, feedback_sent_at')
    .gte('webinar_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
    .order('webinar_date', { ascending: false })
    .limit(20)

  // Load enrolled students batch/course targets for student broadcasts
  const { data: batches } = await service
    .from('awa_batches')
    .select('id, label, batch_code, course_id, is_open, seats_filled')
    .eq('is_open', true)
    .order('label')

  const { data: courses } = await service
    .from('awa_courses')
    .select('id, name, short_name')
    .eq('is_active', true)
    .order('sort_order')

  // Recent campaign history
  const { data: recentCampaigns } = await service
    .from('student_reminder_campaigns')
    .select('id, created_at, status, sent_count, failed_count, total_recipients, template_snapshot, triggered_by_name')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <CommunicationsClient
      sessions={(sessions ?? []) as any[]}
      batches={(batches ?? []) as any[]}
      courses={(courses ?? []) as any[]}
      recentCampaigns={(recentCampaigns ?? []) as any[]}
    />
  )
}
