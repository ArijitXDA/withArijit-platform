'use client'
import { useState } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const QUESTIONS = [
  { q: 'How often do you use AI tools in your work?', options: ['Never', 'Occasionally', 'Weekly', 'Daily'] },
  { q: 'Which best describes your AI knowledge?', options: ['Complete beginner', 'I know the basics', 'Intermediate user', 'Advanced practitioner'] },
  { q: 'What is your primary goal with AI?', options: ['Save time', 'Improve output quality', 'Get promoted / career growth', 'Build AI products'] },
  { q: 'How does your organisation view AI?', options: ['Cautious / avoiding it', 'Exploring', 'Actively adopting', 'AI-first strategy'] },
  { q: 'What is your biggest barrier to AI adoption?', options: ['Don\'t know where to start', 'No time to learn', 'Company culture', 'Technical complexity'] },
]

function getResult(answers: number[]): { level: string; recommendation: string } {
  const score = answers.reduce((sum, a) => sum + a, 0)
  if (score <= 4) return { level: 'Beginner', recommendation: 'Start with our free webinar to get a solid foundation.' }
  if (score <= 9) return { level: 'Explorer', recommendation: 'Our AI Certification program is perfect for your level.' }
  if (score <= 14) return { level: 'Practitioner', recommendation: 'Advance your skills with our Masterclass program.' }
  return { level: 'Champion', recommendation: 'Join our advanced cohort and become a certified AI leader.' }
}

export default function AIReadinessQuizPage() {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [done, setDone] = useState(false)

  function answer(idx: number) {
    const newAnswers = [...answers, idx]
    if (current + 1 < QUESTIONS.length) {
      setAnswers(newAnswers)
      setCurrent(current + 1)
    } else {
      setAnswers(newAnswers)
      setDone(true)
    }
  }

  const result = done ? getResult(answers) : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">AI Readiness Quiz</h1>
      <p className="text-gray-600 mb-10">5 questions. Discover your AI readiness level.</p>
      {!done ? (
        <div>
          <div className="flex gap-1 mb-8">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={cn('flex-1 h-1.5 rounded-full', i <= current ? 'bg-indigo-600' : 'bg-gray-200')} />
            ))}
          </div>
          <p className="font-semibold text-lg mb-6">{QUESTIONS[current].q}</p>
          <div className="space-y-3">
            {QUESTIONS[current].options.map((opt, i) => (
              <button
                key={opt}
                onClick={() => answer(i)}
                className="w-full text-left p-4 border rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center p-8 border rounded-2xl bg-indigo-50">
          <p className="text-indigo-600 font-semibold text-sm mb-2">Your AI Level</p>
          <h2 className="text-4xl font-bold mb-4">{result!.level}</h2>
          <p className="text-gray-700 mb-8">{result!.recommendation}</p>
          <div className="flex flex-col gap-3">
            <Link href="/free-webinar" className={cn(buttonVariants({ size: 'lg' }), 'bg-indigo-600 hover:bg-indigo-500 text-white')}>
              Start Free Webinar →
            </Link>
            <Link href="/ai-certification" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              View Certification Programs
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
