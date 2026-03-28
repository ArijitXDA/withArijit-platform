import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import ProfileClient from './_components/ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // Load profile, enrolment, batch, partner in parallel
  const [
    { data: profile },
    { data: enrolment },
    { data: webinarReg },
  ] = await Promise.all([
    service
      .from('student_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle(),

    service
      .from('student_enrolments')
      .select(`
        id, created_at, course_name, enrolment_type, amount_paid, payment_date,
        course:course_id(name, short_name, total_sessions, session_duration_mins, slug),
        batch:batch_id(label, day_of_week, start_time, start_date, meeting_link, meeting_platform, instructor_name, batch_code),
        partner:partner_id(full_name, partner_code, mobile, email)
      `)
      .eq('student_email', email)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    service
      .from('qr_landing_registrations')
      .select('created_at, webinar_date, utm_source')
      .eq('email', email)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  // Also try legacy users table for any pre-existing data
  const { data: legacyUser } = await service
    .from('users')
    .select('name, mobile_no, occupation, course_name, batch_day_time, created_at')
    .eq('email', email)
    .maybeSingle()

  return (
    <ProfileClient
      email={email}
      userId={user.id}
      profile={profile}
      enrolment={enrolment as any}
      webinarReg={webinarReg as any}
      legacyUser={legacyUser as any}
    />
  )
}
