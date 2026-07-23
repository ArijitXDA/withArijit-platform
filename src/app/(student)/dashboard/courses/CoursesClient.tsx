'use client'
import { useState } from 'react'
import { todayISO } from '@/lib/sessionSchedule'
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
  session_number: number         // 1-based index, computed from batch schedule
  session_id?: number            // legacy field from session_master_table (not used in computed schedule)
  session_title: string | null   // null until admin sets it
  session_date: string           // YYYY-MM-DD, computed weekly from batch.start_date
  session_start_time: string
  duration_mins: number
  session_link: string | null    // recording link — null until admin pastes it
  study_material_link: string | null
  meeting_link: string | null    // live join link — null until admin pastes it
  join_url?: string | null       // tracked join URL (/api/session/join?t=…) — server-minted
  batch_id?: string              // for the enrolment-gated recording endpoint
  has_recording?: boolean        // a recording exists (the URL is never sent to the client)
  has_study_material?: boolean   // an LLM study guide exists → in-app study page
  status?: 'scheduled' | 'rescheduled' | 'skipped'
  original_date?: string         // computed date before a reschedule
  change_reason?: string | null
}
interface Course {
  id: string; name: string; short_name: string | null; description: string | null
  total_sessions: number | null; session_duration_mins: number | null
  slug: string | null; subjects: string[] | null
}
interface Batch {
  label: string; day_of_week: string; start_time: string
  start_date: string | null; meeting_link: string | null; instructor_name: string | null
  end_date?: string | null; duration_mins?: number | null
  variant?: string | null; total_sessions?: number | null
}
interface Enrolment {
  id: string; created_at: string; enrolment_type: string
  amount_paid: string; is_active: boolean; payment_date: string | null
  enrolment_seq: number; course: Course | null; batch: Batch | null
  access_end_date?: string | null; enrolment_status?: string | null
  student_email?: string | null; student_name?: string | null; student_mobile?: string | null
  sessions: Session[]
  scheduleToken?: string | null   // consultation: slot-picker token while batch not yet chosen
}

