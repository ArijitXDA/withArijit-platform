import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import AiMonitorClient from './_components/AiMonitorClient'

export default async function AiMonitorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // Fetch everything this student is allowed to see
  const [
    { data: profile },
    { data: enrolments },
    { data: sessions },
    { data: certificates },
    { data: payments },
    { data: batchSelections },
  ] = await Promise.all([
    service.from('student_profiles').select('full_name, mobile, occupation, key_skills').eq('email', email).maybeSingle(),
    service.from('student_enrolments').select(`
      id, course_name, enrolment_type, amount_paid, payment_date, is_active,
      course:course_id(name, total_sessions, session_duration_mins),
      batch:batch_id(label, day_of_week, start_time, start_date, meeting_link, batch_code),
      partner:partner_id(full_name, partner_code)
    `).eq('student_email', email).eq('is_active', true),
    service.from('session_master_table').select('session_id, session_title, session_date, session_start_time, session_link, study_material_link').order('session_date', { ascending: false }).limit(20),
    service.from('certificates').select('certificate_name, date_of_issuing, certificate_image_link').eq('user_email', email).eq('is_active', true),
    service.from('payments').select('amount, payment_date').eq('email', email).order('payment_date', { ascending: false }).limit(5),
    service.from('student_batch_selections').select('batch:batch_id(label, day_of_week, start_time, start_date, meeting_link)').eq('student_email', email),
  ])

  // Build a context object strictly scoped to THIS student only
  const studentContext = {
    name:         profile?.full_name ?? email.split('@')[0],
    email,
    occupation:   profile?.occupation ?? 'Not specified',
    skills:       profile?.key_skills ?? [],
    enrolments:   (enrolments ?? []).map((e: any) => ({
      course:      e.course?.name ?? e.course_name,
      type:        e.enrolment_type,
      amountPaid:  e.amount_paid,
      paymentDate: e.payment_date,
      batch:       e.batch ? {
        label:     e.batch.label,
        day:       e.batch.day_of_week,
        time:      e.batch.start_time,
        startDate: e.batch.start_date,
        joinLink:  e.batch.meeting_link,
        code:      e.batch.batch_code,
      } : null,
      partner:     e.partner?.full_name ?? null,
      sessions:    e.course?.total_sessions ?? null,
      duration:    e.course?.session_duration_mins ?? 90,
    })),
    recentSessions: (sessions ?? []).map((s: any) => ({
      title:        s.session_title ?? 'Session',
      date:         s.session_date,
      time:         s.session_start_time,
      joinLink:     s.session_link,
      materials:    s.study_material_link,
    })),
    certificates: (certificates ?? []).map((c: any) => ({
      name: c.certificate_name,
      date: c.date_of_issuing,
      link: c.certificate_image_link,
    })),
    totalPaid: (payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0),
  }

  return <AiMonitorClient studentContext={studentContext} />
}
