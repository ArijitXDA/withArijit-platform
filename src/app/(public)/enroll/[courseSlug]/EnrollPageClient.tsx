'use client'

import { useState } from 'react'
import { PaymentModal } from '@/components/shared/PaymentModal'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface Course {
  id:          string
  name:        string
  slug:        string
  description: string
  mrp:         number
}

interface Props {
  course:      Course
  prefill:     { name: string; email: string; mobile: string }
  partnerCode: string | null
  partnerName: string
  discountPct: number
  refSource:   string | null  // 'webinar' | 'nudge' | etc
}

const BENEFITS: Record<string, string[]> = {
  'ai-mastery-programme': [
    'Python, ML & Generative AI from scratch',
    'Industry-recognised AI Certificate',
    '20+ real-world projects in your portfolio',
    'Live weekend sessions + lifetime recordings',
    'Career support & AI job placement guidance',
  ],
  'agentic-ai-development': [
    'Build production-grade AI Agents & pipelines',
    'LangChain, CrewAI, LLMs & RAG systems',
    'Vibe Coding & Advanced Prompting mastery',
    'Deploy AI apps to cloud (live projects)',
    'Globally recognised AI Developer certificate',
  ],
}

const DEFAULT_BENEFITS = [
  'Hands-on AI training from industry expert',
  'Globally recognised certificate',
  'Real projects -- no theory-only learning',
  'Live sessions + lifetime recording access',
]

const TESTIMONIALS = [
  {
    quote: 'Arijit made Agentic AI easy even for a novice like me. He helps you build real intelligent agents.',
    name:  'Dakshayani B P',
    title: 'Retired Scientist & Director, ISRO',
  },
  {
    quote: 'A rare blend of technical depth, mentorship and strategic thinking. Highly recommended.',
    name:  'Sourav Choudhury',
    title: 'IIM Mumbai | Harvard Business School | Nestle',
  },
  {
    quote: "Arijit's grip on AI is exceptional -- bridges simple tools to advanced solutions seamlessly.",
    name:  'Dr. Harish B Suri',
    title: 'Professor | IIM Mumbai | IIT Kharagpur',
  },
]

const FAQS = [
  ['Is this the same as the free webinar?', 'No -- the webinar was a 90-minute taster. The full programme is 4 months of live weekend sessions, hands-on projects, mentorship, and a globally recognised certificate.'],
  ['Can I pay in instalments?', 'Yes -- choose the 50-50 plan at checkout: pay half now and the other half later. No interest, no hidden fees.'],
  ['Will I get a certificate?', 'Yes -- an industry-recognised AI certificate for your LinkedIn and resume, verified by AIwithArijit x oStaran.'],
  ['How do I access the sessions?', "After enrolment you will receive an email with your dashboard login and session schedule. All classes are live on Microsoft Teams."],
]

const BENEFIT_EMOJIS = ['🤖','📜','🛠️','🎓','💼','⚡','🚀','💻','☁️']

export function EnrollPageClient({ course, prefill, partnerCode, partnerName, discountPct, refSource }: Props) {
  const [open, setOpen] = useState(false)

  const isFromWebinar = refSource === 'webinar' || refSource === 'nudge'
  const benefits      = BENEFITS[course.slug] ?? DEFAULT_BENEFITS
  const discountAmt   = discountPct > 0 ? Math.round(course.mrp * discountPct / 100) : 0
  const priceAfter    = course.mrp - discountAmt

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          {isFromWebinar && (
            <Badge className="bg-green-600/20 text-green-400 border border-green-600/30 mb-2">
              You attended the free webinar -- take the next step
            </Badge>
          )}
          {discountPct > 0 ? (
            <Badge className="bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 mb-2">
              🎁 {discountPct}% discount{partnerName ? ` gifted by ${partnerName}` : ''} applied
            </Badge>
          ) : partnerCode ? (
            <p className="text-xs text-indigo-300 font-mono">Partner referral: {partnerCode}</p>
          ) : null}
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            Enrol in<br />
            <span className="text-indigo-400">{course.name}</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">{course.description}</p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <span className="text-4xl font-black">{formatCurrency(discountPct > 0 ? priceAfter : course.mrp)}</span>
            <div className="text-left">
              {discountPct > 0 && (
                <p className="text-gray-400 text-sm line-through leading-none">{formatCurrency(course.mrp)}</p>
              )}
              <p className="text-gray-400 text-xs">+ 18% GST</p>
              <p className="text-green-400 text-xs font-semibold">50-50 plan available</p>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base px-8 py-4 rounded-xl transition-all active:scale-95 shadow-lg"
            >
              Enrol Now -- Secure My Seat
            </button>
          </div>
          <p className="text-gray-500 text-xs">Secured by Razorpay · GST invoice issued automatically · 100% safe</p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        {/* Benefits */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What you get with this programme</h2>
          <ul className="space-y-3">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="text-lg leading-none shrink-0">{BENEFIT_EMOJIS[i] ?? '✅'}</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trainer */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
          <img
            src="/trainer-arijit.jpg"
            alt="Arijit Chowdhury"
            className="w-20 h-20 rounded-full object-cover shrink-0 border-2 border-indigo-200"
          />
          <div>
            <p className="font-bold text-gray-900">Arijit Chowdhury</p>
            <p className="text-gray-500 text-sm mt-0.5">
              AI Researcher & Trainer · Agentic AI & Quantum Computing<br />
              IIT Bombay · Star Analytix · NLDIBM
            </p>
            <a
              href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 text-xs font-medium hover:underline mt-1 inline-block"
            >
              LinkedIn Profile
            </a>
          </div>
        </div>

        {/* Testimonials */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">What our students say</h2>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-gray-600 text-sm italic">"{t.quote}"</p>
              <p className="font-semibold text-gray-900 text-sm mt-2">-- {t.name}</p>
              <p className="text-gray-400 text-xs">{t.title}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Common questions</h2>
          {FAQS.map(([q, a]) => (
            <div key={q} className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="font-semibold text-gray-900 text-sm">{q}</p>
              <p className="text-gray-600 text-sm mt-1.5">{a}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Ready to transform your career?</h2>
          <p className="text-gray-600 text-sm">Join thousands of professionals who have already taken this step.</p>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-xl transition-all"
          >
            Enrol in {course.name}
          </button>
          <p className="text-gray-400 text-xs">
            Questions? WhatsApp us at{' '}
            <a href="https://wa.me/919930051053" className="text-indigo-600 hover:underline">+91 99300 51053</a>
          </p>
        </div>

        <p className="text-center">
          <Link href="/courses" className="text-sm text-gray-400 hover:text-gray-600">
            View all courses
          </Link>
        </p>
      </div>

      {/* Payment modal */}
      <PaymentModal
        open={open}
        onClose={() => setOpen(false)}
        courseId={course.id}
        courseName={course.name}
        price={course.mrp}
        discountPct={discountPct}
        partnerName={partnerName}
        defaultName={prefill.name}
        defaultEmail={prefill.email}
        defaultMobile={prefill.mobile}
        defaultPartnerCode={partnerCode ?? ''}
      />
    </div>
  )
}