// ── Sessions panel — shows ALL sessions: past (unlocked) + future (locked) ────
function SessionsPanel({ sessions, totalSessions, batchMeetingLink }: {
  sessions: Session[]; totalSessions: number | null; batchMeetingLink: string | null
}) {
  const [showAll, setShowAll] = useState(false)
  // In-page recording player — fetches a short-lived, enrolment-gated URL so the
  // real SharePoint URL never reaches the browser.
  const [playN, setPlayN]           = useState<number | null>(null)
  const [playTitle, setPlayTitle]   = useState('')
  const [vidUrl, setVidUrl]         = useState<string | null>(null)
  const [vidLoading, setVidLoading] = useState(false)
  const [vidErr, setVidErr]         = useState('')

  async function watch(s: Session) {
    setPlayN(s.session_number); setPlayTitle(s.session_title ?? `Session ${s.session_number}`)
    setVidUrl(null); setVidErr(''); setVidLoading(true)
    try {
      const res  = await fetch(`/api/student/recording/${s.batch_id}/${s.session_number}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not load the recording')
      setVidUrl(data.url)
    } catch (e: any) { setVidErr(e.message) }
    finally { setVidLoading(false) }
  }
  function closePlayer() { setPlayN(null); setVidUrl(null); setVidErr('') }

  const today   = todayISO()   // IST business day — UTC's day is yesterday until 05:30 IST
  // A session is "available" once its recording or study guide exists. Today's
  // class becomes watchable the moment materials are attached — students should
  // not have to wait for the date to roll over. A today-session with nothing
  // attached yet stays in Upcoming (joinable).
  const isAvail = (s: Session) => !!(s.has_recording || s.has_study_material || s.study_material_link)
  const past    = sessions.filter(s => s.session_date < today || (s.session_date === today && isAvail(s)))
  const future  = sessions.filter(s => s.session_date > today || (s.session_date === today && !isAvail(s)))
  const doneCount = past.length
  const total26   = totalSessions ?? 26

  if (sessions.length === 0) {
    return (
      <div className="px-5 py-8 text-center border-t" style={{ borderColor: T.borderLight }}>
        <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
          style={{ background: T.blueLight }}>
          <Calendar size={16} style={{ color: T.bluePale }} />
        </div>
        <p className="text-sm" style={{ color: T.textSec }}>Sessions will appear here once scheduled</p>
        <p className="text-xs mt-1" style={{ color: T.textMuted }}>{total26} live sessions · weekend schedule</p>
      </div>
    )
  }

  // Past: always list every past session — this is where students review recordings +
  // study guides, so none should be hidden. Future: cap to the next 3 (the rest are locked,
  // and a rolling membership would otherwise render dozens of greyed-out future rows); the
  // toggle expands upcoming only.
  const visiblePast   = past
  const visibleFuture = showAll ? future : future.slice(0, 3)
  const firstJoinIdx  = visibleFuture.findIndex(s => s.status !== 'skipped')  // first joinable (skips cancelled)
  const hiddenFuture  = future.length - visibleFuture.length

  return (
    <div className="border-t" style={{ borderColor: T.borderLight }}>

      {/* Progress bar — always visible */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold" style={{ color: T.textSec }}>Course Progress</p>
          <p className="text-xs font-bold" style={{ color: T.navy }}>
            {doneCount} of {total26} sessions done
          </p>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.bluePale }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.round((doneCount / total26) * 100))}%`,
              background: `linear-gradient(90deg, ${T.blue}, ${T.indigo})`,
            }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <p className="text-xs" style={{ color: T.textMuted }}>
            {doneCount > 0 ? `${doneCount} completed` : 'Not started yet'}
          </p>
          <p className="text-xs" style={{ color: T.textMuted }}>
            {future.length} upcoming
          </p>
        </div>
      </div>

      {/* Past sessions — all unlocked with recording */}
      {past.length > 0 && (
        <div className="border-t" style={{ borderColor: T.borderLight }}>
          <p className="px-5 pt-3 pb-2 text-xs font-bold uppercase tracking-wide"
            style={{ color: T.purple }}>🎬 Past Sessions ({past.length})</p>
          <div className="divide-y" style={{ borderColor: T.borderLight }}>
            {visiblePast.map((s, idx) => {
              const sessionNum = past.indexOf(s) + 1
              return (
                <div key={s.session_number ?? sessionNum}
                  className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-purple-50/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Session number badge */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: T.purpleBg, border: `1px solid ${T.purpleBorder}`, color: T.purple }}>
                      {sessionNum}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: T.textSec }}>
                        {s.session_title ?? `Session ${sessionNum}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                        {fmtDate(s.session_date)}
                        {s.session_start_time ? ` · ${fmtTime(s.session_start_time)} IST` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(s.has_study_material || s.study_material_link) && (
                      <a href={s.has_study_material
                            ? `/dashboard/courses/study/${s.batch_id}/${s.session_number}`
                            : s.study_material_link!}
                        target={s.has_study_material ? '_self' : '_blank'} rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 rounded-lg font-medium"
                        style={{ background: T.indigoBg, color: T.indigo, border: `1px solid ${T.indigoBorder}` }}>
                        📄 Study Notes
                      </a>
                    )}
                    {s.has_recording ? (
                      <button onClick={() => watch(s)}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium"
                        style={{ background: T.purpleBg, color: T.purple, border: `1px solid ${T.purpleBorder}` }}>
                        ▶ Watch
                      </button>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                        style={{ background: '#f1f5f9', color: T.textMuted }}>
                        <Clock size={10} /> Processing
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming sessions — next one joinable, rest locked */}
      {future.length > 0 && (
        <div className="border-t" style={{ borderColor: T.borderLight }}>
          <p className="px-5 pt-3 pb-2 text-xs font-bold uppercase tracking-wide"
            style={{ color: T.green }}>📅 Upcoming Sessions</p>
          <div className="divide-y" style={{ borderColor: T.borderLight }}>
            {visibleFuture.map((s, i) => {
              const sessionNum  = past.length + future.indexOf(s) + 1
              const skipped     = s.status === 'skipped'
              const rescheduled = s.status === 'rescheduled'
              const isNext      = i === firstJoinIdx  // first joinable upcoming (skips cancelled)
              const isToday     = s.session_date === today && !skipped
              return (
                <div key={s.session_number ?? sessionNum}
                  className="px-5 py-3 flex items-center justify-between gap-4 transition-colors"
                  style={{ background: isNext ? '#f0fdf4' : undefined }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                      style={isNext
                        ? { background: T.greenBg, border: `1px solid ${T.greenBorder}`, color: T.green }
                        : { background: '#f1f5f9', border: '1px solid #e2e8f0', color: T.textMuted }
                      }>
                      {isNext ? <Video size={13} /> : <Lock size={12} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate"
                          style={{ color: isNext ? T.textPrimary : T.textMuted }}>
                          {s.session_title ?? `Session ${sessionNum}`}
                        </p>
                        {isToday && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse"
                            style={{ background: T.greenBg, color: T.green }}>TODAY</span>
                        )}
                        {rescheduled && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#fef3c7', color: '#b45309' }}>Rescheduled</span>
                        )}
                        {skipped && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#fee2e2', color: '#b91c1c' }}>Cancelled</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                        Session {sessionNum} of {total26} · {skipped
                          ? <span style={{ textDecoration: 'line-through' }}>{fmtDate(s.original_date ?? s.session_date)}</span>
                          : fmtDate(s.session_date)}
                        {!skipped && s.session_start_time ? ` · ${fmtTime(s.session_start_time)} IST` : ''}
                        {rescheduled && s.original_date && <span style={{ color: '#b45309' }}> · moved from {fmtDate(s.original_date)}</span>}
                        {skipped && <span style={{ color: '#b91c1c' }}> · no class this week</span>}
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
                    {skipped ? (
                      <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                        Cancelled
                      </span>
                    ) : isNext && (s.meeting_link || batchMeetingLink) ? (
                      <a href={s.join_url ?? batchMeetingLink ?? '#'} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold text-white"
                        style={{ background: T.green }}>
                        {isToday ? 'Join Now →' : 'Join →'}
                      </a>
                    ) : !isNext ? (
                      <span className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                        style={{ background: '#f1f5f9', color: T.textMuted }}>
                        <Lock size={10} /> Scheduled
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming expander — past sessions are always fully listed above */}
      {hiddenFuture > 0 && (
        <div className="px-5 py-3 border-t" style={{ borderColor: T.borderLight }}>
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full text-xs font-semibold py-2 rounded-xl transition-colors"
            style={{ color: T.blue, background: T.blueLight, border: `1px solid ${T.bluePale}` }}
          >
            {showAll
              ? '↑ Show fewer upcoming sessions'
              : `↓ Show all ${future.length} upcoming sessions (${hiddenFuture} more)`}
          </button>
        </div>
      )}

      {/* In-page recording player — gated URL, download + right-click disabled */}
      {playN !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,31,61,0.75)' }} onClick={closePlayer}>
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden bg-white"
            onClick={e => e.stopPropagation()} style={{ border: `1px solid ${T.border}` }}>
            <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: T.borderLight }}>
              <p className="text-sm font-bold truncate" style={{ color: T.textPrimary }}>{playTitle}</p>
              <button onClick={closePlayer} className="text-base font-bold px-2 leading-none" style={{ color: T.textMuted }}>✕</button>
            </div>
            <div className="bg-black flex items-center justify-center" style={{ minHeight: 260 }}>
              {vidLoading && <p className="text-white text-sm py-20">Loading recording…</p>}
              {vidErr && <p className="text-white text-sm py-20 px-6 text-center">{vidErr}</p>}
              {vidUrl && (
                <video src={vidUrl} controls autoPlay
                  controlsList="nodownload noplaybackrate" disablePictureInPicture
                  onContextMenu={e => e.preventDefault()}
                  className="w-full" style={{ maxHeight: '70vh' }} />
              )}
            </div>
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
  const isConsultation = course?.slug === 'expert-consultation'
  // Count + duration come from the student's actual BATCH (9×120min for a 9-week
  // cohort, 26×60 for long, weekly for a rolling subscription) — the course
  // record always says 26, so reading it showed "26 sessions" for every variant.
  const totalSessions  = batch?.total_sessions ?? course?.total_sessions ?? null
  const sessionDuration = batch?.duration_mins ?? course?.session_duration_mins ?? 60
  const today          = todayISO()
  const isAvail        = (s: Session) => !!(s.has_recording || s.has_study_material || s.study_material_link)
  const pastCount      = sessions.filter(s => s.session_date < today || (s.session_date === today && isAvail(s))).length
  const upcomingCount  = sessions.filter(s => s.session_date > today || (s.session_date === today && !isAvail(s))).length

  // Monthly membership (rolling cohort): status is derived from the 30-day access
  // window. Active while access_end_date >= today; otherwise paused → renew.
  const isMembership     = batch?.variant === 'rolling'
  const accessEnd        = enrolment.access_end_date ?? null
  const membershipActive = isMembership && !!accessEnd && accessEnd >= today
  const fmtShortDate = (d: string | null) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  // Detect if there's a session happening today (for the pulsing CTA)
  const hasClassToday  = sessions.some(s => s.session_date === today && s.status !== 'skipped')
  const meetingLink    = batch?.meeting_link ?? null
  // Route the live-class CTA through the next session's tracked join URL so every
  // click is attributable (who/when); falls back to the raw batch link. Skip
  // cancelled sessions so the CTA never points at a class that isn't happening.
  const nextSession    = sessions.find(s => s.session_date >= today && s.status !== 'skipped')
  const joinHref       = nextSession?.join_url ?? meetingLink

  // Renew a lapsed monthly membership → straight to pre-filled checkout on the
  // course page (?enrol=1 auto-opens the payment modal), not the marketing page.
  const courseSlug   = course?.slug || 'quantum-ai-continued'
  const manageHref   = `/courses/${courseSlug}`
  const renewParams  = new URLSearchParams({ enrol: '1' })
  if (enrolment.student_email)  renewParams.set('email',  enrolment.student_email)
  if (enrolment.student_name)   renewParams.set('name',   enrolment.student_name)
  if (enrolment.student_mobile) renewParams.set('mobile', enrolment.student_mobile)
  const renewHref    = `/courses/${courseSlug}?${renewParams.toString()}`

  return (
    <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${T.border}` }}>

      {/* Header */}
      <div className="px-5 py-5 border-b" style={{ borderColor: T.borderLight }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: T.blue }}>
              {isMembership ? 'Monthly Membership' : enrolment.enrolment_type === 'full_course' ? 'Full Course' : 'Monthly Plan'}
              {enrolment.enrolment_seq > 1 && (
                <span className="ml-2" style={{ color: T.amber }}>
                  · {isMembership ? `Month ${enrolment.enrolment_seq}` : `Enrolment #${enrolment.enrolment_seq}`}
                </span>
              )}
            </span>
            <h2 className="font-extrabold text-lg mt-1" style={{ color: T.navy }}>
              {course?.name ?? 'AI Mastery Programme'}
            </h2>
            {course?.description && (
              <p className="text-sm mt-1 line-clamp-2" style={{ color: T.textSec }}>{course.description}</p>
            )}
          </div>
          {isMembership ? (
            <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
              style={membershipActive
                ? { background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }
                : { background: '#fff7ed', color: T.amber, border: '1px solid #fed7aa' }}>
              {membershipActive ? `Active till ${fmtShortDate(accessEnd)}` : 'Paused'}
            </span>
          ) : (
            <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
              style={enrolment.is_active
                ? { background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }
                : { background: '#f1f5f9', color: T.textMuted, border: '1px solid #e2e8f0' }}>
              {enrolment.is_active ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>
      </div>

      {/* Membership renew/manage bar */}
      {isMembership && (
        <div className="px-5 py-2.5 flex items-center justify-between gap-3 border-b text-xs"
          style={{ borderColor: T.borderLight, background: membershipActive ? '#f0fdf4' : '#fff7ed' }}>
          <span style={{ color: membershipActive ? T.green : T.amber }}>
            {membershipActive
              ? `Membership active — renews monthly. Active through ${fmtShortDate(accessEnd)}.`
              : 'Membership paused. Renew to resume the weekly live sessions & recordings.'}
          </span>
          <a href={membershipActive ? manageHref : renewHref} className="font-bold shrink-0" style={{ color: T.blue }}>
            {membershipActive ? 'Manage →' : 'Renew →'}
          </a>
        </div>
      )}

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
        ) : isConsultation && enrolment.scheduleToken ? (
          <div className="col-span-2">
            <p className="text-sm font-semibold" style={{ color: T.amber }}>⏳ Session time not picked yet</p>
            <Link href={`/consultation/schedule/${enrolment.scheduleToken}`}
              className="text-xs underline mt-0.5 inline-block" style={{ color: T.amber }}>
              Pick your session time →
            </Link>
          </div>
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
            <p className="text-xs font-medium mb-1" style={{ color: T.textMuted }}>
              {isMembership ? 'Cadence' : 'Total Sessions'}
            </p>
            <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>
              {isMembership ? (
                <>Weekly<span className="font-normal" style={{ color: T.textMuted }}> · {sessionDuration} min · ongoing</span></>
              ) : (
                <>{totalSessions} sessions<span className="font-normal" style={{ color: T.textMuted }}> · {sessionDuration} min</span></>
              )}
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

      {/* Extend — add more sessions to a live consultation engagement */}
      {isConsultation && batch && enrolment.scheduleToken && (
        <div className="px-5 pb-4">
          <a
            href={`/consultation/extend/${enrolment.scheduleToken}`}
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors hover:opacity-90"
            style={{ color: T.indigo, borderColor: T.indigoBorder, background: T.indigoBg }}
          >
            + Add more sessions to this engagement
          </a>
        </div>
      )}

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

      {/* ── Join Class CTA — prominent button ───────────────────────────── */}
      {meetingLink && (
        <div className="px-5 pb-4">
          <a
            href={joinHref ?? meetingLink ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all ${
              hasClassToday ? 'shadow-lg hover:shadow-xl hover:-translate-y-0.5' : 'hover:opacity-90'
            }`}
            style={{
              background: hasClassToday
                ? `linear-gradient(135deg, #16a34a, #15803d)`
                : `linear-gradient(135deg, #2563eb, #1d4ed8)`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {hasClassToday && (
              <span
                className="absolute inset-0 rounded-xl animate-ping opacity-20"
                style={{ background: '#16a34a' }}
                aria-hidden="true"
              />
            )}
            <Video size={16} />
            {hasClassToday ? '🎉 Class is Today — Join Now!' : '🎥 Join Class'}
          </a>
          {hasClassToday && (
            <p className="text-center text-xs mt-1.5" style={{ color: T.green }}>
              Your session is scheduled for today. Click above to join.
            </p>
          )}
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

// ── Interfaces ────────────────────────────────────────────────────────────────
interface UnenrolledCourse {
  id: string; name: string; short_name: string | null; description: string | null
  mrp: number; slug: string | null; student_registration_url: string | null
  is_featured: boolean; subjects: string[] | null; target_audience: string | null
}

// ── Enrol modal ───────────────────────────────────────────────────────────────
// BUG FIX: removed fake 0.84 discount multiplier — show real MRP only.
// CTA changed from "Register for Free Webinar" to "Attend a Free Webinar First"
// to clarify that webinar → enrolment is the correct flow.
function EnrolModal({ course, onClose }: { course: UnenrolledCourse; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden bg-white shadow-2xl"
        style={{ border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: T.borderLight }}>
          <button onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-lg hover:bg-gray-100"
            style={{ color: T.textMuted }}>×</button>
          {course.is_featured && (
            <span className="inline-flex text-xs font-bold px-2 py-0.5 rounded-full mb-2"
              style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}>⭐ Featured</span>
          )}
          <h2 className="font-extrabold text-lg leading-snug pr-8" style={{ color: T.navy }}>{course.name}</h2>
          {course.target_audience && (
            <p className="text-xs mt-1" style={{ color: T.textSec }}>For: {course.target_audience}</p>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {course.description && (
            <p className="text-sm" style={{ color: T.textSec }}>{course.description}</p>
          )}

          {/* Real price — no fake discount */}
          <div className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
            <div>
              <p className="text-xs font-medium" style={{ color: T.blue }}>Course Fee</p>
              <p className="text-2xl font-black mt-0.5" style={{ color: T.navy }}>
                ₹{Math.round(Number(course.mrp)).toLocaleString('en-IN')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>Inclusive of GST · EMI available</p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})` }}>
              <span className="text-white text-xl">🎓</span>
            </div>
          </div>

          {/* Subjects */}
          {course.subjects && Array.isArray(course.subjects) && course.subjects.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: T.textMuted }}>
                You'll Learn
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(course.subjects as string[]).slice(0, 6).map((s: string) => (
                  <span key={s} className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                    style={{ background: T.indigoBg, color: T.indigo, border: `1px solid ${T.indigoBorder}` }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* How-to-enrol explanation */}
          <div className="rounded-xl p-3" style={{ background: '#f8faff', border: `1px solid ${T.borderLight}` }}>
            <p className="text-xs font-semibold mb-1" style={{ color: T.navy }}>How to Enrol</p>
            <p className="text-xs leading-relaxed" style={{ color: T.textSec }}>
              Attend the free webinar to experience this programme first-hand,
              then complete your enrolment and payment through our team.
            </p>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          {course.student_registration_url ? (
            <a href={course.student_registration_url} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})` }}>
              Attend a Free Webinar First →
            </a>
          ) : (
            <p className="text-center text-sm py-2" style={{ color: T.textMuted }}>Enrolment opening soon.</p>
          )}
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            style={{ color: T.textSec, border: `1px solid ${T.border}` }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cross-sell section ─────────────────────────────────────────────────────
// BUG FIX: removed fake discounted price from cards. Show real MRP only.
function CrossSellSection({ courses }: { courses: UnenrolledCourse[] }) {
  const [selected, setSelected] = useState<UnenrolledCourse | null>(null)
  if (!courses.length) return null
  return (
    <>
      <div className="pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ background: T.border }} />
          <h2 className="text-sm font-bold uppercase tracking-wide px-2 whitespace-nowrap" style={{ color: T.textMuted }}>
            🚀 Explore More Programmes
          </h2>
          <div className="h-px flex-1" style={{ background: T.border }} />
        </div>
        <p className="text-xs mb-4" style={{ color: T.textMuted }}>
          Expand your AI skills with another certification programme.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map(c => (
            <div key={c.id}
              className="rounded-2xl overflow-hidden bg-white flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
              style={{ border: `1px solid ${T.border}` }}>
              <div className="h-1" style={{ background: c.is_featured
                ? `linear-gradient(90deg, ${T.amber}, #f59e0b)`
                : `linear-gradient(90deg, ${T.blue}, ${T.indigo})` }} />
              <div className="p-4 flex-1 flex flex-col">
                {c.is_featured && (
                  <span className="inline-flex text-xs font-bold px-2 py-0.5 rounded-full mb-2 self-start"
                    style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}>
                    ⭐ Featured
                  </span>
                )}
                <h3 className="font-bold text-sm leading-snug flex-1" style={{ color: T.navy }}>
                  {c.short_name ?? c.name}
                </h3>
                {c.target_audience && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: T.textSec }}>{c.target_audience}</p>
                )}
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium" style={{ color: T.textMuted }}>Course Fee</p>
                    <p className="text-base font-black" style={{ color: T.navy }}>
                      ₹{Math.round(Number(c.mrp)).toLocaleString('en-IN')}
                    </p>
                  </div>
                  {c.slug ? (
                    <a
                      href={`/courses/${c.slug}`}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity"
                      style={{ background: c.is_featured ? T.amber : T.blue }}>
                      Know More
                    </a>
                  ) : (
                    <button onClick={() => setSelected(c)}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity"
                      style={{ background: c.is_featured ? T.amber : T.blue }}>
                      Know More
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && <EnrolModal course={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

export default function CoursesClient({ enrolments, legacyUser, unenrolledCourses = [] }: {
  enrolments: Enrolment[]
  legacyUser: { course_name: string; batch_day_time: string | null; start_date: string | null } | null
  unenrolledCourses?: UnenrolledCourse[]
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

      {/* Cross-sell: courses the student hasn't enrolled in yet */}
      <CrossSellSection courses={unenrolledCourses} />
    </div>
  )
}
