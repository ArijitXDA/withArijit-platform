import { createClient } from '@/lib/supabase/server'
import { getStudentSessions } from '@/lib/studentSessions'
import { joinUrl } from '@/lib/joinToken'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Clock, CheckCircle2, ChevronLeft, Video } from 'lucide-react'

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

const T = {
  border:      '#dce6f5',
  borderLight: '#e8f0fc',
  blue:        '#2563eb',
  textPrimary: '#0f1f3d',
  textSec:     '#475569',
  textMuted:   '#94a3b8',
  green:       '#16a34a',
  greenBg:     '#f0fdf4',
  greenBorder: '#bbf7d0',
  purple:      '#7c3aed',
  purpleBg:    '#f5f3ff',
  purpleBorder:'#ddd6fe',
}

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const email = user.email!

  // Unified schedule — new schema (student_enrolments + awa_session_links) with
  // computed dates, falling back to legacy session_master_table.
  const sched = await getStudentSessions(email)
  const upcomingSessions = sched.upcoming
  const pastSessions     = sched.past.slice().reverse() // most recent attended first

  const totalAttended = pastSessions.length
  const totalUpcoming = upcomingSessions.length

  return (
    <div className="space-y-6 pb-12 max-w-3xl">

      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        style={{ color: T.blue }}>
        <ChevronLeft size={15} /> Back to Dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: T.textPrimary }}>My Sessions</h1>
        <p className="text-sm mt-1" style={{ color: T.textMuted }}>
          {totalAttended} attended · {totalUpcoming} upcoming
        </p>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border"
          style={{ background: T.greenBg, borderColor: T.greenBorder }}>
          <CheckCircle2 size={14} style={{ color: T.green }} />
          <span className="text-sm font-bold" style={{ color: T.green }}>{totalAttended} Sessions Attended</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border"
          style={{ background: T.purpleBg, borderColor: T.purpleBorder }}>
          <Clock size={14} style={{ color: T.purple }} />
          <span className="text-sm font-bold" style={{ color: T.purple }}>{totalUpcoming} Upcoming Classes</span>
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: T.border }}>
        <div className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderColor: T.borderLight }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: T.purpleBg, border: `1px solid ${T.purpleBorder}` }}>
            <Clock size={13} style={{ color: T.purple }} />
          </div>
          <h2 className="font-bold text-sm" style={{ color: T.textPrimary }}>Upcoming Classes</h2>
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: T.purpleBg, color: T.purple }}>{totalUpcoming}</span>
        </div>

        {upcomingSessions.length > 0 ? (
          <div className="divide-y" style={{ borderColor: T.borderLight }}>
            {upcomingSessions.map((s, idx) => (
              <div key={s.session_id}
                className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-purple-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black"
                    style={{ background: T.purpleBg, color: T.purple, border: `1px solid ${T.purpleBorder}` }}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    {s.course_name && (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1"
                        style={{ background: T.purpleBg, color: T.purple, border: `1px solid ${T.purpleBorder}` }}>
                        {s.course_name}
                      </span>
                    )}
                    <p className="text-sm font-semibold truncate" style={{ color: T.textPrimary }}>
                      {s.session_title ?? `Session ${s.session_number}`}
                      {s.status === 'rescheduled' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#fef3c7', color: '#b45309' }}>Rescheduled</span>}
                      {s.status === 'skipped' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#fee2e2', color: '#b91c1c' }}>Cancelled</span>}
                    </p>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: T.textMuted }}>
                      <Calendar size={10} />
                      Session {s.session_number} · {fmt(s.session_date)}
                      {s.status === 'skipped' ? ' · No class this week' : (s.session_start_time ? ` · ${fmtTime(s.session_start_time)} IST` : '')}
                    </p>
                  </div>
                </div>
                {s.session_link && s.status !== 'skipped' && (
                  <a href={joinUrl(email, s.batch_id, s.session_number)} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-all hover:opacity-90 hover:scale-105"
                    style={{ background: T.purple }}>
                    <Video size={12} /> Join Now
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium" style={{ color: T.textSec }}>No upcoming sessions scheduled yet</p>
            <p className="text-xs mt-1" style={{ color: T.textMuted }}>Sessions will appear here once your batch schedule is set</p>
          </div>
        )}
      </div>

      {/* Past / attended sessions */}
      <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: T.border }}>
        <div className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderColor: T.borderLight }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
            <CheckCircle2 size={13} style={{ color: T.green }} />
          </div>
          <h2 className="font-bold text-sm" style={{ color: T.textPrimary }}>Sessions Attended</h2>
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: T.greenBg, color: T.green }}>{totalAttended}</span>
        </div>

        {pastSessions.length > 0 ? (
          <div className="divide-y" style={{ borderColor: T.borderLight }}>
            {pastSessions.map((s, idx) => (
              <div key={s.session_id}
                className="px-5 py-3.5 flex items-center gap-3 hover:bg-green-50/20 transition-colors">
                <CheckCircle2 size={15} className="shrink-0" style={{ color: T.green }} />
                <div className="flex-1 min-w-0">
                  {s.course_name && (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1"
                      style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}>
                      {s.course_name}
                    </span>
                  )}
                  <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>
                    {s.session_title ?? `Session ${s.session_number}`}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                    Session {s.session_number} · {fmt(s.session_date)}
                    {s.session_start_time ? ` · ${fmtTime(s.session_start_time)} IST` : ''}
                  </p>
                </div>
                {s.recording_link && (
                  <a href={s.recording_link} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                    style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}>
                    <Video size={12} /> Recording
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium" style={{ color: T.textSec }}>No sessions attended yet</p>
            <p className="text-xs mt-1" style={{ color: T.textMuted }}>
              Your first session is coming up — check the Upcoming Classes section above
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
