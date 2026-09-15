import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ExamClient from './ExamClient'

export const dynamic = 'force-dynamic'

/**
 * /dashboard/exam/[enrolmentId] — the 50-mark MCQ evaluation for a one-day bootcamp.
 * Questions are served WITHOUT the answer key; grading happens server-side in
 * /api/student/exam/submit. Access is gated on the enrolment belonging to the signed-in email.
 */
export default async function ExamPage({ params }: { params: Promise<{ enrolmentId: string }> }) {
  const { enrolmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/signin')

  const service = createServiceClient()

  const { data: enrol } = await service
    .from('student_enrolments')
    .select('id, course_id, student_email, student_name, course:course_id(name, short_name, slug)')
    .eq('id', enrolmentId)
    .maybeSingle()

  // Must be the caller's own enrolment.
  if (!enrol || String(enrol.student_email).toLowerCase() !== user.email.toLowerCase()) {
    redirect('/dashboard/courses')
  }
  const course: any = Array.isArray(enrol.course) ? enrol.course[0] : enrol.course

  const { data: questions } = await service
    .from('exam_questions')
    .select('id, question_text, options, marks, sort_order')  // NB: correct_index deliberately excluded
    .eq('course_id', enrol.course_id)
    .eq('is_active', true)
    .order('sort_order')

  const { data: attempts } = await service
    .from('exam_attempts')
    .select('score, max_score, correct_count, total_questions, submitted_at')
    .eq('enrolment_id', enrolmentId)
    .order('created_at', { ascending: false })

  const best = (attempts ?? []).reduce((m, a) => Math.max(m, Number(a.score) || 0), 0)
  const maxScore = (attempts ?? [])[0]?.max_score
    ?? (questions ?? []).reduce((s, q) => s + (Number(q.marks) || 1), 0)

  if (!questions || !questions.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Evaluation not ready yet</h1>
        <p className="mt-2 text-slate-500">The 50-mark evaluation for this bootcamp has not been set up yet. Please check back after your session.</p>
        <Link href="/dashboard/courses" className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">Back to my courses</Link>
      </div>
    )
  }

  return (
    <ExamClient
      enrolmentId={enrolmentId}
      courseName={course?.name || course?.short_name || 'Your bootcamp'}
      studentName={enrol.student_name || ''}
      questions={(questions as any[]).map(q => ({ id: q.id, question_text: q.question_text, options: q.options as string[] }))}
      maxScore={Number(maxScore) || 50}
      attemptsCount={(attempts ?? []).length}
      bestScore={(attempts ?? []).length ? best : null}
    />
  )
}
