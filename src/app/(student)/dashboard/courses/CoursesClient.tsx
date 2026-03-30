'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Calendar, Clock, ExternalLink,
  ChevronDown, ChevronUp, Video, FileText, Play, Lock,
} from 'lucide-react'

const T = {
  surface: '#ffffff', border: '#dce6f5', borderLight: '#e8f0fc', surfaceHov: '#f0f6ff',
  navy: '#0f1f3d', blue: '#2563eb', blueMid: '#1d4ed8', blueLight: '#eff6ff', bluePale: '#dbeafe',
  textPrimary: '#0f1f3d', textSec: '#475569', textMuted: '#94a3b8',
  green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#bbf7d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBorder: '#fde68a',
  indigo: '#4f46e5', indigoBg: '#eef2ff', indigoBorder: '#c7d2fe',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBorder: '#ddd6fe',
  slate: '#64748b',
}

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

// ── Sessions panel ────────────────────────────────────────────────────────────
function SessionsPanel({ sessions, totalSessions, batchMeetingLink }: {
  sessions: Session[]; totalSessions: number | null; batchMeetingLink: string | null
}) {
  const today    = new Date().toISOString().split('T')[0]
  const upcoming = sessions.filter(s => s.session_date >= today)
  const past     = sessions.filter(s => s.session_date < today)

  if (sessions.length === 0) {
    return (
      <div className="px-5 py-8 text-center border-t" style={{ borderColor: T.borderLight }}>
        <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
          style={{ background: T.blueLight }}>
          <Calendar size={16} style={{ color: T.bluePale }} />
        </div>
        <p className="text-sm" style={{ color: T.textSec }}>Sessions will appear here once scheduled</p>
        {totalSessions && (
          <p className="text-xs mt-1" style={{ color: T.textMuted }}>{totalSessions} sessions planned · 90 min each</p>
        )}
      </div>
    )
  }

  return (
    <div className="border-t" style={{ borderColor: T.borderLight }}>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <p className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wide"
            style={{ color: T.green }}>📅 Upcoming Sessions</p>
          <div className="divide-y" style={{ borderColor: T.borderLight }}>
            {upcoming.slice(0, 5).map(s => (
              <div key={s.session_id}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-green-50/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
                    <Video size={13} style={{ color: T.green }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>
                      {s.session_title ?? `Session ${s.session_id}`}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                      {fmtDate(s.session_date)}{s.session_start_time ? ` · ${fmtTime(s.session_start_time)} IST` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.study_material_link && (
                    <a href={s.study_material_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ background: T.indigoBg, color: T.indigo, border: `1px solid ${T.indigoBorder}` }}>
                      📄 Notes
                    </a>
                  )}
                  {(s.session_link || batchMeetingLink) && (
                    <a href={s.session_link ?? batchMeetingLink ?? '#'} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-lg font-semibold text-white"
                      style={{ background: T.green }}>
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
          <p className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wide"
            style={{ color: T.textMuted }}>🎬 Past Sessions</p>
          <div className="divide-y" style={{ borderColor: T.borderLight }}>
            {past.slice(-5).reverse().map(s => (
              <div key={s.session_id}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: T.indigoBg, border: `1px solid ${T.indigoBorder}` }}>
                    <Play size={13} style={{ color: T.indigo }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: T.textSec }}>
                      {s.session_title ?? `Session ${s.session_id}`}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{fmtDate(s.session_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.study_material_link && (
                    <a href={s.study_material_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ background: T.indigoBg, color: T.indigo, border: `1px solid ${T.indigoBorder}` }}>
                      📄 Notes
                    </a>
                  )}
                  {s.session_link ? (
                    <a href={s.session_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ background: T.purpleBg, color: T.purple, border: `1px solid ${T.purpleBorder}` }}>
                      ▶ Recording
                    </a>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                      style={{ background: '#f1f5f9', color: T.textMuted }}>
                      <Lock size={10} /> Recording
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
        <div className="px-5 py-3 border-t" style={{ borderColor: T.borderLight }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium" style={{ color: T.textSec }}>Course Progress</p>
            <p className="text-xs font-semibold" style={{ color: T.textPrimary }}>
              {past.length} / {totalSessions} sessions completed
            </p>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.bluePale }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round((past.length / totalSessions) * 100))}%`,
                background: `linear-gradient(90deg, ${T.blue}, ${T.indigo})`,
              }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Course card ───────────────────────────────────────────────────────────────
function CourseCard({ enrolment }: { enrolment: Enrolment }) {
  const [open, setOpen] = useState(false)
  const { course, batch, sessions } = enrolment
  const totalSessions  = course?.total_sessions ?? null
  const today          = new Date().toISOString().split('T')[0]
  const upcomingCount  = sessions.filter(s => s.session_date >= today).length
  const pastCount      = sessions.filter(s => s.session_date < today).length

  return (
    <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${T.border}` }}>

      {/* Header */}
      <div className="px-5 py-5 border-b" style={{ borderColor: T.borderLight }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: T.blue }}>
              {enrolment.enrolment_type === 'full_course' ? 'Full Course' : 'Monthly Plan'}
              {enrolment.enrolment_seq > 1 && (
                <span className="ml-2" style={{ color: T.amber }}>· Enrolment #{enrolment.enrolment_seq}</span>
              )}
            </span>
            <h2 className="font-extrabold text-lg mt-1" style={{ color: T.navy }}>
              {course?.name ?? 'AI Mastery Programme'}
            </h2>
            {course?.description && (
              <p className="text-sm mt-1 line-clamp-2" style={{ color: T.textSec }}>{course.description}</p>
            )}
          </div>
          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
            style={enrolment.is_active
              ? { background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }
              : { background: '#f1f5f9', color: T.textMuted, border: '1px solid #e2e8f0' }}>
            {enrolment.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Details grid */}
      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4"
        style={{ background: '#fafcff' }}>
        {batch ? (
          <>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: T.textMuted }}>Batch Timeslot</p>
              <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>{batch.label}</p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: T.textMuted }}>Class Time</p>
              <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                {batch.day_of_week} {fmtTime(batch.start_time)} IST
              </p>
            </div>
            {batch.start_date && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: T.textMuted }}>Batch Start</p>
                <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>{fmtDate(batch.start_date)}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: T.textMuted }}>Trainer</p>
              <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>{batch.instructor_name ?? 'Arijit Chowdhury'}</p>
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <p className="text-sm font-semibold" style={{ color: T.amber }}>⚠️ Batch not selected yet</p>
            <Link href={`/select-batch?course_id=${course?.id}&enrolment_id=${enrolment.id}`}
              className="text-xs underline mt-0.5 inline-block" style={{ color: T.amber }}>
              Choose your batch →
            </Link>
          </div>
        )}
        {totalSessions && (
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: T.textMuted }}>Total Sessions</p>
            <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>
              {totalSessions} sessions
              <span className="font-normal" style={{ color: T.textMuted }}> · {course?.session_duration_mins ?? 90} min</span>
            </p>
          </div>
        )}
        {sessions.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: T.textMuted }}>Progress</p>
            <p className="text-sm font-semibold">
              <span style={{ color: T.green }}>{upcomingCount} upcoming</span>
              {pastCount > 0 && <span style={{ color: T.textMuted }}> · {pastCount} done</span>}
            </p>
          </div>
        )}
      </div>

      {/* Subjects */}
      {course?.subjects && Array.isArray(course.subjects) && course.subjects.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-medium mb-2" style={{ color: T.textMuted }}>What You'll Learn</p>
          <div className="flex flex-wrap gap-1.5">
            {(course.subjects as string[]).map((s: string) => (
              <span key={s} className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                style={{ background: T.indigoBg, color: T.indigo, border: `1px solid ${T.indigoBorder}` }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="px-5 py-3 border-t flex items-center gap-4 flex-wrap"
        style={{ borderColor: T.borderLight, background: '#fafcff' }}>
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: T.blue }}>
          <Calendar size={12} />
          {open ? 'Hide Sessions' : `View Sessions${totalSessions ? ` (${totalSessions})` : ''}`}
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <Link href="/dashboard/library"
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: T.indigo }}>
          <BookOpen size={12} /> Study Materials
        </Link>
        {batch?.meeting_link && (
          <a href={batch.meeting_link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: T.green }}>
            <ExternalLink size={12} /> Join Class
          </a>
        )}
        {course?.slug && (
          <Link href={`/courses/${course.slug}`}
            className="flex items-center gap-1.5 text-xs transition-colors ml-auto"
            style={{ color: T.textMuted }}>
            Course Page <ExternalLink size={12} />
          </Link>
        )}
      </div>

      {open && (
        <SessionsPanel sessions={sessions} totalSessions={totalSessions} batchMeetingLink={batch?.meeting_link ?? null} />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CoursesClient({ enrolments, legacyUser }: {
  enrolments: Enrolment[]
  legacyUser: { course_name: string; batch_day_time: string | null; start_date: string | null } | null
}) {
  const hasEnrolments = enrolments.length > 0 || legacyUser?.course_name

  return (
    <div className="space-y-5 pb-12 max-w-4xl">
      <div>
        <h1 className="text-xl font-extrabold" style={{ color: T.navy }}>My Courses</h1>
        <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>Your enrolled AI certification programmes</p>
      </div>

      {hasEnrolments ? (
        <div className="space-y-4">
          {enrolments.map(e => <CourseCard key={e.id} enrolment={e} />)}

          {/* Legacy fallback */}
          {!enrolments.length && legacyUser?.course_name && (
            <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${T.border}` }}>
              <div className="px-5 py-5">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: T.blue }}>Full Course</span>
                <h2 className="font-extrabold text-lg mt-1" style={{ color: T.navy }}>{legacyUser.course_name}</h2>
                <div className="flex flex-wrap gap-6 mt-3">
                  {legacyUser.batch_day_time && (
                    <div>
                      <p className="text-xs" style={{ color: T.textMuted }}>Batch</p>
                      <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>{legacyUser.batch_day_time}</p>
                    </div>
                  )}
                  {legacyUser.start_date && (
                    <div>
                      <p className="text-xs" style={{ color: T.textMuted }}>Start Date</p>
                      <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>{fmtDate(legacyUser.start_date)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white py-20 text-center" style={{ border: `1px solid ${T.border}` }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
            <BookOpen size={26} style={{ color: T.bluePale }} />
          </div>
          <p className="font-semibold" style={{ color: T.textSec }}>No courses enrolled yet</p>
          <p className="text-sm mt-2 mb-6" style={{ color: T.textMuted }}>Enrol in an AI course to get started</p>
          <Link href="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: T.blue }}>
            Browse Courses →
          </Link>
        </div>
      )}
    </div>
  )
}
