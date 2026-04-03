import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Arijit Chowdhury — AI Researcher, Educator & Entrepreneur | oStaran',
  description:
    'Arijit Chowdhury is a CAIO, AI researcher, IIT Bombay Guest Lecturer, and founder of oStaran & Star Analytix Pvt Ltd. 19 years global experience. Researcher in Agentic AI, AGI, Quantum Computing, Industrial AI and AI Defence. Has trained 50,000+ learners across India, USA and Canada.',
  keywords: [
    'Arijit Chowdhury', 'Arijit Chowdhury AI', 'Arijit Chowdhury oStaran',
    'Arijit Chowdhury Star Analytix', 'CAIO India', 'AI trainer India',
    'Agentic AI trainer India', 'IIT Bombay AI lecturer',
  ],
  openGraph: {
    title: 'Arijit Chowdhury — AI Researcher, Educator & Entrepreneur',
    description: 'CAIO · IIT Bombay Guest Lecturer · Founder oStaran · 50,000+ learners trained · Researcher: Agentic AI, AGI, Quantum Computing',
    images: [{ url: '/arijit-image.png' }],
  },
  alternates: { canonical: 'https://www.ostaran.com/about/arijit-chowdhury' },
}

const TIMELINE = [
  { period: '2000s', role: 'Data & Analytics Leader',  orgs: 'HSBC · Reliance Industries · Yes Bank', desc: 'Built large-scale data platforms and analytics systems across banking, insurance, and FMCG.' },
  { period: '2010s', role: 'CAIO & CTO',               orgs: 'Murugappa Group · Qubit Microsystems · AI FinTechs', desc: 'Led AI and technology transformation as Chief AI Officer and CTO across conglomerates and technology firms.' },
  { period: '2020',  role: 'Founder & AI Educator',    orgs: 'Star Analytix Pvt Ltd · oStaran', desc: 'Founded oStaran in April 2020. Launched live AI education platform during global lockdown. 100 students in 4 days.' },
  { period: '2024+', role: 'CAIO · Researcher',        orgs: 'Global Fintech · oStaran', desc: 'Active CAIO at a Global Fintech firm. Researcher in Agentic AI, AGI, Quantum Computing, Industrial AI and AI Defence. 50,000+ learners trained.' },
]

const EXPERTISE = [
  'Agentic AI & Multi-Agent Systems', 'AGI Research', 'Quantum Machine Learning',
  'Industrial AI', 'AI Defence Applications', 'LLMs & SLMs', 'Agentic RAG',
  'MCP (Model Context Protocol)', 'Vibe Coding Ecosystems', 'Cloud Model Training',
  'BI & Data Science', 'Cognitive AI', 'Numerical Analysis',
  'AI Strategy & Governance', 'Corporate AI Transformation',
]

