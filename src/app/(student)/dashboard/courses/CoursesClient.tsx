'use client'
import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Calendar, Clock, ExternalLink, ChevronDown, ChevronUp, Video, FileText, Play, Lock } from 'lucide-react'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

interface Session {
  session_id: number
  session_title: string | null
  session_date: string
  session_start_time: string
  session_link: string | null
  study_material_link: string | null
  session_description: string | null
}

interface Course {
  id: string; name: string; short_name: string | null; description: string | null
  total_sessions: number | null; session_duration_mins: number | null
  slug: string | null; subjects: string[] | null
}

interface Batch {
  label: string; day_of_week: string; start_time: string
  start_date: string | null; meeting_link: string | null; instructor_name: string | null
}

interface Enrolment {
  id: string; created_at: string; enrolment_type: string
  amount_paid: string; is_active: boolean; payment_date: string | null
  enrolment_seq: number; course: Course | null; batch: Batch | null
  sessions: Session[]
}

// ── Sessions panel (expandable) ─────────────────────────────────────────────
function SessionsPanel({ sessions, totalSessions, batchMeetingLink }: {
  sessions: Session[]
  totalSessions: number | null
  batchMeetingLink: string | null
}) {
  const today    = new Date().toISOString().split('T')[0]
  const upcoming = sessions.filter(s => s.session_date >= today)
  const past     = sessions.filter(s => s.session_date < today)

  if (sessions.length === 0) {
    return (
      <div className="px-6 py-8 text-center border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <Calendar className="w-8 h-8 text-gray-700 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Sessions will appear here once scheduled</p>
        {totalSessions && (
          <p className="text-gray-600 text-xs mt-1">{totalSessions} sessions planned · 90 min each</p>
        )}
      </div>
    )
  }

  return (
    <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <p className="px-6 pt-4 pb-2 text-xs font-semibold text-green-400 uppercase tracking-wide">
            📅 Upcoming Sessions
          </p>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {upcoming.slice(0, 5).map(s => (
              <div key={s.session_id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <Video className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {s.session_title ?? `Session ${s.session_id}`}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {fmtDate(s.session_date)}
                      {s.session_start_time ? ` · ${fmtTime(s.session_start_time)} IST` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.study_material_link && (
                    <a href={s.study_material_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                      📄 Notes
                    </a>
                  )}
                  {(s.session_link || batchMeetingLink) && (
                    <a href={s.session_link ?? batchMeetingLink ?? '#'} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded-lg font-semibold text-white"
                      style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)' }}>
                      Join →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <p className="px-6 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            🎬 Past Sessions
          </p>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {past.slice(-5).reverse().map(s => (
              <div key={s.session_id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(99,102,241,0.08)' }}>
                    <Play className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-300 text-sm font-medium truncate">
                      {s.session_title ?? `Session ${s.session_id}`}
                    </p>
                    <p className="text-gray-600 text-xs mt-0.5">{fmtDate(s.session_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.study_material_link && (
                    <a href={s.study_material_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                      📄 Notes
                    </a>
                  )}
                  {s.session_link ? (
                    <a href={s.session_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                      ▶ Recording
                    </a>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)', color: '#475569' }}>
                      <Lock className="w-3 h-3 inline mr-1" />Recording
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {totalSessions && (
        <div className="px-6 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Course Progress</p>
            <p className="text-xs text-gray-400 font-medium">
              {past.length} / {totalSessions} sessions completed
            </p>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round((past.length / totalSessions) * 100))}%`,
                background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
              }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main course card ─────────────────────────────────────────────────────────
function CourseCard({ enrolment }: { enrolment: Enrolment }) {
  const [open, setOpen] = useState(false)
  const { course, batch, sessions } = enrolment
  const totalSessions = course?.total_sessions ?? null
  const today = new Date().toISOString().split('T')[0]
  const upcomingCount = sessions.filter(s => s.session_date >= today).length
  const pastCount     = sessions.filter(s => s.session_date < today).length

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>

      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">
              {enrolment.enrolment_type === 'full_course' ? 'Full Course' : 'Monthly Plan'}
              {enrolment.enrolment_seq > 1 && <span className="ml-2 text-amber-400">· Enrolment #{enrolment.enrolment_seq}</span>}
            </span>
            <h2 className="text-white font-bold text-lg mt-1">{course?.name ?? 'AI Mastery Programme'}</h2>
            {course?.description && (
              <p className="text-gray-500 text-sm mt-1 line-clamp-2">{course.description}</p>
            )}
          </div>
          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              background: enrolment.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
              color: enrolment.is_active ? '#4ade80' : '#94a3b8',
              border: `1px solid ${enrolment.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)'}`,
            }}>
            {enrolment.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Details grid */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {batch ? (
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
                <p className="text-white text-sm font-semibold">{fmtDate(batch.start_date)}</p>
              </div>
            )}
            <div>
              <p className="text-gray-600 text-xs mb-1">Trainer</p>
              <p className="text-white text-sm font-semibold">{batch.instructor_name ?? 'Arijit Chowdhury'}</p>
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <p className="text-amber-400 text-sm font-semibold">⚠️ Batch not selected yet</p>
            <Link href={`/select-batch?course_id=${course?.id}&enrolment_id=${enrolment.id}`}
              className="text-xs text-amber-400 underline mt-0.5 inline-block">
              Choose your batch →
            </Link>
          </div>
        )}

        {/* Sessions count */}
        {totalSessions && (
          <div>
            <p className="text-gray-600 text-xs mb-1">Total Sessions</p>
            <p className="text-white text-sm font-semibold">
              {totalSessions} sessions
              <span className="text-gray-500 font-normal"> · {course?.session_duration_mins ?? 90} min each</span>
            </p>
          </div>
        )}

        {/* Session progress summary */}
        {sessions.length > 0 && (
          <div>
            <p className="text-gray-600 text-xs mb-1">Sessions</p>
            <p className="text-white text-sm font-semibold">
              <span className="text-green-400">{upcomingCount} upcoming</span>
              {pastCount > 0 && <span className="text-gray-500"> · {pastCount} done</span>}
            </p>
          </div>
        )}
      </div>

      {/* Subjects */}
      {course?.subjects && Array.isArray(course.subjects) && course.subjects.length > 0 && (
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

      {/* Actions bar */}
      <div className="px-6 py-3 border-t flex items-center gap-4 flex-wrap"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {/* Sessions toggle button */}
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: open ? '#818cf8' : '#6366f1' }}>
          <Calendar size={12} />
          {open ? 'Hide Sessions' : `View Sessions${totalSessions ? ` (${totalSessions})` : ''}`}
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
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

      {/* Sessions panel — collapsible */}
      {open && (
        <SessionsPanel
          sessions={sessions}
          totalSessions={totalSessions}
          batchMeetingLink={batch?.meeting_link ?? null}
        />
      )}
    </div>
  )
}

// ── Page component ─────────────────────────────────────────────────────────
export default function CoursesClient({ enrolments, legacyUser }: {
  enrolments: Enrolment[]
  legacyUser: { course_name: string; batch_day_time: string | null; start_date: string | null } | null
}) {
  const hasEnrolments = enrolments.length > 0 || legacyUser?.course_name

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white">My Courses</h1>
        <p className="text-gray-500 text-sm mt-1">Your enrolled AI certification programmes</p>
      </div>

      {hasEnrolments ? (
        <div className="space-y-4">
          {enrolments.map(e => <CourseCard key={e.id} enrolment={e} />)}

          {/* Legacy enrolment — shown only if no new enrolments */}
          {!enrolments.length && legacyUser?.course_name && (
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
                      <p className="text-white text-sm font-semibold">{fmtDate(legacyUser.start_date)}</p>
                    </div>
                  )}
                </div>
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
