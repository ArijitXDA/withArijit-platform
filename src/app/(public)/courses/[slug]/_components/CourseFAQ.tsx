'use client'
import { useState } from 'react'

const BASE_FAQS = [
  {
    q: 'Do I need a coding background?',
    a: 'No prior coding experience is needed for most programmes. We start from zero and build progressively. The Agentic AI Development programme does require basic Python familiarity.',
  },
  {
    q: 'When are the classes held?',
    a: 'All live sessions are on weekends — Saturday and/or Sunday — so your weekdays are completely unaffected. Sessions are 60 minutes each.',
  },
  {
    q: 'What if I miss a class?',
    a: 'Every live session is recorded and uploaded within 24 hours. You get lifetime access to all recordings, so you can catch up at your own pace.',
  },
  {
    q: 'What certificates do I receive?',
    a: 'You receive two certificates: an Interim Certificate after Session 13, and a globally recognised Completion Certificate after completing all sessions. Both can be added directly to your LinkedIn profile.',
  },
  {
    q: 'What is the AI Kit and when does it arrive?',
    a: 'The AI Kit is a physical learning package couriered to your home address in India after successful full-course payment. It includes a curated AI tools reference guide, session workbook, prompt library, and your oStaran learner card.',
  },
  {
    q: 'Is there a payment plan?',
    a: 'Yes — the 50-50 Plan lets you pay 50% now to lock in the current price, and the remaining 50% after Session 13 before your Interim Certificate is issued.',
  },
  {
    q: 'Will the fee increase?',
    a: 'Yes — the fee increases approximately 10% each month. Enrolling today locks in the current price permanently, regardless of future increases.',
  },
  {
    q: 'Can my organisation enrol multiple employees?',
    a: 'Yes — use our Group Enrolment feature at ostaran.com/group-enrol. Purchase seats in bulk, add each person\'s details, and they each receive a personal invitation to activate their own dashboard. GST invoice issued for the full amount.',
  },
  {
    q: 'Who owns the projects I build?',
    a: 'You do. Every project you build during the programme is entirely yours — no IP restrictions, no commercial restrictions. You can deploy, sell, or consult around them freely.',
  },
  {
    q: 'Is the certificate recognised internationally?',
    a: 'Yes. oStaran certificates are globally recognised and are already held by learners in India, the USA, and Canada. The certificate includes a unique verification ID that anyone can check at ostaran.com/certificate-verification.',
  },
]

export function CourseFAQ({ course }: { course: any }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="py-16 px-4" style={{ background: '#070812' }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white mb-2">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-sm">Everything you need to know before enrolling</p>
        </div>

        <div className="space-y-2">
          {BASE_FAQS.map((faq, i) => (
            <div key={i}
              className="rounded-2xl border overflow-hidden transition-all"
              style={{
                borderColor: open === i ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)',
                background:  open === i ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
              }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
              >
                <span className="text-sm font-semibold text-slate-200 leading-snug">{faq.q}</span>
                <span className="text-slate-500 shrink-0 transition-transform duration-200 text-lg leading-none"
                  style={{ transform: open === i ? 'rotate(45deg)' : 'none' }}>
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t"
                  style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                  <p className="pt-3">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          Still have questions?{' '}
          <a href="mailto:ai@ostaran.com" className="text-indigo-400 hover:underline">
            ai@ostaran.com
          </a>{' '}
          · We reply within a few hours.
        </p>
      </div>
    </section>
  )
}
