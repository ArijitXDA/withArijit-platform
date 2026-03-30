import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, BookOpen, Award, Clock, ChevronRight, Video } from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:          '#eef3fb',
  surface:     '#ffffff',
  surfaceAlt:  '#f8faff',
  border:      '#dce6f5',
  borderLight: '#e8f0fc',
  navy:        '#0f1f3d',
  navyMid:     '#1a3a6b',
  blue:        '#2563eb',
  blueMid:     '#1d4ed8',
  blueLight:   '#eff6ff',
  bluePale:    '#dbeafe',
  textPrimary: '#0f1f3d',
  textSec:     '#475569',
  textMuted:   '#94a3b8',
  green:       '#16a34a',
  greenBg:     '#f0fdf4',
  greenBorder: '#bbf7d0',
  amber:       '#d97706',
  amberBg:     '#fffbeb',
  amberBorder: '#fde68a',
}

function card(extra = '') {
  return `rounded-2xl border ${extra}`
}

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

  // ── Track dashboard login (fire-and-forget) ──────────────────────────
  void fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ostaran.com'}/api/track/click`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      link_type:     'dashboard_login',
      student_email: email,
      source_app:    'ostaran',
    }),
  }).catch(() => {})

  const { data: profile } = await service
    .from('student_profiles')
    .select('full_name, mobile, occupation, profile_photo_url, key_skills')
    .eq('email', email)
    .maybeSingle()

  const { data: enrolments } = await service
    .from('student_enrolments')
    .select('*, course:course_id(name, short_name, total_sessions), batch:batch_id(label, day_of_week, start_time, meeting_link)')
    .eq('student_email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const enrolment    = enrolments?.[0] ?? null
  const totalCourses = enrolments?.length ?? 0

  const { data: legacyUser } = await service
    .from('users')
    .select('name, course_name, batch_day_time, batch_id')
    .eq('email', email)
    .maybeSingle()

  const studentName = enrolment?.student_name ?? legacyUser?.name ?? user.email?.split('@')[0] ?? 'Student'
  const firstName   = studentName.split(' ')[0]
  const courseName  = (enrolment?.course as any)?.name ?? legacyUser?.course_name ?? 'AI Mastery Programme'
  const batchLabel  = (enrolment?.batch as any)?.label ?? legacyUser?.batch_day_time ?? null
  const batchTime   = (enrolment?.batch as any)?.start_time ?? null
  const meetingLink = (enrolment?.batch as any)?.meeting_link ?? null
  const legacyBatchId = legacyUser?.batch_id ?? null

  const pendingBatch = enrolments?.filter((e: any) => !e.batch_id) ?? []

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

  const { data: certs, count: certCount } = await service
    .from('certificates')
    .select('id, certificate_name, date_of_issuing, certificate_image_link', { count: 'exact' })
    .eq('user_email', email)
    .eq('is_active', true)
    .order('date_of_issuing', { ascending: false })
    .limit(2)

  const { count: pastCount } = legacyBatchId
    ? await service
        .from('session_master_table')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', legacyBatchId)
        .lt('session_date', today)
    : { count: 0 }

  return (
    <div className="space-y-5 pb-12 max-w-5xl">

      {/* ── Pending batch alert ──────────────────────────────────────────── */}
      {pendingBatch.length > 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
          style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}` }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: T.amber }}>
              📅 {pendingBatch.length} enrolment{pendingBatch.length > 1 ? 's' : ''} need{pendingBatch.length === 1 ? 's' : ''} a batch/timeslot
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>
              {pendingBatch.map((e: any) => (e.course as any)?.name ?? e.course_name).join(' · ')}
            </p>
          </div>
          <Link href={`/select-batch?course_id=${pendingBatch[0].course_id}&enrolment_id=${pendingBatch[0].id}`}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: T.amber }}>
            Choose Batch →
          </Link>
        </div>
      )}

      {/* ── Welcome hero banner ──────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: `linear-gradient(135deg, ${T.navyMid} 0%, ${T.blueMid} 60%, #1e40af 100%)` }}>

        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {welcome === '1' && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: '#bbf7d0', color: '#15803d', border: '1px solid #86efac' }}>
            🎉 Enrolment Confirmed!
          </div>
        )}

        <div className="relative px-6 py-7 flex items-center gap-5">
          {/* Student avatar */}
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2"
            style={{ background: '#dbeafe', borderColor: 'rgba(255,255,255,0.4)' }}>
            {profile?.profile_photo_url
              ? <img src={profile.profile_photo_url} alt={studentName} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ color: T.navyMid }}>
                  {studentName[0]?.toUpperCase() ?? 'S'}
                </div>
            }
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-white font-extrabold text-xl">
              Welcome back, {firstName}! 👋
            </h1>
            {totalCourses > 1 ? (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {enrolments!.map((e: any) => (
                  <span key={e.id} className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(255,255,255,0.2)', color: '#e0f2fe', backdropFilter: 'blur(4px)' }}>
                    {(e.course as any)?.short_name ?? (e.course as any)?.name ?? e.course_name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm mt-1" style={{ color: '#bfdbfe' }}>{courseName}</p>
            )}
            {batchLabel && totalCourses === 1 && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(191,219,254,0.7)' }}>
                📅 {batchLabel}{batchTime ? ` · ${fmtTime(batchTime)} IST` : ''}
              </p>
            )}
          </div>

          {meetingLink && (
            <a href={meetingLink} target="_blank" rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}>
              <Video size={14} /> Join Class
            </a>
          )}
        </div>
      </div>

      {/* ── Multi-course cards ───────────────────────────────────────────── */}
      {totalCourses > 1 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {enrolments!.map((e: any) => {
            const b = e.batch as any
            return (
              <div key={e.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3 bg-white"
                style={{ borderColor: T.border }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: T.textPrimary }}>
                    {(e.course as any)?.name ?? e.course_name}
                  </p>
                  {b?.label ? (
                    <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                      📅 {b.label} · {fmtTime(b.start_time)} IST
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: T.amber }}>⚠️ Batch not selected</p>
                  )}
                </div>
                {b?.meeting_link ? (
                  <a href={b.meeting_link} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                    style={{ background: T.blue }}>
                    Join →
                  </a>
                ) : !e.batch_id ? (
                  <Link href={`/select-batch?course_id=${e.course_id}&enrolment_id=${e.id}`}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}>
                    Pick Batch
                  </Link>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Profile strip ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border px-5 py-4 flex items-center gap-4 flex-wrap bg-white"
        style={{ borderColor: T.border }}>
        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border-2"
          style={{ border: `2px solid ${T.bluePale}`, background: T.blueLight }}>
          {profile?.profile_photo_url
            ? <img src={profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-xl font-black" style={{ color: T.blue }}>
                {studentName[0]?.toUpperCase() ?? 'S'}
              </div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: T.textPrimary }}>{profile?.full_name ?? studentName}</p>
          <p className="text-xs" style={{ color: T.textMuted }}>{email}</p>
          {profile?.occupation && (
            <p className="text-xs mt-0.5" style={{ color: T.textSec }}>{profile.occupation}</p>
          )}
        </div>
        {profile?.key_skills && profile.key_skills.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1">
            {profile.key_skills.slice(0, 3).map((s: string) => (
              <span key={s} className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                style={{ background: T.blueLight, color: T.blue, border: `1px solid ${T.bluePale}` }}>
                {s}
              </span>
            ))}
            {profile.key_skills.length > 3 && (
              <span className="text-xs" style={{ color: T.textMuted }}>+{profile.key_skills.length - 3} more</span>
            )}
          </div>
        )}
        {(!profile?.mobile || !profile?.occupation) ? (
          <Link href="/dashboard/profile"
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}>
            ✏️ Complete Profile
          </Link>
        ) : (
          <Link href="/dashboard/profile"
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:bg-blue-50"
            style={{ color: T.blue }}>
            Edit Profile →
          </Link>
        )}
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Courses',     value: totalCourses || (legacyUser?.course_name ? 1 : 0), icon: BookOpen, accent: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'Sessions Attended',  value: pastCount ?? 0,                                    icon: Calendar, accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Upcoming Classes',   value: upcomingSessions.length,                            icon: Clock,    accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
          { label: 'Certificates',       value: certCount ?? 0,                                    icon: Award,    accent: '#b45309', bg: '#fffbeb', border: '#fde68a' },
        ].map(({ label, value, icon: Icon, accent, bg, border }) => (
          <div key={label} className="rounded-2xl p-5 border bg-white"
            style={{ borderColor: T.border }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <Icon size={16} style={{ color: accent }} />
              </div>
            </div>
            <p className="text-2xl font-black mb-0.5" style={{ color: T.textPrimary }}>{value}</p>
            <p className="text-xs font-medium" style={{ color: T.textMuted }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Sessions + Certificates ──────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Upcoming sessions */}
        <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: T.border }}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: T.borderLight }}>
            <h2 className="font-bold flex items-center gap-2 text-sm" style={{ color: T.textPrimary }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <Calendar size={13} style={{ color: '#16a34a' }} />
              </div>
              Upcoming Sessions
            </h2>
            <Link href="/dashboard/sessions" className="text-xs font-medium hover:underline"
              style={{ color: T.blue }}>
              View all →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: T.borderLight }}>
            {upcomingSessions.length > 0 ? upcomingSessions.map(s => (
              <div key={s.session_id} className="px-5 py-3.5 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                <div>
                  <p className="text-sm font-medium" style={{ color: T.textPrimary }}>
                    {s.session_title ?? `Session — ${fmt(s.session_date)}`}
                  </p>
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: T.textMuted }}>
                    <Clock size={10} /> {fmt(s.session_date)}{s.session_start_time ? ` · ${fmtTime(s.session_start_time)}` : ''}
                  </p>
                </div>
                {s.session_link && (
                  <a href={s.session_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: T.blue }}>
                    Join <ChevronRight size={12} />
                  </a>
                )}
              </div>
            )) : (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: T.blueLight }}>
                  <Calendar size={20} style={{ color: T.bluePale }} />
                </div>
                <p className="text-sm font-medium" style={{ color: T.textSec }}>No upcoming sessions yet</p>
                <p className="text-xs mt-1" style={{ color: T.textMuted }}>Sessions will appear here once scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Certificates */}
        <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: T.border }}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: T.borderLight }}>
            <h2 className="font-bold flex items-center gap-2 text-sm" style={{ color: T.textPrimary }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <Award size={13} style={{ color: '#b45309' }} />
              </div>
              Certificates
            </h2>
            <Link href="/dashboard/certificates" className="text-xs font-medium hover:underline"
              style={{ color: T.blue }}>
              View all →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: T.borderLight }}>
            {(certs ?? []).length > 0 ? (certs ?? []).map((c: any) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <Award size={16} style={{ color: '#b45309' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: T.textPrimary }}>{c.certificate_name}</p>
                    {c.date_of_issuing && (
                      <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{fmt(c.date_of_issuing)}</p>
                    )}
                  </div>
                </div>
                {c.certificate_image_link && (
                  <a href={c.certificate_image_link} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold hover:underline"
                    style={{ color: T.blue }}>
                    View →
                  </a>
                )}
              </div>
            )) : (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <Award size={20} style={{ color: '#fcd34d' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: T.textSec }}>No certificates yet</p>
                <p className="text-xs mt-1" style={{ color: T.textMuted }}>Complete your course to earn a certificate</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-bold mb-3 text-sm" style={{ color: T.textSec }}>Quick Actions</h2>
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
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-sm hover:-translate-y-px"
              style={{
                background: '#ffffff',
                color: T.textSec,
                border: `1px solid ${T.border}`,
              }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
