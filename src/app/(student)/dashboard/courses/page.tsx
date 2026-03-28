import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { BookOpen, Calendar, Clock, Users, Award, ExternalLink } from 'lucide-react'
import Link from 'next/link'

function fmtTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export default async function CoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // New enrolments
  const { data: enrolments } = await service
    .from('student_enrolments')
    .select(`
      id, created_at, enrolment_type, amount_paid, is_active, payment_date,
      course:course_id(id, name, short_name, description, total_sessions, session_duration_mins, slug, subjects),
      batch:batch_id(label, day_of_week, start_time, start_date, meeting_link, instructor_name)
    `)
    .eq('student_email', email)
    .order('created_at', { ascending: false })

  // Legacy enrolment from users table
  const { data: legacyUser } = await service
    .from('users')
    .select('name, course_name, batch_day_time, start_date, batch_id')
    .eq('email', email)
    .maybeSingle()

  const hasEnrolments = (enrolments ?? []).length > 0 || legacyUser?.course_name

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white">My Courses</h1>
        <p className="text-gray-500 text-sm mt-1">Your enrolled AI certification programmes</p>
      </div>

      {hasEnrolments ? (
        <div className="space-y-4">
          {/* New enrolments */}
          {(enrolments ?? []).map((e: any) => {
            const course = e.course
            const batch  = e.batch
            return (
              <div key={e.id} className="rounded-2xl border overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
                {/* Header */}
                <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">
                        {e.enrolment_type === 'full_course' ? 'Full Course' : 'Monthly Plan'}
                      </span>
                      <h2 className="text-white font-bold text-lg mt-1">{course?.name ?? 'AI Mastery Programme'}</h2>
                      {course?.description && (
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{
                        background: e.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                        color: e.is_active ? '#4ade80' : '#94a3b8',
                        border: `1px solid ${e.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)'}`,
                      }}>
                      {e.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {batch && (
                    <>
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Batch Timeslot</p>
                        <p className="text-white text-sm font-semibold">{batch.label}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Class Time</p>
                        <p className="text-white text-sm font-semibold">
                          {batch.day_of_week} {fmtTime(batch.start_time)} IST
                        </p>
                      </div>
                      {batch.start_date && (
                        <div>
                          <p className="text-gray-600 text-xs mb-1">Batch Start</p>
                          <p className="text-white text-sm font-semibold">
                            {new Date(batch.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600 text-xs mb-1">Trainer</p>
                        <p className="text-white text-sm font-semibold">{batch.instructor_name ?? 'Arijit Chowdhury'}</p>
                      </div>
                    </>
                  )}
                  {course?.total_sessions && (
                    <div>
                      <p className="text-gray-600 text-xs mb-1">Total Sessions</p>
                      <p className="text-white text-sm font-semibold">{course.total_sessions} sessions · {course.session_duration_mins ?? 90} min each</p>
                    </div>
                  )}
                </div>

                {/* Subjects */}
                {course?.subjects && Array.isArray(course.subjects) && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 text-xs mb-2">What You'll Learn</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(course.subjects as string[]).map((s: string) => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="px-6 py-3 border-t flex items-center gap-3 flex-wrap"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <Link href="/dashboard/sessions"
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                    <Calendar size={12} /> View Sessions
                  </Link>
                  <Link href="/dashboard/library"
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                    <BookOpen size={12} /> Study Materials
                  </Link>
                  {batch?.meeting_link && (
                    <a href={batch.meeting_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 font-semibold transition-colors">
                      <ExternalLink size={12} /> Join Class
                    </a>
                  )}
                  {course?.slug && (
                    <Link href={`/courses/${course.slug}`}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors ml-auto">
                      Course Page <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}

          {/* Legacy enrolment */}
          {!enrolments?.length && legacyUser?.course_name && (
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="px-6 py-5">
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">Full Course</span>
                <h2 className="text-white font-bold text-lg mt-1">{legacyUser.course_name}</h2>
                <div className="flex flex-wrap gap-4 mt-3">
                  {legacyUser.batch_day_time && (
                    <div>
                      <p className="text-gray-600 text-xs">Batch</p>
                      <p className="text-white text-sm font-semibold">{legacyUser.batch_day_time}</p>
                    </div>
                  )}
                  {legacyUser.start_date && (
                    <div>
                      <p className="text-gray-600 text-xs">Start Date</p>
                      <p className="text-white text-sm font-semibold">
                        {new Date(legacyUser.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-3 border-t flex gap-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <Link href="/dashboard/sessions" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                  View Sessions →
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border py-20 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <BookOpen size={40} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-semibold">No courses enrolled yet</p>
          <p className="text-gray-600 text-sm mt-2 mb-6">Enrol in an AI course to get started</p>
          <Link href="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#4f46e5' }}>
            Browse Courses →
          </Link>
        </div>
      )}
    </div>
  )
}
