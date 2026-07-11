import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Anthropic               from '@anthropic-ai/sdk'
import {
  generateSchedule, nextSessionOf, daysUntil,
  type ScheduleSession, type BatchLike,
} from '@/lib/sessionSchedule'
import { getPlatformFacts, platformFactsBlock } from '@/lib/platformFacts'
import { ASSISTANT_PROFESSOR_TOOLS, buildSystemPrompt } from '@/lib/assistantProfessorPrompt'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ASSISTANT_PROFESSOR_TOOLS + buildSystemPrompt now live in
// @/lib/assistantProfessorPrompt (imported above) so the behavioural eval
// harness can reuse the exact same artifacts.

interface ToolCtx {
  schedule:     ScheduleSession[]
  batchUuid:    string | null
  courseId:     string | null
  variant:      string | null
  studentEmail: string
}

// ── Execute tool calls ────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  input: Record<string, any>,
  ctx: ToolCtx,
  service: ReturnType<typeof createServiceClient>,
): Promise<string> {
  switch (name) {

    case 'get_upcoming_sessions': {
      if (!ctx.schedule.length) return 'No schedule yet — once a batch is selected, the full session schedule appears here.'
      const upcoming = ctx.schedule.filter(s => !s.isPast).slice(0, 10)
      if (!upcoming.length) return 'All sessions in this cohort are complete — congratulations on finishing the programme! 🎓'
      return upcoming.map(s => {
        const d  = daysUntil(s.dateISO)
        const cd = d === 0 ? '🔴 TODAY' : d === 1 ? '⏰ TOMORROW' : `in ${d} days`
        return `• **Session ${s.n}: ${s.title}** — ${s.dateLabel}, ${s.time} (${cd})`
          + (s.meetingLink ? `\n  Join: ${s.meetingLink}` : '')
      }).join('\n\n')
    }

    case 'get_past_sessions': {
      if (!ctx.schedule.length) return 'No schedule yet.'
      const limit = input.limit ?? 10
      const past  = ctx.schedule.filter(s => s.isPast).reverse().slice(0, limit)
      if (!past.length) return 'No past sessions yet — your learning journey is just beginning!'
      return past.map(s =>
        `• **Session ${s.n}: ${s.title}** — ${s.dateLabel}`
        + (s.recordingLink ? `\n  ▶️ Recording: ${s.recordingLink}` : '')
        + (s.studyMaterialLink ? `\n  📎 Materials: ${s.studyMaterialLink}` : '')
      ).join('\n')
    }

    case 'get_session_transcript': {
      const n = input.session_number
      const s = ctx.schedule[n - 1]
      if (!s) return `Session ${n} isn't part of this cohort (it runs ${ctx.schedule.length} sessions).`

      // Prefer a real transcript. The automated Teams pipeline (cron/process-transcripts)
      // writes it to awa_session_links.transcript_text (+ transcript_summary); manual admin
      // uploads land in session_transcripts (with key_topics). Read both, prefer the automated.
      if (ctx.batchUuid) {
        const [{ data: link }, { data: up }] = await Promise.all([
          service.from('awa_session_links')
            .select('transcript_text, transcript_summary')
            .eq('batch_id', ctx.batchUuid).eq('session_number', n).maybeSingle(),
          service.from('session_transcripts')
            .select('summary, key_topics, transcript_text')
            .eq('batch_id', ctx.batchUuid).eq('session_number', n).maybeSingle(),
        ])
        const summary   = (link?.transcript_summary as string) || (up?.summary as string) || ''
        const fullText  = (link?.transcript_text   as string) || (up?.transcript_text as string) || ''
        const keyTopics = (up?.key_topics as string[] | null) ?? []
        if (summary || fullText || keyTopics.length) {
          let r = `**Session ${n}: ${s.title}** — ${s.dateLabel}\n\n`
          if (summary)          r += `**Summary:** ${summary}\n\n`
          if (keyTopics.length) r += `**Key topics:** ${keyTopics.join(', ')}\n\n`
          if (fullText) {
            const clip = fullText.length > 90000 ? fullText.slice(0, 90000) : fullText
            r += `**Full session transcript** (answer the student's question strictly from this — quote what was actually said where useful):\n${clip}`
            if (clip.length < fullText.length) r += `\n\n_(Transcript truncated here — ask me about a specific part of the session for more.)_`
          }
          return r
        }
      }

      // Fall back to the curriculum content for that session.
      let r = `**Session ${n}: ${s.title}** — ${s.dateLabel}, ${s.time}\n`
      if (s.curriculumRange) r += `_${s.curriculumRange}_\n`
      r += '\n'
      if (s.description) r += `${s.description}\n\n`
      if (s.topics.length) r += `**Topics:** ${s.topics.join(', ')}\n\n`
      if (s.projectHint) r += `**You'll build:** ${s.projectHint}\n\n`
      r += s.isPast
        ? '_The recorded session walks through all of this in depth — see get_study_material for the recording._'
        : '_This session is still upcoming — here\'s what to expect._'
      return r
    }

    case 'get_study_material': {
      const n = input.session_number
      const s = ctx.schedule[n - 1]
      if (!s) return `Session ${n} isn't part of this cohort.`
      const parts: string[] = []
      if (s.recordingLink)     parts.push(`▶️ Recording: ${s.recordingLink}`)
      if (s.studyMaterialLink) parts.push(`📎 Study material: ${s.studyMaterialLink}`)
      if (!parts.length) {
        return s.isPast
          ? `Materials for **Session ${n}: ${s.title}** haven't been uploaded yet — they usually appear within a day or two of the session.`
          : `**Session ${n}: ${s.title}** is on ${s.dateLabel}. Materials and the recording are added after the session runs.`
      }
      return `**Session ${n}: ${s.title}** — ${s.dateLabel}\n${parts.join('\n')}`
    }

    case 'get_curriculum': {
      if (ctx.schedule.length) {
        const isW9 = ctx.variant === 'weekend9'
        const head = isW9
          ? `**Your Curriculum — 9-Week Weekend Intensive (${ctx.schedule.length} weekend sessions)**\n`
            + `_Each weekend covers about three curriculum topics — the full programme, intensive pace._\n`
          : `**Your Curriculum — 26-Week Long Track (${ctx.schedule.length} sessions)**\n`
        return head + '\n' + ctx.schedule.map(s => {
          let line = `**Session ${s.n}: ${s.title}**`
          if (s.curriculumRange) line += `  _(${s.curriculumRange})_`
          if (s.topics.length)   line += `\nTopics: ${s.topics.slice(0, 12).join(', ')}`
          if (s.projectHint)     line += `\nYou'll build: ${s.projectHint}`
          return line
        }).join('\n\n')
      }
      // No schedule (no batch/start_date yet) — fall back to raw curriculum.
      if (!ctx.courseId) return 'No course enrolled yet. Please contact support.'
      const { data: curriculum } = await service
        .from('course_curriculum')
        .select('session_num, title, topics, project_hint')
        .eq('course_id', ctx.courseId)
        .eq('is_published', true)
        .order('session_num')
      if (!curriculum?.length) return 'Curriculum details are being prepared — ask Arijit in your next live session!'
      return `**Course Curriculum — ${curriculum.length} Sessions**\n\n` + curriculum.map(s => {
        let line = `**Session ${s.session_num}: ${s.title}**`
        if (s.topics?.length) line += `\nTopics: ${(s.topics as string[]).join(', ')}`
        if (s.project_hint)   line += `\nYou'll build: ${s.project_hint}`
        return line
      }).join('\n\n')
    }

    case 'log_doubt': {
      const doubt = (input.doubt ?? '').toString().trim()
      if (!doubt) return 'Nothing to log yet — ask the student to state their doubt first.'
      const { error } = await service.from('student_assistant_requests').insert({
        student_email:  ctx.studentEmail,
        course_id:      ctx.courseId,
        batch_id:       ctx.batchUuid,
        kind:           'doubt',
        session_number: typeof input.session_number === 'number' ? input.session_number : null,
        body:           doubt.slice(0, 2000),
      })
      if (error) return `Could not log the doubt right now. Ask the student to email ai@ostaran.com so it isn't lost.`
      return 'Logged ✅ — this doubt is saved and will be raised with Arijit for the next live session. Let the student know it\'s noted.'
    }

    case 'note_membership_interest': {
      const note = (input.note ?? '').toString().trim()
      const { error } = await service.from('student_assistant_requests').insert({
        student_email: ctx.studentEmail,
        course_id:     ctx.courseId,
        batch_id:      ctx.batchUuid,
        kind:          'membership',
        body:          (note || 'Interested in Quantum & AI Continued membership').slice(0, 2000),
      })
      if (error) return 'Could not record it just now — point the student to /courses/quantum-ai-continued (₹2,999/month) to enrol, or ai@ostaran.com / WhatsApp https://wa.me/919930051053 for questions.'
      return 'Interest recorded ✅. Point the student to the membership page to enrol — **/courses/quantum-ai-continued** (₹2,999/month, weekly live sessions). For any questions they can reach the team at ai@ostaran.com or WhatsApp https://wa.me/919930051053.'
    }

    case 'remember': {
      const note = (input.note ?? '').toString().trim()
      if (!note) return 'Nothing to remember yet.'
      const { data } = await service.from('agent_memory')
        .select('notes').eq('agent', 'assistant_professor').eq('user_key', ctx.studentEmail).maybeSingle()
      const existing = (data?.notes as any[]) ?? []
      const updated = [...existing, { note: note.slice(0, 300), at: new Date().toISOString() }].slice(-20)
      const { error } = await service.from('agent_memory')
        .upsert({ agent: 'assistant_professor', user_key: ctx.studentEmail, notes: updated, updated_at: new Date().toISOString() }, { onConflict: 'agent,user_key' })
      if (error) return 'Could not save that note just now.'
      return 'Noted ✅ — I\'ll remember that for next time.'
    }

    default:
      return 'Tool not available.'
  }
}