export default function ArijitChowdhuryPage() {
  const personSchema = {
    '@context':   'https://schema.org',
    '@type':      'Person',
    name:         'Arijit Chowdhury',
    url:          'https://www.ostaran.com/about/arijit-chowdhury',
    image:        'https://www.ostaran.com/arijit-image.png',
    jobTitle:     'CAIO, AI Researcher & Educator',
    description:  'Arijit Chowdhury is an Indian AI educator, researcher, and entrepreneur with 19 years of global corporate experience. Founder of Star Analytix Pvt Ltd and oStaran. Guest Lecturer at IIT Bombay. Researcher in Agentic AI, AGI, Quantum Computing, Industrial AI and AI Defence. Has trained 50,000+ learners across India, USA and Canada.',
    worksFor:     { '@type': 'Organization', name: 'Star Analytix Pvt Ltd', url: 'https://www.ostaran.com' },
    alumniOf:     [{ '@type': 'EducationalOrganization', name: 'IIT Bombay (Guest Lecturer)' }],
    knowsAbout:   EXPERTISE,
    affiliation:  [
      { '@type': 'Organization', name: 'oStaran' },
      { '@type': 'Organization', name: 'Star Analytix Pvt Ltd' },
    ],
    address:      { '@type': 'PostalAddress', addressLocality: 'Mumbai', addressCountry: 'IN' },
    sameAs:       ['https://www.linkedin.com/in/arijit-chowdhury-86020b19/'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />

      <div className="min-h-screen" style={{ background: '#06080f' }}>

        {/* Breadcrumb */}
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/about" className="hover:text-slate-300 transition-colors">About</Link>
            <span>/</span>
            <span className="text-slate-300">Arijit Chowdhury</span>
          </div>
        </div>

        {/* Hero */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-[280px_1fr] gap-10 items-start">

            {/* Left — photo card */}
            <div className="rounded-3xl border p-8 flex flex-col items-center text-center"
              style={{ background: 'rgba(79,70,229,0.05)', borderColor: 'rgba(139,92,246,0.2)' }}>
              <div className="relative mb-5">
                <Image src="/arijit-image.png" alt="Arijit Chowdhury"
                  width={160} height={160}
                  className="w-40 h-40 rounded-full object-cover object-top border-2"
                  style={{ borderColor: 'rgba(139,92,246,0.5)' }} />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-black flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              </div>

              <h1 className="font-extrabold text-white text-2xl">Arijit Chowdhury</h1>
              <p className="text-indigo-400 text-xs mt-1 font-semibold">CAIO · AI Researcher · Educator · Entrepreneur</p>
              <p className="text-slate-500 text-xs mt-1">Mumbai, India 🇮🇳</p>

              <div className="mt-5 w-full">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Researcher & Trainer</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {['Agentic AI','AGI','Quantum Computing','Industrial AI','AI Defence'].map(a => (
                    <span key={a} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{ background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.25)', color: '#a78bfa' }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <a href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/"
                target="_blank" rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white w-full justify-center hover:opacity-90 transition-all"
                style={{ background: '#0077B5' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                View & Follow on LinkedIn
              </a>
            </div>

            {/* Right — bio */}
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-6">
                19 years building AI systems inside the world&apos;s most demanding organisations.
                Now teaching 50,000+ learners how to build them too.
              </p>
              <div className="space-y-4 text-slate-400 text-sm leading-relaxed">
                <p>
                  Arijit Chowdhury began his career at the intersection of data, technology, and finance — building
                  large-scale analytics and AI systems inside HSBC, Reliance Industries, Yes Bank, Murugappa Group,
                  and Qubit Microsystems. He served as CTO and CAIO across multiple organisations, accumulating
                  19 years of frontline experience that no textbook or online course could replicate.
                </p>
                <p>
                  In April 2020, in the middle of a global pandemic, he launched oStaran — a live, hands-on AI
                  education platform with one core belief: <em className="text-slate-300">the best way to learn AI is to build AI, live,
                  with someone who has built it in production.</em> 100 students enrolled within 4 days.
                  50,000 have followed since.
                </p>
                <p>
                  He is currently CAIO at a Global Fintech firm and Founder of <strong className="text-slate-200">Star Analytix Pvt Ltd</strong>,
                  the company operating oStaran. His research spans Agentic AI, AGI, Quantum Computing,
                  Industrial AI, and AI Defence — areas he brings directly into live classroom sessions.
                </p>
                <p>
                  As Guest Lecturer at IIT Bombay, KJ Somaiya, and NL Dalmia, and as corporate coach
                  for Deloitte, PwC, McKinsey, Capgemini, and Cognizant, Arijit operates at both the
                  academic frontier and the corporate coal-face of AI adoption in India.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Career Timeline */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-8 text-center">Career Journey</h2>
            <div className="space-y-5">
              {TIMELINE.map(({ period, role, orgs, desc }) => (
                <div key={period} className="flex gap-5 items-start">
                  <div className="shrink-0 w-20 text-right">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg block">{period}</span>
                  </div>
                  <div className="flex-1 pb-5 border-b border-gray-100">
                    <p className="font-extrabold text-gray-900 text-sm">{role}</p>
                    <p className="text-indigo-600 text-xs font-semibold mt-0.5 mb-2">{orgs}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Expertise */}
        <section className="py-16 px-4" style={{ background: '#070812' }}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-extrabold text-white mb-8">Areas of Expertise &amp; Research</h2>
            <div className="flex flex-wrap justify-center gap-2.5">
              {EXPERTISE.map(e => (
                <span key={e} className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:border-indigo-500/50"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Teach with Arijit CTA */}
        <section className="py-16 px-4 text-center"
          style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)' }}>
          <h2 className="text-2xl font-extrabold text-white mb-3">Learn Directly from Arijit</h2>
          <p className="text-indigo-200 mb-8 max-w-xl mx-auto">
            Every live session is taught personally by Arijit — not by a TA, not by a pre-recorded video.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/masterclass"
              className="px-7 py-3.5 rounded-2xl text-sm font-bold text-white hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 24px rgba(124,58,237,0.35)' }}>
              🎓 Get Certified This Sunday →
            </Link>
            <Link href="/courses"
              className="px-7 py-3.5 rounded-2xl text-sm font-bold border border-white/20 text-white hover:bg-white/8 transition-all">
              View All Programmes →
            </Link>
          </div>
        </section>

      </div>
    </>
  )
}
