import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect }            from 'next/navigation'
import AssistantProfessorClient from './_components/AssistantProfessorClient'

export default async function AssistantProfessorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!
  const today   = new Date().toISOString().split('T')[0]

  // ── Fetch all student data in parallel ─────────────────────────────────────
  const [
    { data: profile },
    { data: enrolments },
    { data: certs, count: certCount },
  ] = await Promise.all([
    service.from('student_profiles')
      .select('full_name, occupation, key_skills')
      .eq('email', email).maybeSingle(),

    service.from('student_enrolments')
      .select(`
        id, course_name, is_active,
        course:course_id(id, name, total_sessions, slug),
        batch:batch_id(label, day_of_week, start_time, meeting_link, session_batch_id)
      `)
      .eq('student_email', email)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

    service.from('certificates')
      .select('id, certificate_name', { count: 'exact' })
      .eq('user_email', email)
      .eq('is_active', true),
  ])

  const studentName    = profile?.full_name ?? email.split('@')[0]
  const firstName      = studentName.split(' ')[0]
  const enrolmentCount = enrolments?.length ?? 0
  const firstEnrolment = enrolments?.[0] ?? null
  const activeCourse   = (firstEnrolment?.course as any) ?? null
  const activeBatch    = (firstEnrolment?.batch  as any) ?? null
  const batchId        = activeBatch?.session_batch_id ?? null
  const courseId       = activeCourse?.id ?? null
  const courseName     = activeCourse?.name ?? firstEnrolment?.course_name ?? 'AI Mastery Programme'

  // ── Upcoming session ───────────────────────────────────────────────────────
  let nextSession: { title: string; date: string; time: string; link: string | null; daysAway: number } | null = null

  if (batchId) {
    const { data: upcoming } = await service
      .from('session_master_table')
      .select('session_title, session_date, session_start_time, session_link')
      .eq('batch_id', batchId)
      .gte('session_date', today)
      .order('session_date')
      .limit(1)
      .maybeSingle()

    if (upcoming) {
      const sessionDate = new Date(upcoming.session_date)
      const daysAway    = Math.ceil((sessionDate.getTime() - Date.now()) / 86400000)
      nextSession = {
        title:    upcoming.session_title ?? 'Next Session',
        date:     sessionDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
        time:     upcoming.session_start_time ? upcoming.session_start_time.slice(0, 5) + ' IST' : '11:00 AM IST',
        link:     upcoming.session_link ?? null,
        daysAway,
      }
    }
  }

  // ── Past session count ─────────────────────────────────────────────────────
  let sessionsPast = 0
  if (batchId) {
    const { count } = await service
      .from('session_master_table')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batchId)
      .lt('session_date', today)
    sessionsPast = count ?? 0
  }

  const totalSessions  = activeCourse?.total_sessions ?? 26
  const progressPct    = totalSessions > 0 ? Math.round((sessionsPast / totalSessions) * 100) : 0

  // ── Days since last Assistant Professor visit ─────────────────────────────
  const { data: convHistory } = await service
    .from('student_agent_conversations')
    .select('last_seen_at, messages, last_topic')
    .eq('user_id', email)
    .maybeSingle()

  const daysSinceLast = convHistory?.last_seen_at
    ? Math.floor((Date.now() - new Date(convHistory.last_seen_at).getTime()) / 86400000)
    : -1

  const lastTopic = convHistory?.last_topic ?? null

  // ── Build attractive static welcome message ────────────────────────────────
  function buildWelcome(): string {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    // Multi-course: ask which course
    if (enrolmentCount > 1) {
      const courseList = (enrolments ?? [])
        .map((e: any) => `• **${(e.course as any)?.name ?? e.course_name}**`)
        .join('\n')
      return `${greeting}, **${firstName}!** 🎓\n\nYou're enrolled in ${enrolmentCount} courses. Which one would you like to explore today?\n\n${courseList}\n\nJust tell me the course name and I'll pull up your schedule, progress, and curriculum for it.`
    }

    // Returning after long absence
    if (daysSinceLast > 7) {
      const absentLine = daysSinceLast > 30
        ? `It's been a little while — great to see you back!`
        : `Welcome back after ${daysSinceLast} days!`

      return `${greeting}, **${firstName}!** 👋 ${absentLine}\n\n${nextSession
        ? `Your next class is **${nextSession.title}** — ${nextSession.date} at ${nextSession.time}. That's ${nextSession.daysAway === 0 ? '**today!**' : nextSession.daysAway === 1 ? '**tomorrow**' : `in **${nextSession.daysAway} days**`}.`
        : `You've completed **${sessionsPast}** sessions so far — ${progressPct}% of your journey.`}\n\nWhat would you like to cover today? I can help you catch up on past sessions, prep for what's coming, or dive into any AI topic.`
    }

    // Recent topic continuation
    if (lastTopic && daysSinceLast >= 0 && daysSinceLast <= 3) {
      return `${greeting}, **${firstName}!** 🌟\n\nLast time we were discussing: *"${lastTopic}"* — want to pick up where we left off?\n\n${nextSession
        ? `Your next class is **${nextSession.title}** on ${nextSession.date} at ${nextSession.time}${nextSession.daysAway <= 1 ? ` — ${nextSession.daysAway === 0 ? 'that\'s today!' : 'that\'s tomorrow!'}` : '.'}`
        : ''}\n\nWhat can I help you with today?`
    }

    // Next session countdown (primary state)
    if (nextSession) {
      const countdownLine = nextSession.daysAway === 0
        ? `🔴 **Your class is TODAY** at ${nextSession.time}!`
        : nextSession.daysAway === 1
        ? `⏰ **Your next class is TOMORROW** — ${nextSession.date} at ${nextSession.time}.`
        : `Your next class is **${nextSession.title}** — ${nextSession.date} at ${nextSession.time} *(${nextSession.daysAway} days away).*`

      return `${greeting}, **${firstName}!** 🎓\n\n${countdownLine}\n\nYou've completed **${sessionsPast} of ${totalSessions} sessions** (${progressPct}% of your journey).\n\nAsk me anything — your schedule, what's coming in the next session, a concept you want explained, or anything from past classes.`
    }

    // No batch / new student
    return `${greeting}, **${firstName}!** 🌟\n\nWelcome to your **Assistant Professor (AI)** — your personal 24/7 AI professor for the **${courseName}** programme.\n\nI'm here to help you with your schedule, explain any concept from the curriculum, answer questions about your sessions and certificates, and guide you through your AI learning journey — in 100+ languages, whenever you need me.\n\n${!batchId ? '⚠️ **Tip:** Select a batch from your dashboard to see your session schedule here.\n\n' : ''}What would you like to explore first?`
  }

  const welcomeMessage = buildWelcome()

  // ── Load existing conversation (last 20 turns for continuity) ──────────────
  const existingMessages: { role: 'user' | 'assistant'; content: string }[] =
    (convHistory?.messages ?? []).slice(-20)

  // Pass the rich context the client needs
  const clientCtx = {
    studentName,
    firstName,
    email,
    courseName,
    courseId,
    enrolmentCount,
    courses: (enrolments ?? []).map((e: any) => ({
      id:   (e.course as any)?.id,
      name: (e.course as any)?.name ?? e.course_name,
    })),
    sessionsPast,
    totalSessions,
    progressPct,
    certCount:    certCount ?? 0,
    nextSession,
    batchLabel:   activeBatch?.label ?? null,
    batchTime:    activeBatch?.start_time ?? null,
    meetingLink:  activeBatch?.meeting_link ?? null,
  }

  return (
    <AssistantProfessorClient
      welcomeMessage={welcomeMessage}
      existingMessages={existingMessages}
      clientCtx={clientCtx}
    />
  )
}
