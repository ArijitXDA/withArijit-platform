'use client'
import { useState } from 'react'

// ── Canonical class-schedule answer ──────────────────────────────────────────
// Referenced from every audience's scheduling FAQ so a single edit here
// propagates everywhere. Use **bold** for emphasis on key USPs.
const CLASS_SCHEDULE_ANSWER =
  'Live sessions run primarily on **weekends**, with multiple batches scheduled across **US, Canada, India, and European timezones** — from early morning through late night — so wherever you\'re based, there\'s a slot that fits your day. **Weekday batches** are also available for students and professionals who prefer evenings or specific working hours. Each live session is **60 minutes** of focused instruction, hands-on building, and live Q&A. Every session is **recorded and uploaded to your dashboard within a few hours**, with **lifetime access** — nothing is ever missed. Between classes, your **Assistant Professor (AI) is available 24/7** to explain any concept, demonstrate any tool, platform, or technology, walk through code, or answer questions in **100+ languages**. Live expert teaching + lifetime recordings + an always-on AI professor — the programme fits around your life, not the other way around.'

// Convert **bold** markers to HTML <strong>. All FAQ strings are author-
// controlled constants in this file, so dangerouslySetInnerHTML is safe here.
function renderFaqAnswer(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-200 font-semibold">$1</strong>')
}

// ── Shared FAQs — appear on all course pages ───────────────────────────────────
const SHARED_FAQS = [
  {
    q: 'What certificates do I receive?',
    a: 'Two certificates: an Interim Certificate after Session 13 (LinkedIn-ready immediately), and a globally recognised Completion Certificate after all sessions. Both carry a unique verification ID — verifiable at ostaran.com/certificate-verification. Already held by learners working in India, USA, and Canada.',
  },
  {
    q: 'What if I miss a class?',
    a: 'Every live session is recorded and uploaded to your dashboard **within a few hours**, with **lifetime access** to all recordings. On top of that, your **Assistant Professor (AI)** is available **24/7** to walk you through anything from the missed session — concepts, code, tools, or platform demos in 100+ languages. That said, live attendance is where the real learning happens — our Industrial AI Leaders teach live, build systems in real time, and take questions on the spot.',
  },
  {
    q: 'What is the AI Kit and when does it arrive?',
    a: 'The AI Kit is a physical package couriered to your home in India after full-course payment. It includes an AI Learning Roadmap Notebook, AI Handbook, printed curriculum, "I am an AI Guy/Girl" badge, "I am an AI Superstar" sticker, oStaran merch, and your personal Learner Card.',
  },
  {
    q: 'Is there a payment plan?',
    a: 'Yes — the 50-50 Plan lets you pay 50% now to lock in today\'s price, and the remaining 50% after Session 13 before your Interim Certificate is issued. The price you lock in today does not change regardless of future increases.',
  },
  {
    q: 'Will the fee increase if I wait?',
    a: 'Yes — the fee increases approximately 10% each month, and demand keeps rising. Enrolling today locks in the current price permanently. Many learners who waited 2 months ended up paying 20–25% more for the same programme.',
  },
  {
    q: 'Can my organisation enrol multiple employees?',
    a: 'Yes — use Group Enrolment at ostaran.com/group-enrol. Pay for seats in bulk, add each person\'s details, and they each receive a personal invitation to activate their own dashboard. GST invoice issued for the full amount. Minimum 2 seats.',
  },
  {
    q: 'Who owns the projects I build?',
    a: 'You do — completely. Every project built during the programme is entirely yours with no IP restrictions. You can deploy, sell, or consult around them freely. This is not a sandbox — these are real, production-ready systems.',
  },
  {
    q: 'Is the certificate recognised internationally?',
    a: 'Yes. oStaran certificates are verifiable online and are already held by learners at companies across India, USA, Canada, UK, Germany, and the Netherlands. The verification link can be shared directly with employers or added to LinkedIn.',
  },
]