// Read this student's durable memory (notes the professor saved via remember()).
async function readStudentMemory(
  service: ReturnType<typeof createServiceClient>,
  email: string,
): Promise<string> {
  try {
    const { data } = await service.from('agent_memory')
      .select('notes').eq('agent', 'assistant_professor').eq('user_key', email).maybeSingle()
    const notes = (data?.notes as any[]) ?? []
    if (!notes.length) return ''
    const lines = notes.slice(-20).map((n: any) => `- ${typeof n === 'string' ? n : n.note}`).join('\n')
    return `## WHAT YOU REMEMBER ABOUT THIS STUDENT (from earlier conversations — use it, don't recite it)\n${lines}`
  } catch { return '' }
}

// ══════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const email   = user.email!

  // ── Paywall: Assistant Professor requires an active PAID enrolment ────────
  const { data: paidEnrolments } = await service
    .from('student_enrolments')
    .select('id')
    .eq('student_email', email)
    .eq('is_active', true)
    .gt('amount_paid', 0)
    .limit(1)

  if (!paidEnrolments || paidEnrolments.length === 0) {
    return NextResponse.json({
      reply: [
        `Hi! Your **Assistant Professor (AI)** is ready to unlock — it's bundled with every oStaran course.`,
        ``,
        `**What you get the moment you enrol:**`,
        `• **24/7 personal AI professor** (that's me!) in 100+ languages`,
        `• **Live cohort sessions** with Arijit and industry mentors`,
        `• **Curriculum tailored to your background** — AI, Agentic AI, Quantum`,
        `• **Industry-recognised certification** to put on your CV and LinkedIn`,
        ``,
        `Have a look at the programmes on offer — there's one for every stage:`,
        `👉 [Browse courses](/courses)`,
      ].join('\n'),
      locked: true,
      lock_reason: 'no_active_paid_enrolment',
    }, { status: 200 })
  }

  const { messages, courseId } = await req.json()
  if (!messages) return NextResponse.json({ error: 'Missing messages' }, { status: 400 })

  // ── Fetch student context ──────────────────────────────────────────────────
  const [
    { data: profile },
    { data: enrolments },
    { count: certCount },
  ] = await Promise.all([
    service.from('student_profiles')
      .select('full_name, occupation, key_skills')
      .eq('email', email).maybeSingle(),

    // Full batch shape — variant + total_sessions + dates drive the schedule.
    service.from('student_enrolments')
      .select(`
        id, course_name, is_active,
        course:course_id(id, name, total_sessions, subjects),
        batch:batch_id(id, label, day_of_week, start_time, start_date, end_date,
                       duration_mins, meeting_link, variant, total_sessions)
      `)
      .eq('student_email', email)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

    service.from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('user_email', email)
      .eq('is_active', true),
  ])

  // Resolve which enrolment/course we're working with
  const enrolmentCount = enrolments?.length ?? 0
  let activeEnrolment  = enrolments?.[0] ?? null
  if (courseId && enrolments) {
    const match = enrolments.find((e: any) => (e.course as any)?.id === courseId)
    if (match) activeEnrolment = match
  }

  const activeCourse  = (activeEnrolment?.course as any) ?? null
  const activeBatch   = (activeEnrolment?.batch  as any) as BatchLike | null
  const resolvedCourseId   = activeCourse?.id   ?? courseId ?? null
  const resolvedCourseName = activeCourse?.name ?? activeEnrolment?.course_name ?? 'AI Mastery Programme'
  const batchUuid     = activeBatch?.id ?? null

  // ── Build the computed schedule (the new source of truth) ──────────────────
  let links: any[] = []
  let curriculum: any[] = []
  if (batchUuid) {
    const [{ data: l }, { data: c }] = await Promise.all([
      service.from('awa_session_links')
        .select('session_number, session_title, recording_link, study_material_link, meeting_link, notes')
        .eq('batch_id', batchUuid),
      service.from('course_curriculum')
        .select('session_num, title, topics, description, project_hint')
        .eq('course_id', resolvedCourseId ?? '')
        .eq('is_published', true)
        .order('session_num'),
    ])
    links = l ?? []
    curriculum = c ?? []
  }
  const schedule     = generateSchedule(activeBatch, links, curriculum)
  const next         = nextSessionOf(schedule)
  const sessionsPast = schedule.filter(s => s.isPast).length
  const sessionsTotal = activeBatch?.total_sessions ?? activeCourse?.total_sessions ?? 26

  // Days since last visit
  const { data: convHistory } = await service
    .from('student_agent_conversations')
    .select('last_seen_at, messages, session_count')
    .eq('user_id', email)
    .eq('course_id', resolvedCourseId ?? '')
    .maybeSingle()

  const daysSinceLogin = convHistory?.last_seen_at
    ? Math.floor((Date.now() - new Date(convHistory.last_seen_at).getTime()) / 86400000)
    : 0

  const cohortRange = activeBatch?.start_date && activeBatch?.end_date
    ? `${new Date(activeBatch.start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
      + ` → ${new Date(activeBatch.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : null

  const promptCtx = {
    studentName:   profile?.full_name ?? email.split('@')[0],
    email,
    courseName:    resolvedCourseName,
    occupation:    profile?.occupation ?? 'Not specified',
    batchLabel:    activeBatch?.label ?? null,
    variant:       activeBatch?.variant ?? null,
    cohortRange,
    sessionsTotal,
    sessionsPast,
    durationMins:  activeBatch?.duration_mins ?? 60,
    certCount:     certCount ?? 0,
    daysSinceLogin,
    enrolmentCount,
    next,
  }

  const toolCtx: ToolCtx = {
    schedule,
    batchUuid,
    courseId:     resolvedCourseId,
    variant:      activeBatch?.variant ?? null,
    studentEmail: email,
  }

  // ── Claude messages (cap at 20 turns for context) ─────────────────────────
  const claudeMessages: Anthropic.MessageParam[] = (messages as any[])
    .slice(-20)
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // ── Agentic tool loop ──────────────────────────────────────────────────────
  const memoryBlock = await readStudentMemory(service, email)
  const systemPrompt = buildSystemPrompt(promptCtx)
    + '\n\n' + platformFactsBlock(await getPlatformFacts())
    + (memoryBlock ? '\n\n' + memoryBlock : '')
  let   workingMsgs  = claudeMessages
  let   finalReply   = ''
  const MAX_LOOPS    = 4

  for (let i = 0; i < MAX_LOOPS; i++) {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 1200,
      system:     systemPrompt,
      tools:      ASSISTANT_PROFESSOR_TOOLS,
      messages:   workingMsgs,
    })

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(block.name, block.input as Record<string, any>, toolCtx, service)
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
        }
      }
      workingMsgs = [
        ...workingMsgs,
        { role: 'assistant', content: response.content },
        { role: 'user',      content: toolResults },
      ]
      continue
    }

    finalReply = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('')
    break
  }

  if (!finalReply) finalReply = "I had trouble generating a response. Please try again!"

  // ── Persist conversation to DB ─────────────────────────────────────────────
  const updatedMessages = [...claudeMessages, { role: 'assistant', content: finalReply }]
  const lastUserMsg = [...claudeMessages].reverse().find(m => m.role === 'user')?.content ?? ''
  const lastTopic   = typeof lastUserMsg === 'string' ? lastUserMsg.slice(0, 100) : ''

  if (resolvedCourseId) {
    await service.from('student_agent_conversations').upsert({
      user_id:       email,
      course_id:     resolvedCourseId,
      course_name:   resolvedCourseName,
      messages:      updatedMessages.slice(-30),
      session_count: (convHistory?.session_count ?? 0) + 1,
      last_topic:    lastTopic,
      last_seen_at:  new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id,course_id' })
  } else {
    await service.from('student_agent_conversations').upsert({
      user_id:       email,
      messages:      updatedMessages.slice(-30),
      session_count: (convHistory?.session_count ?? 0) + 1,
      last_topic:    lastTopic,
      last_seen_at:  new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  return NextResponse.json({ reply: finalReply })
}
