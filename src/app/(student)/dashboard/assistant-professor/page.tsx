import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect }            from 'next/navigation'
import AssistantProfessorClient from './_components/AssistantProfessorClient'
import AssistantProfessorUpgrade from './_components/AssistantProfessorUpgrade'
import {
  generateSchedule, nextSessionOf, daysUntil, variantLabel, type BatchLike,
} from '@/lib/sessionSchedule'

export default async function AssistantProfessorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // ── Paywall: require at least one active paid enrolment ────────────────
  // Non-paying users see a tailored upgrade screen inside the student layout
  // (sidebar + top-nav remain intact — they're still signed in).
  const { data: paidEnrolments } = await service
    .from('student_enrolments')
    .select('id')
    .eq('student_email', email)
    .eq('is_active', true)
    .gt('amount_paid', 0)
    .limit(1)

  if (!paidEnrolments || paidEnrolments.length === 0) {
    // Fetch first name for personal greeting
    const { data: profile } = await service
      .from('student_profiles')
      .select('full_name')
      .eq('email', email)
      .maybeSingle()
    const firstName = (profile?.full_name ?? email.split('@')[0]).split(' ')[0]
    return <AssistantProfessorUpgrade firstName={firstName} />
  }

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
        batch:batch_id(id, label, day_of_week, start_time, start_date, end_date,
                       duration_mins, meeting_link, variant, total_sessions)
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
  const activeBatch    = (firstEnrolment?.batch  as any) as BatchLike | null
  const batchUuid      = activeBatch?.id ?? null
  const courseId       = activeCourse?.id ?? null
  const courseName     = activeCourse?.name ?? firstEnrolment?.course_name ?? 'AI Mastery Programme'
  const variant        = activeBatch?.variant ?? null

  // ── Computed schedule — start_date + n×7, overlaid with awa_session_links
  //    (recordings / materials) and course_curriculum (topics). New batches do
  //    NOT use the legacy session_master_table. ───────────────────────────────
  let links: any[] = []
  let curriculum: any[] = []
  if (batchUuid) {
    const [{ data: l }, { data: c }] = await Promise.all([
      service.from('awa_session_links')
        .select('session_number, session_title, recording_link, study_material_link, meeting_link, notes')
        .eq('batch_id', batchUuid),
      service.from('course_curriculum')
        .select('session_num, title, topics, description, project_hint')
        .eq('course_id', courseId ?? '')
        .eq('is_published', true)
        .order('session_num'),
    ])
    links = l ?? []
    curriculum = c ?? []
  }
  const schedule      = generateSchedule(activeBatch, links, curriculum)
  const nextSched     = nextSessionOf(schedule)
  const sessionsPast  = schedule.filter(s => s.isPast).length
  const totalSessions = activeBatch?.total_sessions ?? activeCourse?.total_sessions ?? 26
  const progressPct   = totalSessions > 0 ? Math.round((sessionsPast / totalSessions) * 100) : 0

  // Map the next computed session into the shape the welcome + client expect.
  const nextSession: { title: string; date: string; time: string; link: string | null; daysAway: number } | null =
    nextSched ? {
      title:    `Session ${nextSched.n}: ${nextSched.title}`,
      date:     nextSched.dateLabel,
      time:     nextSched.time,
      link:     nextSched.meetingLink,
      daysAway: daysUntil(nextSched.dateISO),
    } : null

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

      const fmtLine = variant ? `You're on the **${variantLabel(variant)}**. ` : ''
      return `${greeting}, **${firstName}!** 🎓\n\n${countdownLine}\n\n${fmtLine}You've completed **${sessionsPast} of ${totalSessions} sessions** (${progressPct}% of your journey).\n\nAsk me anything — your schedule, what's coming in the next session, a concept you want explained, or anything from past classes.`
    }

    // No batch / new student
    return `${greeting}, **${firstName}!** 🌟\n\nWelcome to your **Assistant Professor (AI)** — your personal 24/7 AI professor for the **${courseName}** programme.\n\nI'm here to help you with your schedule, explain any concept from the curriculum, answer questions about your sessions and certificates, and guide you through your AI learning journey — in 100+ languages, whenever you need me.\n\n${!batchUuid ? '⚠️ **Tip:** Select a batch from your dashboard to see your session schedule here.\n\n' : ''}What would you like to explore first?`
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
    variant,
    variantLabel: variant ? variantLabel(variant) : null,
  }

  return (
    <AssistantProfessorClient
      welcomeMessage={welcomeMessage}
      existingMessages={existingMessages}
      clientCtx={clientCtx}
    />
  )
}