// ── Audience-specific FAQs ─────────────────────────────────────────────────────
const AUDIENCE_FAQS: Record<string, { q: string; a: string }[]> = {
  default: [
    {
      q: 'Do I need a coding background?',
      a: 'No prior coding experience is needed. We start from absolute zero and build progressively. The only exception is the Agentic AI Development programme, which assumes basic Python familiarity. All other programmes are accessible to complete beginners.',
    },
    {
      q: 'When are the classes held?',
      a: CLASS_SCHEDULE_ANSWER,
    },
    {
      q: 'How fast can I expect results?',
      a: 'Many learners begin applying AI tools at work within 2–3 sessions. By Session 8, you\'ll have deployable projects. Salary conversations typically open up 3–6 months after certification, depending on your industry and how aggressively you apply the skills.',
    },
  ],
  school: [
    {
      q: 'What age group is this for?',
      a: 'This programme is designed for students in Class 8 through Class 12 (ages 13–18). No prior technical background is needed. If you can use a laptop and are curious about AI, you\'re ready. We\'ve had students as young as 13 build and deploy working AI systems.',
    },
    {
      q: 'When are the sessions? Will it affect my studies?',
      a: CLASS_SCHEDULE_ANSWER,
    },
    {
      q: 'Do I need to know coding?',
      a: 'Not at all. We start from zero. You\'ll learn to use AI tools, build simple AI applications, and understand how AI works — without needing to know Python or any programming language to begin. By the end, you\'ll have built real AI projects you can show anyone.',
    },
    {
      q: 'Will this actually help me get into a better college?',
      a: 'Yes — directly. University admissions teams, especially for engineering, computer science, and business programmes, are actively looking for applicants who show real initiative beyond academics. An AI certification with real projects is a powerful differentiator. Several of our school-track alumni have directly cited this programme in successful BITS, SRCC, NIT, and international applications.',
    },
    {
      q: 'Can my parents attend the sessions with me?',
      a: 'Absolutely. Parents are welcome to sit in on any session. Many parents have enrolled together with their children — and several parents have ended up enrolling in the Working Professionals track themselves after seeing what the platform offers.',
    },
  ],
  college: [
    {
      q: 'I have no work experience. Will this still be valuable?',
      a: 'This programme is specifically designed for freshers and final-year students. Work experience is not required. What matters is your ability to build — and this programme gives you that. Our college-track graduates enter interviews with real deployed AI projects, which outweighs years of generic experience in the eyes of AI-first employers.',
    },
    {
      q: 'When are the sessions? Do they clash with college schedules?',
      a: CLASS_SCHEDULE_ANSWER,
    },
    {
      q: 'Do I need a coding background?',
      a: 'Basic familiarity with any programming language helps but is not required. We start from tools and concepts before moving to code. If you\'ve taken any CS elective or done basic Python — you\'re more than ready. If not, we start from scratch.',
    },
    {
      q: 'Will this help me in campus placements?',
      a: 'Yes — significantly. Recruiters from tech and consulting firms are specifically filtering for AI skills in campus interviews. Having a verifiable oStaran AI certificate plus live project portfolio puts you in a different category than most other candidates. Several oStaran college-track graduates have directly attributed their placements at MAANG, Big 4, and AI startups to their certification.',
    },
  ],
  tech: [
    {
      q: 'What technical prerequisites are needed?',
      a: 'Solid Python is essential. Familiarity with APIs, basic ML concepts, and cloud services (AWS/GCP/Azure) will help but is not required. If you\'re a working developer with 1+ year of experience in any language, you\'re ready for this programme. It moves fast — and that\'s intentional.',
    },
    {
      q: 'How is this different from online courses like Coursera or Udemy?',
      a: 'Those courses teach concepts. This programme builds systems — live, in production, with real architecture decisions. You\'ll build Agentic RAG pipelines, MCP-integrated multi-agent systems, and LLM fine-tuning workflows that you can deploy and demo. Arijit builds everything live in the session — no pre-recorded walkthroughs.',
    },
    {
      q: 'When are the sessions?',
      a: CLASS_SCHEDULE_ANSWER,
    },
  ],
  cxo: [
    {
      q: 'I\'m not technical. Can I still benefit?',
      a: 'Yes — this programme is designed specifically for non-technical leaders. You will not be writing code. You will be understanding AI systems deeply enough to evaluate them, govern them, and drive their adoption across your organisation. The focus is strategy, ROI, and leadership — not engineering.',
    },
    {
      q: 'When are the sessions and what is the time commitment?',
      a: CLASS_SCHEDULE_ANSWER,
    },
    {
      q: 'How is this relevant to my specific industry?',
      a: 'Arijit has built AI systems inside HSBC, Reliance, Yes Bank, and Murugappa — across fintech, FMCG, banking, and enterprise tech. The programme draws on real industry examples from these environments, and Arijit tailors discussions to the audience in each session. You will leave with AI strategies directly applicable to your sector.',
    },
  ],
}

export function CourseFAQ({ course }: { course: any }) {
  const [open, setOpen] = useState<number | null>(null)

  const category   = course.audience_category ?? 'default'
  const audienceFaqs = AUDIENCE_FAQS[category] ?? AUDIENCE_FAQS.default
  const allFaqs    = [...audienceFaqs, ...SHARED_FAQS]

  return (
    <section className="py-16 px-4" style={{ background: '#070812' }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white mb-2">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-sm">Everything you need to know before enrolling</p>
        </div>

        <div className="space-y-2">
          {allFaqs.map((faq, i) => (
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
                <span className="text-slate-500 shrink-0 text-lg leading-none transition-transform duration-200"
                  style={{ transform: open === i ? 'rotate(45deg)' : 'none', display: 'inline-block' }}>
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t"
                  style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                  <p className="pt-3"
                    dangerouslySetInnerHTML={{ __html: renderFaqAnswer(faq.a) }} />
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
          · WhatsApp:{' '}
          <a href="https://wa.me/919930051053" className="text-indigo-400 hover:underline">
            +91 99300 51053
          </a>
          {' '}· We reply within a few hours.
        </p>
      </div>
    </section>
  )
}
