import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, BookOpen, Award, Clock, ChevronRight, Video, Users } from 'lucide-react'

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>
}) {
  const { welcome } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // ── Profile summary ──────────────────────────────────────────────────────
  const { data: profile } = await service
    .from('student_profiles')
    .select('full_name, mobile, occupation, profile_photo_url, key_skills')
    .eq('email', email)
    .maybeSingle()

  // ── Fetch ALL active enrolments ───────────────────────────────────────────
  const { data: enrolments } = await service
    .from('student_enrolments')
    .select('*, course:course_id(name, short_name, total_sessions), batch:batch_id(label, day_of_week, start_time, meeting_link)')
    .eq('student_email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Primary enrolment for hero display (most recent)
  const enrolment     = enrolments?.[0] ?? null
  const totalCourses  = enrolments?.length ?? 0

  // ── Fallback to legacy users table ───────────────────────────────────────
  const { data: legacyUser } = await service
    .from('users')
    .select('name, course_name, batch_day_time, batch_id')
    .eq('email', email)
    .maybeSingle()

  const studentName = enrolment?.student_name ?? legacyUser?.name ?? user.email?.split('@')[0] ?? 'Student'
  const firstName   = studentName.split(' ')[0]

  // For hero: show first enrolment details
  const courseName  = (enrolment?.course as any)?.name ?? legacyUser?.course_name ?? 'AI Mastery Programme'
  const batchLabel  = (enrolment?.batch as any)?.label ?? legacyUser?.batch_day_time ?? null
  const batchTime   = (enrolment?.batch as any)?.start_time ?? null
  const meetingLink = (enrolment?.batch as any)?.meeting_link ?? null
  const legacyBatchId = legacyUser?.batch_id ?? null

  // ── Check for enrolments missing batch selection ─────────────────────────
  const pendingBatch = enrolments?.filter((e: any) => !e.batch_id) ?? []

  // ── Upcoming sessions ─────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  let upcomingSessions: any[] = []

  if (legacyBatchId) {
    const { data: sessions } = await service
      .from('session_master_table')
      .select('session_id, session_title, session_date, session_start_time, session_link')
      .eq('batch_id', legacyBatchId)
      .gte('session_date', today)
      .order('session_date')
      .limit(3)
    upcomingSessions = sessions ?? []
  }

  // ── Certificates ──────────────────────────────────────────────────────────
  const { data: certs, count: certCount } = await service
    .from('certificates')
    .select('id, certificate_name, date_of_issuing, certificate_image_link', { count: 'exact' })
    .eq('user_email', email)
    .eq('is_active', true)
    .order('date_of_issuing', { ascending: false })
    .limit(2)

  // ── Past sessions count ───────────────────────────────────────────────────
  const { count: pastCount } = legacyBatchId
    ? await service
        .from('session_master_table')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', legacyBatchId)
        .lt('session_date', today)
    : { count: 0 }

  return (
    <div className="space-y-6 pb-12">

      {/* Pending batch selection alert */}
      {pendingBatch.length > 0 && (
        <div className="rounded-2xl border px-5 py-4 flex items-center justify-between gap-4"
          style={{ background: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.25)' }}>
          <div>
            <p className="text-amber-400 font-semibold text-sm">
              📅 {pendingBatch.length} enrolment{pendingBatch.length > 1 ? 's' : ''} need{pendingBatch.length === 1 ? 's' : ''} a batch/timeslot
            </p>
            <p className="text-amber-400/60 text-xs mt-0.5">
              {pendingBatch.map((e: any) => (e.course as any)?.name ?? e.course_name).join(' · ')}
            </p>
          </div>
          <Link href={`/select-batch?course_id=${pendingBatch[0].course_id}&enrolment_id=${pendingBatch[0].id}`}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: '#d97706' }}>
            Choose Batch →
          </Link>
        </div>
      )}

      {/* Welcome banner */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)' }}>
        {welcome === '1' && (
          <div className="absolute top-4 right-4 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1 text-xs text-green-400 font-semibold">
            🎉 Enrolment Confirmed!
          </div>
        )}
        <div className="px-6 py-7 flex items-center gap-5">
          {/* Student's own avatar — NOT Arijit's photo */}
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 border-indigo-400/40"
            style={{ background: 'rgba(99,102,241,0.25)' }}>
            {profile?.profile_photo_url
              ? <img src={profile.profile_photo_url} alt={studentName} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-indigo-300">
                  {studentName[0]?.toUpperCase() ?? 'S'}
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-extrabold text-xl">
              Welcome back, {firstName}! 👋
            </h1>
            {/* Show all active courses */}
            {totalCourses > 1 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {enrolments!.map((e: any) => (
                  <span key={e.id} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.3)', color: '#c7d2fe' }}>
                    {(e.course as any)?.short_name ?? (e.course as any)?.name ?? e.course_name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-indigo-300 text-sm mt-1">{courseName}</p>
            )}
            {batchLabel && totalCourses === 1 && (
              <p className="text-indigo-400/70 text-xs mt-0.5">
                📅 {batchLabel}{batchTime ? ` · ${fmtTime(batchTime)} IST` : ''}
              </p>
            )}
          </div>
          {meetingLink && (
            <a href={meetingLink} target="_blank" rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'rgba(99,102,241,0.4)', border: '1px solid rgba(99,102,241,0.5)' }}>
              <Video size={14} /> Join Class
            </a>
          )}
        </div>
      </div>

      {/* All enrolments summary — shown when more than 1 */}
      {totalCourses > 1 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {enrolments!.map((e: any) => {
            const b = e.batch as any
            return (
              <div key={e.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {(e.course as any)?.name ?? e.course_name}
                  </p>
                  {b?.label ? (
                    <p className="text-slate-500 text-xs mt-0.5">
                      📅 {b.label} · {fmtTime(b.start_time)} IST
                    </p>
                  ) : (
                    <p className="text-amber-400 text-xs mt-0.5">⚠️ Batch not selected</p>
                  )}
                </div>
                {b?.meeting_link ? (
                  <a href={b.meeting_link} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                    style={{ background: 'rgba(99,102,241,0.3)' }}>
                    Join →
                  </a>
                ) : !e.batch_id ? (
                  <Link href={`/select-batch?course_id=${e.course_id}&enrolment_id=${e.id}`}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ background: 'rgba(217,119,6,0.2)', color: '#fbbf24' }}>
                    Pick Batch
                  </Link>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* Profile summary strip */}
      <div className="rounded-2xl border px-5 py-4 flex items-center gap-4 flex-wrap"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Avatar */}
        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border-2 border-white/10"
          style={{ background: 'rgba(99,102,241,0.15)' }}>
          {profile?.profile_photo_url
            ? <img src={profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-xl font-black text-indigo-400">
                {studentName[0]?.toUpperCase() ?? 'S'}
              </div>
          }
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{profile?.full_name ?? studentName}</p>
          <p className="text-slate-500 text-xs">{email}</p>
          {profile?.occupation && (
            <p className="text-slate-500 text-xs mt-0.5">{profile.occupation}</p>
          )}
        </div>
        {/* Skills */}
        {profile?.key_skills && profile.key_skills.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1">
            {profile.key_skills.slice(0, 3).map((s: string) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                {s}
              </span>
            ))}
            {profile.key_skills.length > 3 && (
              <span className="text-xs text-slate-600">+{profile.key_skills.length - 3} more</span>
            )}
          </div>
        )}
        {/* Incomplete profile prompt */}
        {(!profile?.mobile || !profile?.occupation) && (
          <Link href="/dashboard/profile"
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
            ✏️ Complete Profile
          </Link>
        )}
        {profile?.mobile && profile?.occupation && (
          <Link href="/dashboard/profile"
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
            Edit Profile →
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Courses',     value: totalCourses || (legacyUser?.course_name ? 1 : 0), icon: BookOpen,  color: '#818cf8' },
          { label: 'Sessions Attended',  value: pastCount ?? 0,                                    icon: Calendar,  color: '#34d399' },
          { label: 'Upcoming Classes',   value: upcomingSessions.length,                            icon: Clock,     color: '#60a5fa' },
          { label: 'Certificates',       value: certCount ?? 0,                                    icon: Award,     color: '#fbbf24' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4 border"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-xs">{label}</p>
              <Icon size={14} style={{ color }} />
            </div>
            <p className="text-white font-black text-2xl" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">

        {/* Upcoming sessions */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-white font-bold flex items-center gap-2">
              <Calendar size={16} className="text-green-400" /> Upcoming Sessions
            </h2>
            <Link href="/dashboard/sessions" className="text-xs text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {upcomingSessions.length > 0 ? upcomingSessions.map(s => (
              <div key={s.session_id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{s.session_title ?? `Session — ${fmt(s.session_date)}`}</p>
                  <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                    <Clock size={10} /> {fmt(s.session_date)}{s.session_start_time ? ` · ${fmtTime(s.session_start_time)}` : ''}
                  </p>
                </div>
                {s.session_link && (
                  <a href={s.session_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                    Join <ChevronRight size={12} />
                  </a>
                )}
              </div>
            )) : (
              <div className="px-5 py-8 text-center">
                <Calendar size={28} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No upcoming sessions yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Certificates */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-white font-bold flex items-center gap-2">
              <Award size={16} className="text-yellow-400" /> Certificates
            </h2>
            <Link href="/dashboard/certificates" className="text-xs text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {(certs ?? []).length > 0 ? (certs ?? []).map((c: any) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(251,191,36,0.1)' }}>
                    <Award size={16} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{c.certificate_name}</p>
                    {c.date_of_issuing && (
                      <p className="text-gray-500 text-xs mt-0.5">{fmt(c.date_of_issuing)}</p>
                    )}
                  </div>
                </div>
                {c.certificate_image_link && (
                  <a href={c.certificate_image_link} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                    View →
                  </a>
                )}
              </div>
            )) : (
              <div className="px-5 py-8 text-center">
                <Award size={28} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No certificates yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-white font-bold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { href: '/dashboard/courses',        label: '📚 My Courses' },
            { href: '/dashboard/certificates',   label: '🏆 Certificates' },
            { href: '/dashboard/library',        label: '📖 Library' },
            { href: '/dashboard/payments',       label: '💳 Payments' },
            { href: '/dashboard/profile',        label: '👤 Profile' },
            { href: '/dashboard/become-partner', label: '🤝 Become Partner' },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
