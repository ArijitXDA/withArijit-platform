import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/student/exam/submit  { enrolment_id, answers: { "<question_id>": chosenIndex } }
 * ─────────────────────────────────────────────────────────────────────────────
 * Grades the 50-mark MCQ evaluation SERVER-SIDE against exam_questions.correct_index (which is
 * never sent to the browser), and records one exam_attempts row. Retakes are allowed — each
 * submission is a new attempt (attempt_no increments); admin sees the best/latest.
 *
 * The enrolment is re-resolved from the signed-in user's email — a client-supplied enrolment_id
 * is only honoured if that enrolment actually belongs to the caller, so nobody can score against
 * someone else's enrolment.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const enrolmentId = String(body?.enrolment_id ?? '').trim()
  const answers = (body?.answers ?? {}) as Record<string, unknown>
  if (!enrolmentId) return NextResponse.json({ error: 'Missing enrolment.' }, { status: 400 })

  const service = createServiceClient()

  // The enrolment must exist AND belong to the signed-in email.
  const { data: enrol } = await service
    .from('student_enrolments')
    .select('id, course_id, student_email, student_name')
    .eq('id', enrolmentId)
    .maybeSingle()
  if (!enrol) return NextResponse.json({ error: 'Enrolment not found.' }, { status: 404 })
  if (String(enrol.student_email).toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'This evaluation is not yours to take.' }, { status: 403 })
  }

  // The course's active question bank (with the answer key — server-only).
  const { data: questions } = await service
    .from('exam_questions')
    .select('id, correct_index, marks')
    .eq('course_id', enrol.course_id)
    .eq('is_active', true)
  if (!questions || !questions.length) {
    return NextResponse.json({ error: 'No evaluation is set up for this course yet.' }, { status: 400 })
  }

  // Grade.
  let score = 0
  let maxScore = 0
  let correct = 0
  for (const q of questions) {
    const marks = Number(q.marks) || 1
    maxScore += marks
    const chosen = answers[q.id as string]
    if (chosen !== undefined && chosen !== null && Number(chosen) === Number(q.correct_index)) {
      score += marks
      correct += 1
    }
  }
  score = Math.round(score * 100) / 100
  maxScore = Math.round(maxScore * 100) / 100

  // Retake numbering.
  const { count: priorCount } = await service
    .from('exam_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('enrolment_id', enrolmentId)

  const nowIso = new Date().toISOString()
  const { error } = await service.from('exam_attempts').insert({
    enrolment_id: enrolmentId,
    course_id: enrol.course_id,
    student_email: enrol.student_email,
    answers,
    score,
    max_score: maxScore,
    correct_count: correct,
    total_questions: questions.length,
    status: 'submitted',
    attempt_no: (priorCount ?? 0) + 1,
    submitted_at: nowIso,
  })
  if (error) {
    console.error('[exam submit]', error.message)
    return NextResponse.json({ error: 'Could not record your evaluation. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true, score, max_score: maxScore, correct_count: correct, total_questions: questions.length,
  })
}
