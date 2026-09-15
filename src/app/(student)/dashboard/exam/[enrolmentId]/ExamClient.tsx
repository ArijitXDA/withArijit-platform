'use client'

import { useState } from 'react'
import Link from 'next/link'

type Q = { id: string; question_text: string; options: string[] }

export default function ExamClient({
  enrolmentId, courseName, studentName, questions, maxScore, attemptsCount, bestScore,
}: {
  enrolmentId: string; courseName: string; studentName: string
  questions: Q[]; maxScore: number; attemptsCount: number; bestScore: number | null
}) {
  const [started, setStarted] = useState(false)
  const [cur, setCur] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<{ score: number; max_score: number; correct_count: number; total_questions: number } | null>(null)

  const total = questions.length
  const answered = Object.keys(answers).length
  const q = questions[cur]

  async function submit() {
    setSubmitting(true); setErr(null)
    try {
      const res = await fetch('/api/student/exam/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrolment_id: enrolmentId, answers }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j.error || 'Could not submit. Please try again.'); setSubmitting(false); return }
      setResult(j)
    } catch { setErr('Network error. Please try again.'); setSubmitting(false) }
  }

  function restart() {
    setResult(null); setAnswers({}); setCur(0); setStarted(true); setErr(null); setSubmitting(false)
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    const pct = result.max_score ? Math.round((result.score / result.max_score) * 100) : 0
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
               style={{ background: pct >= 50 ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)' }}>
            <span className="text-3xl font-black" style={{ color: pct >= 50 ? '#059669' : '#4f46e5' }}>{pct}%</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Evaluation submitted</h1>
          <p className="mt-1 text-slate-500">{courseName}</p>
          <div className="mt-6 flex items-center justify-center gap-8">
            <div><p className="text-3xl font-black text-slate-900 tabular-nums">{result.score}<span className="text-lg text-slate-400">/{result.max_score}</span></p><p className="text-xs uppercase tracking-wider text-slate-400">Your score</p></div>
            <div><p className="text-3xl font-black text-slate-900 tabular-nums">{result.correct_count}<span className="text-lg text-slate-400">/{result.total_questions}</span></p><p className="text-xs uppercase tracking-wider text-slate-400">Correct</p></div>
          </div>
          <p className="mt-6 text-sm text-slate-500">Your score has been recorded. You can retake the evaluation any time to improve it.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={restart} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Retake</button>
            <Link href="/dashboard/courses" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Back to my courses</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Intro screen ───────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">50-Mark Evaluation</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{courseName}</h1>
          <p className="mt-3 text-slate-600">
            {studentName ? `${studentName}, this` : 'This'} is your end-of-bootcamp evaluation — <strong>{total} questions, {maxScore} marks</strong>.
            Pick the best answer for each. You can move back and forth, and change answers before you submit.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-500">
            <li>• One mark per question · no negative marking.</li>
            <li>• No time limit — take your time.</li>
            <li>• You can <strong>retake</strong> it later to improve your score.</li>
          </ul>
          {attemptsCount > 0 && bestScore !== null && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
              You have taken this {attemptsCount} time{attemptsCount > 1 ? 's' : ''}. Best so far: <strong>{bestScore}/{maxScore}</strong>.
            </div>
          )}
          <button onClick={() => setStarted(true)}
            className="mt-6 w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white hover:bg-indigo-700">
            {attemptsCount > 0 ? 'Retake the evaluation →' : 'Start the evaluation →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Question screen ────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Question {cur + 1} of {total}</span>
          <span>{answered}/{total} answered</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${((cur + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-slate-900">{q.question_text}</p>
        <div className="mt-4 space-y-2.5">
          {q.options.map((opt, i) => {
            const chosen = answers[q.id] === i
            return (
              <button key={i} onClick={() => setAnswers(a => ({ ...a, [q.id]: i }))}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  chosen ? 'border-indigo-500 bg-indigo-50 text-slate-900' : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  chosen ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-slate-500'}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-5 flex items-center justify-between">
        <button onClick={() => setCur(c => Math.max(0, c - 1))} disabled={cur === 0}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50">← Back</button>

        {cur < total - 1 ? (
          <button onClick={() => setCur(c => Math.min(total - 1, c + 1))}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Next →</button>
        ) : (
          <button onClick={submit} disabled={submitting || answered < total}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-emerald-700">
            {submitting ? 'Submitting…' : answered < total ? `Answer all ${total} to submit` : 'Submit evaluation'}
          </button>
        )}
      </div>
      {answered < total && cur === total - 1 && (
        <p className="mt-2 text-right text-xs text-slate-400">You still have {total - answered} unanswered — use Back to complete them.</p>
      )}
    </div>
  )
}
