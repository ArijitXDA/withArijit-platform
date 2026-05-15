import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { CommunityShell } from './_components/CommunityShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Community | oStaran',
  description: 'Join the oStaran AI learning community. Chat with fellow learners, ask questions, and get answers from Ask Ari — our AI research assistant.',
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getChannels() {
  const { data } = await admin()
    .from('community_channels')
    .select('id, slug, name, description, icon, sort_order')
    .eq('is_active', true)
    .order('sort_order')
  return data ?? []
}

// Next scheduled webinar — picks earliest future session across course variants.
// One row is enough because all course variants run at the same time slot on
// the Sunday session (verified in awa_webinar_sessions).
async function getNextWebinar() {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await admin()
    .from('awa_webinar_sessions')
    .select('id, webinar_date, webinar_time, course_short_name, course_name, status')
    .gte('webinar_date', today)
    .in('status', ['scheduled', 'published', 'live'])
    .order('webinar_date', { ascending: true })
    .order('webinar_time', { ascending: true })
    .limit(1)
  return data?.[0] ?? null
}

// Cohort forecast — all open future batches, both variants. CohortCard does
// the per-variant filtering & sorting client-side.
async function getCohortForecast() {
  const { data } = await admin()
    .from('v_anaant_cohort_fill_forecast')
    .select('batch_id, batch_code, label, variant, day_of_week, start_date, start_time, max_seats, seats_filled, fill_pct, days_to_start, status_note')
  return data ?? []
}

export default async function CommunityPage() {
  const [channels, webinar, cohorts] = await Promise.all([
    getChannels(),
    getNextWebinar(),
    getCohortForecast(),
  ])
  return <CommunityShell channels={channels} webinar={webinar} cohorts={cohorts as any} />
}
