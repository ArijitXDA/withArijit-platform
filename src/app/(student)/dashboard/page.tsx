import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStudentSessions } from '@/lib/studentSessions'
import { joinUrl } from '@/lib/joinToken'
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
    .select('*, amount_paid, course:course_id(name, short_name, total_sessions), batch:batch_id(label, day_of_week, start_time, meeting_link)')
    .eq('student_email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const enrolment    = enrolments?.[0] ?? null
  const totalCourses = enrolments?.length ?? 0

  // Paying student = has at least one active enrolment with amount_paid > 0
  // OR has a legacy users row (pre-migration paying student)
  const hasPaidEnrolment = (enrolments ?? []).some((e: any) => Number(e.amount_paid ?? 0) > 0)

  const { data: legacyUser } = await service
    .from('users')
    .select('name, course_name, batch_day_time, batch_id')
    .eq('email', email)
    .maybeSingle()

  const studentName = enrolment?.student_name ?? legacyUser?.name ?? user.email?.split('@')[0] ?? 'Student'
  const firstName   = studentName.split(' ')[0]

  // Paying student flag (combines new + legacy paths)
  const isPayingStudent = hasPaidEnrolment || !!legacyUser?.course_name

  // courseName: only set for paying students. Non-payers see a dedicated hero.
  const courseName  = isPayingStudent
    ? ((enrolment?.course as any)?.name ?? legacyUser?.course_name ?? null)
    : null
  const batchLabel  = (enrolment?.batch as any)?.label ?? legacyUser?.batch_day_time ?? null
  const batchTime   = (enrolment?.batch as any)?.start_time ?? null
  const meetingLink = (enrolment?.batch as any)?.meeting_link ?? null
  const pendingBatch = enrolments?.filter((e: any) => !e.batch_id) ?? []

  // Unified session schedule (new schema + computed dates; legacy fallback)
  const { upcoming, past } = await getStudentSessions(email)
  const upcomingSessions = upcoming.slice(0, 3)

  const { data: certs, count: certCount } = await service
    .from('certificates')
    .select('id, certificate_name, date_of_issuing, certificate_image_link', { count: 'exact' })
    .eq('user_email', email)
    .eq('is_active', true)
    .order('date_of_issuing', { ascending: false })
    .limit(2)

  // ── Stats card config — each card links to its detail page ────────────
  const STATS = [
    {
      label:  'Active Courses',
      value:  totalCourses || (legacyUser?.course_name ? 1 : 0),
      icon:   BookOpen,
      accent: '#2563eb',
      bg:     '#eff6ff',
      border: '#bfdbfe',
      href:   '/dashboard/courses',
    },
    {
      label:  'Sessions Attended',
      value:  past.length,
      icon:   Calendar,
      accent: '#16a34a',
      bg:     '#f0fdf4',
      border: '#bbf7d0',
      href:   '/dashboard/sessions',
    },
    {
      label:  'Upcoming Classes',
      value:  upcoming.length,
      icon:   Clock,
      accent: '#7c3aed',
      bg:     '#f5f3ff',
      border: '#ddd6fe',
      href:   '/dashboard/sessions',
    },
    {
      label:  'Certificates',
      value:  certCount ?? 0,
      icon:   Award,
      accent: '#b45309',
      bg:     '#fffbeb',
      border: '#fde68a',
      href:   '/dashboard/certificates',
    },
  ]

  // ── Payments due / due-soon — monthly-membership renewals + 50-50 balances ──
  // Surfaced as a hero alert so a student never silently loses access. "Due soon" =
  // within 7 days; "overdue" = the access window already lapsed. Runs on ALL rows
  // (not just is_active) so a paused membership still shows up here.
  const dueToday  = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00')
  const dueCutoff = new Date(dueToday); dueCutoff.setDate(dueCutoff.getDate() + 7)
  const dueMobile = profile?.mobile ?? (enrolment as any)?.student_mobile ?? ''

  const { data: allEnrolForDue } = await service
    .from('student_enrolments')
    .select('id, course_id, created_at, access_end_date, balance_due, is_active, course:course_id(name, short_name, slug, tenure_type)')
    .eq('student_email', email)
    .order('created_at', { ascending: false })

  type DueItem = {
    kind: 'renewal' | 'balance'
    courseName: string
    status: 'overdue' | 'due_soon'
    dateLabel: string | null
    amount: number | null
    href: string
    cta: string
  }
  const dueItems: DueItem[] = []

  // Group by course so each course is evaluated on its "current" state, not a stray
  // row. Renewal uses the FURTHEST access_end_date (so a null/older row can't mask a
  // real expiry); balance uses the newest-created row (rows are ordered created_at DESC).
  const rollingByCourse = new Map<string, { name: string; slug: string | null; latestEnd: string | null }>()
  const balanceByCourse = new Map<string, { name: string; bal: number }>()

  for (const e of allEnrolForDue ?? []) {
    const c: any = e.course
    const cid = e.course_id as string | null
    if (!cid) continue
    const nm = c?.name ?? c?.short_name ?? 'your course'
    if (c?.tenure_type === 'monthly') {
      const end  = e.access_end_date as string | null
      const prev = rollingByCourse.get(cid)
      if (!prev) rollingByCourse.set(cid, { name: nm, slug: c?.slug ?? null, latestEnd: end })
      else if (end && (!prev.latestEnd || end > prev.latestEnd)) prev.latestEnd = end
    }
    if (!balanceByCourse.has(cid)) balanceByCourse.set(cid, { name: nm, bal: Number(e.balance_due ?? 0) })
  }

  // (a) Monthly-membership renewals due / overdue
  for (const r of rollingByCourse.values()) {
    if (!r.latestEnd) continue
    const endD = new Date(r.latestEnd + 'T00:00:00')
    if (endD > dueCutoff) continue
    dueItems.push({
      kind: 'renewal',
      courseName: r.name,
      status: endD < dueToday ? 'overdue' : 'due_soon',
      dateLabel: fmt(r.latestEnd),
      amount: null,
      href: r.slug
        ? `/courses/${r.slug}?enrol=1&email=${encodeURIComponent(email)}&name=${encodeURIComponent(studentName)}&mobile=${encodeURIComponent(dueMobile)}`
        : '/dashboard/courses',
      cta: 'Renew',
    })
  }

  // (b) 50-50 outstanding balances (newest row per course; monthly rows are 0 → skipped)
  for (const b of balanceByCourse.values()) {
    if (b.bal <= 0) continue
    dueItems.push({
      kind: 'balance',
      courseName: b.name,
      status: 'due_soon',
      dateLabel: null,
      amount: b.bal,
      href: '/dashboard/payments',
      cta: 'Pay Balance',
    })
  }
  const hasOverdue = dueItems.some((d) => d.status === 'overdue')

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

      {/* ── Payment due / renewal alert ──────────────────────────────────── */}
      {dueItems.length > 0 && (
        <div className="rounded-2xl px-5 py-4 space-y-3"
          style={hasOverdue
            ? { background: '#fef2f2', border: '1px solid #fecaca' }
            : { background: T.amberBg, border: `1px solid ${T.amberBorder}` }}>
          <p className="font-semibold text-sm flex items-center gap-2"
            style={{ color: hasOverdue ? '#b91c1c' : T.amber }}>
            {hasOverdue ? '⚠️ Payment due — action needed' : '⏳ Upcoming payment'}
          </p>
          {dueItems.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs" style={{ color: hasOverdue ? '#991b1b' : '#b45309' }}>
                <span className="font-semibold">{d.courseName}</span>
                {d.kind === 'renewal'
                  ? (d.status === 'overdue'
                      ? ` — membership lapsed on ${d.dateLabel}. Renew to resume live sessions & recordings.`
                      : ` — membership renews by ${d.dateLabel}.`)
                  : ` — balance of ₹${(d.amount ?? 0).toLocaleString('en-IN')} is due.`}
              </p>
              <Link href={d.href}
                className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: d.status === 'overdue' ? '#dc2626' : T.amber }}>
                {d.cta} →
              </Link>
            </div>
          ))}
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
            ) : courseName ? (
              <p className="text-sm mt-1" style={{ color: '#bfdbfe' }}>{courseName}</p>
            ) : (
              <p className="text-sm mt-1" style={{ color: '#bfdbfe' }}>Ready to start? Pick a course to unlock your learning path.</p>
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

      {/* ── Non-payer CTA card ─────────────────────────────────────────────── */}
      {!isPayingStudent && (
        <div className="rounded-2xl overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #4f46e5 55%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.18)' }}>
          <div className="absolute inset-0 opacity-15"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="relative px-6 py-6 md:px-8 md:py-7">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-xl"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
                🎓
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-extrabold text-lg md:text-xl mb-1">
                  Unlock your AI learning path
                </h2>
                <p className="text-sm" style={{ color: '#ddd6fe' }}>
                  Enrol in any oStaran programme to unlock live cohort sessions, your <strong>Assistant Professor (AI)</strong>, industry certification, and the community.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/courses"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-lg"
                style={{ background: 'white', color: '#4f46e5' }}>
                📚 Browse courses <ChevronRight size={14} />
              </Link>
              <Link href="/free-webinar"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}>
                🎥 Free webinar first
              </Link>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Assistant Professor (AI) — hero callout ───────────────── */}
      <Link
        href="/dashboard/assistant-professor"
        className="block rounded-2xl overflow-hidden relative group transition-all hover:shadow-xl hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #4f46e5 50%, #7c3aed 100%)',
          boxShadow: '0 4px 24px rgba(124,58,237,0.22)',
        }}
      >
        {/* decorative dots */}
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative px-5 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-2xl"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            🎓
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-extrabold text-base flex items-center gap-2 flex-wrap">
              Your Assistant Professor (AI)
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                24/7 · 100+ languages
              </span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#ddd6fe' }}>
              Ask anything about your course, sessions, a concept you want explained — your own AI professor, for life.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1 text-white font-bold text-sm opacity-90 group-hover:opacity-100 transition-opacity">
            Chat now <ChevronRight size={16} />
          </div>
        </div>
      </Link>

      {/* ── Stats row — each card is a clickable link ─────────────────────
          Active Courses     → /dashboard/courses
          Sessions Attended  → /dashboard/sessions
          Upcoming Classes   → /dashboard/sessions
          Certificates       → /dashboard/certificates                   */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map(({ label, value, icon: Icon, accent, bg, border, href }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl p-5 border bg-white block transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: T.border }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <Icon size={16} style={{ color: accent }} />
              </div>
              {/* Arrow appears on hover — signals the card is clickable */}
              <ChevronRight
                size={14}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 -translate-x-1 group-hover:translate-x-0 transition-transform"
                style={{ color: accent }}
              />
            </div>
            <p className="text-2xl font-black mb-0.5" style={{ color: T.textPrimary }}>{value}</p>
            <p className="text-xs font-medium" style={{ color: T.textMuted }}>{label}</p>
          </Link>
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
                    {s.status === 'rescheduled' && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#fef3c7', color: '#b45309' }}>Rescheduled</span>}
                    {s.status === 'skipped' && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#fee2e2', color: '#b91c1c' }}>Cancelled</span>}
                  </p>
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: T.textMuted }}>
                    <Clock size={10} /> {fmt(s.session_date)}{s.status === 'skipped' ? ' · No class this week' : (s.session_start_time ? ` · ${fmtTime(s.session_start_time)}` : '')}
                  </p>
                </div>
                {s.session_link && s.status !== 'skipped' && (
                  <a href={joinUrl(email, s.batch_id, s.session_number)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: T.blue }}>
                    Join Now <ChevronRight size={12} />
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
