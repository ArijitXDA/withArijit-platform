import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Image from 'next/image'
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

  const supabase  = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service   = createServiceClient()
  const email     = user.email!

  // ── Fetch student enrolment (new table) ──────────────────────────────────
  const { data: enrolment } = await service
    .from('student_enrolments')
    .select('*, course:course_id(name, short_name, total_sessions, session_duration_mins), batch:batch_id(label, day_of_week, start_time, meeting_link)')
    .eq('student_email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ── Fallback to legacy users table ───────────────────────────────────────
  const { data: legacyUser } = await service
    .from('users')
    .select('name, course_name, batch_day_time, batch_id')
    .eq('email', email)
    .maybeSingle()

  const studentName   = enrolment?.student_name ?? legacyUser?.name ?? user.email?.split('@')[0] ?? 'Student'
  const firstName     = studentName.split(' ')[0]
  const courseName    = (enrolment?.course as any)?.name ?? legacyUser?.course_name ?? 'AI Mastery Programme'
  const batchLabel    = (enrolment?.batch as any)?.label ?? legacyUser?.batch_day_time ?? null
  const batchTime     = (enrolment?.batch as any)?.start_time ?? null
  const meetingLink   = (enrolment?.batch as any)?.meeting_link ?? null
  const legacyBatchId = legacyUser?.batch_id ?? null

  // ── Upcoming sessions ────────────────────────────────────────────────────
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

  // ── Certificates ─────────────────────────────────────────────────────────
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

      {/* Welcome banner */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)' }}>
        {welcome === '1' && (
          <div className="absolute top-4 right-4 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1 text-xs text-green-400 font-semibold">
            🎉 Enrolment Confirmed!
          </div>
        )}
        <div className="px-6 py-7 flex items-center gap-5">
          <Image src="/arijit-image.png" alt="Arijit" width={56} height={56}
            className="w-14 h-14 rounded-full object-cover object-top border-2 border-indigo-400/40 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-extrabold text-xl">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-indigo-300 text-sm mt-1">{courseName}</p>
            {batchLabel && (
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

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Sessions Attended',  value: pastCount ?? 0,     icon: BookOpen,  color: '#818cf8' },
          { label: 'Upcoming Classes',   value: upcomingSessions.length, icon: Calendar,  color: '#34d399' },
          { label: 'Certificates',       value: certCount ?? 0,     icon: Award,     color: '#fbbf24' },
          { label: 'Batch Mates',        value: '50+',              icon: Users,     color: '#f472b6' },
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
                <p className="text-gray-600 text-xs mt-1">Check back after your batch starts</p>
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
                <p className="text-gray-600 text-xs mt-1">Complete your course to earn your certificate</p>
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
            { href: '/dashboard/sessions',     label: '📅 Sessions' },
            { href: '/dashboard/courses',       label: '📚 My Courses' },
            { href: '/dashboard/certificates',  label: '🏆 Certificates' },
            { href: '/dashboard/library',       label: '📖 Library' },
            { href: '/dashboard/payments',      label: '💳 Payments' },
            { href: '/dashboard/become-partner',label: '🤝 Become Partner' },
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
