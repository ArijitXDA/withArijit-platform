import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AboutTimeline }    from './_components/AboutTimeline'
import { AboutMarkets }     from './_components/AboutMarkets'
import { AboutOrgSchema }   from './_components/AboutOrgSchema'

export const metadata: Metadata = {
  title: 'About oStaran — India\'s AI Education Platform | Star Analytix',
  description:
    'oStaran is an Indian AI education startup founded in 2020, training 50,000+ professionals, students & leaders across India, USA, Canada & Western Europe. Founded by Arijit Chowdhury. Operated by Star Analytix Pvt Ltd, Mumbai.',
  keywords: [
    'oStaran about', 'AI education company India', 'Arijit Chowdhury AI trainer',
    'Star Analytix AI', 'AI upskilling India', 'AI startup India profitable',
    'Indian AI education platform', 'oStaran Star Analytix',
  ],
  openGraph: {
    title: 'About oStaran — An Indian AI Education Startup Built for the World',
    description: 'Founded April 2020. 50,000+ certified. India · USA · Canada · Europe. Profitable from day one.',
  },
  alternates: { canonical: 'https://www.ostaran.com/about' },
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '50,000+',    label: 'Learners Certified',      sub: 'Since April 2020' },
  { value: '4',          label: 'Global Markets',           sub: 'India · USA · Canada · Europe' },
  { value: '4.9★',       label: 'Platform Rating',          sub: 'Verified learner reviews' },
  { value: '9',          label: 'AI Programmes',            sub: 'Basic to advanced' },
  { value: '100%',       label: 'Live Sessions',            sub: 'Never pre-recorded' },
  { value: 'Profitable', label: 'Since Year One',           sub: 'No VC. No compromise.' },
  { value: 'Every',      label: 'Sunday — Live Class',      sub: 'Week after week, since 2020' },
  { value: '2020',       label: 'Founded',                  sub: 'Mumbai, India 🇮🇳' },
]

// ── Audiences ─────────────────────────────────────────────────────────────────
const AUDIENCES = [
  { emoji: '💼', label: 'Working Professionals',   desc: 'IT, Finance, HR, Marketing, Operations — AI for your exact role, not a generic curriculum.' },
  { emoji: '🎓', label: 'College & Fresh Graduates', desc: 'AI certification before your first job interview. Build the portfolio that gets you hired.' },
  { emoji: '📚', label: 'School Students',          desc: 'Class 8–12, CBSE/ICSE/State boards. The AI head start every student needs — and no school is giving.' },
  { emoji: '💻', label: 'Tech Developers',          desc: 'Agentic AI, LLMs, SLMs, RAG, MCP, Vibe Coding, Quantum ML. The deepest technical curriculum in India.' },
  { emoji: '🏆', label: 'Business Leaders & CXOs',  desc: 'AI strategy, governance and transformation — taught by someone who has built it inside global corporations.' },
  { emoji: '🏠', label: 'Homemakers & Career Returners', desc: 'Restart your career or build independent income using AI — from home, on your schedule.' },
  { emoji: '🏢', label: 'Corporate Teams',           desc: 'Group enrolment for 2 to 500+ employees. One payment, individual dashboards, GST invoice.' },
]

// ── Differentiators ───────────────────────────────────────────────────────────
const PILLARS = [
  {
    emoji: '🔴',
    title: 'Always Live',
    desc:  'Every session is live, interactive, small-batch, and taught by Arijit personally. No YouTube-style recordings. No pre-packaged content. Real teaching, real time.',
    color: '#ef4444',
  },
  {
    emoji: '🔧',
    title: 'Real Projects Only',
    desc:  'No toy projects. No dummy datasets. Students build production-ready AI systems — agents, SaaS tools, RAG platforms — that they own, deploy, and can sell commercially.',
    color: '#f59e0b',
  },
  {
    emoji: '🎁',
    title: 'Physical AI Kit',
    desc:  'A physical kit couriered to every enrolled student in India. Notebook, handbook, curriculum, badges, stickers, merch — your AI identity, in your hands.',
    color: '#22c55e',
  },
  {
    emoji: '🌍',
    title: 'Globally Recognised',
    desc:  'Our certificates are held by learners working at companies across India, USA, Canada and Western Europe. Verifiable online. LinkedIn-ready.',
    color: '#3b82f6',
  },
  {
    emoji: '🇮🇳',
    title: 'Indian-Built, World-Ready',
    desc:  'Founded in Mumbai by Indian professionals, for Indian learners first — then expanded to serve the global workforce. Priced for India. Quality for the world.',
    color: '#f97316',
  },
  {
    emoji: '💰',
    title: 'Profitable. Independent.',
    desc:  'No venture capital. No compromise on quality to chase growth metrics. We grow because learners get results — and tell others. Profitable since our first batch.',
    color: '#a78bfa',
  },
]

// ── Mission / Vision / Values ─────────────────────────────────────────────────
const VALUES = [
  { emoji: '⚡', title: 'Practical over Theoretical',  desc: 'If you can\'t apply it on Monday morning, we haven\'t taught you enough.' },
  { emoji: '🔴', title: 'Live over Recorded',           desc: 'Learning is a conversation, not a broadcast. We show up every week.' },
  { emoji: '🏆', title: 'Outcome over Certificate',     desc: 'The certificate is proof. The skill is the goal. We build both.' },
  { emoji: '🇮🇳', title: 'India-First, World-Ready',    desc: 'Built in India for the world. Affordable here, competitive everywhere.' },
]

// ── Senior Testimonials ───────────────────────────────────────────────────────
const SENIORS = [
  { name: 'Dakshayani B P',    role: 'Retired Scientist & Director', org: 'ISRO',                         emoji: '🚀', color: '#4f46e5', quote: 'Arijit made Agentic AI easy even for a novice like me. He doesn\'t just teach concepts — he helps students build real intelligent agents for real-world problems.' },
  { name: 'Dr. Harish B Suri', role: 'Professor',                   org: 'IIM Mumbai · IIT Kharagpur',   emoji: '🏛️', color: '#059669', quote: 'Arijit\'s grip on data science and AI is exceptional. He seamlessly bridges simple tools to advanced AI-ML solutions across industries.' },
  { name: 'Suvajit Ray',       role: 'Head of Product & Distribution', org: 'IIFL Capital',              emoji: '📊', color: '#d97706', quote: 'Arijit has a rare ability to simplify complex AI and analytics concepts. His depth in BI, Cognitive AI and numerical analysis clearly sets him apart.' },
  { name: 'Sourav Choudhury',  role: 'IIM Mumbai · Harvard Business School', org: 'Nestlé',             emoji: '🎯', color: '#7c3aed', quote: 'A rare blend of technical depth, mentorship and strategic thinking. Arijit doesn\'t just teach AI — he changes how you think about problems.' },
]

const RESEARCH_AREAS = ['Agentic AI', 'AGI', 'Quantum Computing', 'Industrial AI', 'AI Defence']

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
      style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
      {children}
    </span>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function AboutPage() {
  return (
    <>
      <AboutOrgSchema />

      <div className="min-h-screen" style={{ background: '#06080f' }}>

        {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-24 px-4"
          style={{ background: 'linear-gradient(135deg, #05051a 0%, #0d0b2b 40%, #0a1628 100%)' }}>

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }} />

          {/* Radial glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at top, rgba(124,58,237,0.18) 0%, transparent 70%)' }} />

          <div className="relative max-w-5xl mx-auto text-center">
            {/* India badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-bold mb-8 border"
              style={{ background: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.35)', color: '#fb923c' }}>
              🇮🇳 Profitable &nbsp;·&nbsp; India-Founded &nbsp;·&nbsp; Globally Operating
            </div>

            <h1 className="font-extrabold leading-[1.06] tracking-tight mb-6 text-white"
              style={{ fontSize: 'clamp(2.4rem, 6.5vw, 5rem)' }}>
              An Indian AI Education Startup<br />
              <span style={{
                background: 'linear-gradient(135deg, #f97316, #fbbf24, #f97316)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Built for the World.
              </span>
            </h1>

            <p className="text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto mb-4">
              Founded in Mumbai in April 2020 — in the middle of a global pandemic —
              oStaran has trained over 50,000 professionals, students, school children,
              and business leaders across India, USA, Canada, and Western Europe.
            </p>
            <p className="text-slate-500 text-base max-w-2xl mx-auto mb-10">
              No venture capital. No compromise. Profitable from our very first batch.
              Operated by <strong className="text-slate-300">Star Analytix Pvt Ltd</strong>, Mumbai.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/masterclass"
                className="px-7 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 30px rgba(124,58,237,0.35)' }}>
                Get Certified This Sunday →
              </Link>
              <Link href="/courses"
                className="px-7 py-3.5 rounded-2xl text-sm font-bold border transition-all hover:bg-white/8"
                style={{ borderColor: 'rgba(255,255,255,0.18)', color: '#e2e8f0' }}>
                Explore Programmes →
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. STATS GRID ────────────────────────────────────────────────── */}
        <section className="py-16 px-4 border-b" style={{ background: '#070812', borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATS.map(({ value, label, sub }) => (
              <div key={label} className="text-center p-5 rounded-2xl border"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-2xl md:text-3xl font-black text-white mb-1">{value}</p>
                <p className="text-xs font-bold text-indigo-400 mb-0.5">{label}</p>
                <p className="text-[11px] text-slate-600">{sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. ORIGIN STORY ──────────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <SectionLabel>Our Story</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                How oStaran Was Born
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
              <p>
                It was April 2020. The world had come to a sudden, bewildering halt. Offices closed.
                Flights grounded. Cities silent. In the middle of that global shutdown, something
                unexpected happened: people started learning again.
              </p>
              <p>
                Arijit Chowdhury — with 19 years of experience building AI and data systems inside
                HSBC, Reliance, Yes Bank, Murugappa, and Qubit Microsystems — saw the moment clearly.
                The world was pausing. The future wasn&apos;t. AI was accelerating, and most of the
                workforce didn&apos;t have the skills to compete in what was coming. Expensive bootcamps
                catered to Western markets. YouTube was theory without practice. Indian learners
                deserved something better: <em>live, hands-on, practical AI education
                built around real results — not just certificates.</em>
              </p>
              <p>
                So he started teaching. Live. Interactive. Small batches. Real projects from day one.
                Within <strong>4 days of launch, 100 students had enrolled.</strong> Within
                8 months, that number crossed <strong>1,000.</strong> Every class was live.
                Every project was real. No toy examples. No dummy datasets.
                No pre-recorded lectures. If Arijit was teaching it, it was built live,
                in front of the students — from scratch.
              </p>
              <p>
                The venture was profitable from the very first batch. No investors.
                No compromises. Just results — and word of mouth from students who
                got promoted, switched careers, launched products, and landed consulting
                clients directly from the skills they built in the course.
              </p>
              <p>
                By 2024, 10,000 students had been trained. oStaran became the only
                training platform in India — and possibly in South Asia — teaching
                how to build AI Agents and Agentic AI systems with Agentic RAG and
                MCP from scratch, inside live classes. The only platform teaching
                how to build LLMs, SLMs, and cloud model training. The only platform
                covering exhaustive Vibe Coding ecosystems and Quantum Machine Learning
                at this level of depth, live and hands-on.
              </p>
              <p>
                In 2025, we launched a new brand: <strong>oStaran</strong>.
                In March 2026, we launched the new platform — partner.ostaran.com,
                webinar.ostaran.com, and ostaran.com — with a full partner ecosystem,
                group enrolment, and the infrastructure to scale globally.
              </p>
              <p>
                The course fee has been increasing approximately 10% every month.
                Demand has kept rising anyway. That&apos;s the oStaran story — a venture
                built not on funding rounds, but on the genuine transformation of
                every student who walks through our classroom.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. TIMELINE ──────────────────────────────────────────────────── */}
        <AboutTimeline />

        {/* ── 5. WHO WE SERVE ──────────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 mb-4">
                Every Learner. Every Stage.
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
                Who We Serve
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                We built a separate programme for every audience — because generic AI education
                serves no one particularly well.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AUDIENCES.map(({ emoji, label, desc }) => (
                <div key={label}
                  className="group flex items-start gap-4 p-5 rounded-2xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <span className="text-3xl shrink-0 mt-0.5">{emoji}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm mb-1">{label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. WHAT MAKES US DIFFERENT ───────────────────────────────────── */}
        <section className="py-20 px-4" style={{ background: '#070812' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <SectionLabel>Our Difference</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
                What Makes oStaran Unique
              </h2>
              <p className="text-slate-500 text-lg">
                None of our competitors offer all six of these simultaneously.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PILLARS.map(({ emoji, title, desc, color }) => (
                <div key={title}
                  className="flex flex-col gap-3 p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-2xl"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: `${color}20`,
                    boxShadow: `0 4px 20px ${color}05`,
                  }}>
                  <span className="text-3xl">{emoji}</span>
                  <p className="font-extrabold text-white text-base">{title}</p>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                  <div className="mt-auto h-0.5 rounded-full w-12" style={{ background: color }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. MARKETS ───────────────────────────────────────────────────── */}
        <AboutMarkets />

        {/* ── 8. FOUNDER ───────────────────────────────────────────────────── */}
        <section className="py-20 px-4" style={{ background: '#06080f' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <SectionLabel>The Founder</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                Meet Arijit Chowdhury
              </h2>
            </div>

            <div className="rounded-3xl border overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="grid md:grid-cols-[280px_1fr]">

                {/* Left */}
                <div className="flex flex-col items-center justify-start p-8 text-center border-b md:border-b-0 md:border-r"
                  style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(79,70,229,0.05)' }}>
                  <div className="relative mb-4">
                    <Image src="/arijit-image.png" alt="Arijit Chowdhury"
                      width={140} height={140}
                      className="w-36 h-36 rounded-full object-cover object-top border-2"
                      style={{ borderColor: 'rgba(139,92,246,0.5)' }} />
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-black flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  </div>
                  <p className="font-extrabold text-white text-xl">Arijit Chowdhury</p>
                  <p className="text-indigo-400 text-xs mt-1 font-semibold">Founder, oStaran · Star Analytix Pvt Ltd</p>
                  <p className="text-slate-500 text-xs mt-1">Mumbai, India 🇮🇳</p>

                  {/* Research areas */}
                  <div className="mt-5 w-full">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Researcher &amp; Trainer
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {RESEARCH_AREAS.map(area => (
                        <span key={area}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                          style={{ background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.25)', color: '#a78bfa' }}>
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <a href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/"
                    target="_blank" rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 hover:shadow-lg w-full justify-center"
                    style={{ background: '#0077B5' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    View &amp; Follow on LinkedIn
                  </a>
                </div>

                {/* Right */}
                <div className="p-8 md:p-10">
                  <p className="text-slate-300 leading-relaxed mb-5 text-sm">
                    Arijit began his professional journey across some of the world&apos;s most demanding
                    financial and technology environments — HSBC, Reliance, Yes Bank, Murugappa Group,
                    and Qubit Microsystems. Over 19 years, he built AI systems, led data science teams,
                    and served as CTO and CAIO across multiple industries. He currently leads as CAIO
                    at a Global Fintech firm and is Founder of <strong className="text-white">Star Analytix Pvt Ltd</strong>.
                  </p>
                  <p className="text-slate-400 leading-relaxed mb-5 text-sm">
                    His research focuses on Agentic AI, AGI, Quantum Computing, Industrial AI, and
                    AI Defence. He is a Guest Lecturer at IIT Bombay, KJ Somaiya, and NL Dalmia Institute,
                    and a corporate coach for Deloitte, PwC, McKinsey, Capgemini, and Cognizant.
                  </p>
                  <p className="text-slate-400 leading-relaxed mb-8 text-sm">
                    oStaran emerged from his belief that the best AI education isn&apos;t found in textbooks
                    or recorded lectures — it&apos;s built live, in real sessions, with real problems,
                    by people who have solved those problems in the real world. That belief has not
                    changed since April 2020.
                  </p>

                  {/* Credential strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Global Experience',  value: '19 Years',      sub: 'HSBC · Reliance · Yes Bank · Murugappa · Qubit Microsystems · Star Analytix' },
                      { label: 'Guest Lecturer',     value: 'IIT Bombay',    sub: 'KJ Somaiya · NL Dalmia' },
                      { label: 'Corporate Coach',    value: 'Big 4 & MNCs',  sub: 'Deloitte · PwC · McKinsey · Capgemini · Cognizant' },
                      { label: 'Learners Trained',   value: '50,000+',       sub: 'India · USA · Canada' },
                      { label: 'Platform Rating',    value: '4.9 / 5',       sub: 'Verified reviews' },
                      { label: 'Teaching Since',     value: 'April 2020',    sub: 'Live · Every week' },
                    ].map(({ label, value, sub }) => (
                      <div key={label} className="rounded-xl p-3 border"
                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">{label}</p>
                        <p className="text-white font-extrabold text-sm">{value}</p>
                        <p className="text-slate-600 text-[10px] mt-0.5 leading-relaxed">{sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Anonymous trainers note */}
            <div className="mt-6 rounded-2xl border p-5 flex items-start gap-4"
              style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-2xl shrink-0">👥</span>
              <div>
                <p className="text-white font-bold text-sm mb-1">A Team of Expert Trainers</p>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Alongside Arijit, oStaran is supported by a group of experienced AI researchers,
                  practitioners, and domain specialists who contribute to programme design, learner
                  support, and advanced topic delivery. Full team profiles coming soon.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. SENIOR TESTIMONIALS ───────────────────────────────────────── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4 border border-amber-200 bg-amber-50 text-amber-700">
                ⭐ Trusted by Scientists, CXOs &amp; Professors ⭐
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">What Industry Leaders Say</h2>
              <p className="text-gray-500">From ISRO to IIM to Harvard — leaders who&apos;ve seen it all</p>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {SENIORS.map(({ name, role, org, quote, emoji, color }) => (
                <div key={name}
                  className="relative flex flex-col p-7 rounded-3xl border bg-white hover:-translate-y-1 hover:shadow-xl transition-all"
                  style={{ borderColor: `${color}20`, boxShadow: `0 4px 20px ${color}06` }}>
                  <div className="text-5xl font-black leading-none mb-4 opacity-15" style={{ color }}>&ldquo;</div>
                  <p className="text-gray-700 leading-relaxed text-base flex-1 mb-6 italic">&ldquo;{quote}&rdquo;</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${color}12` }}>{emoji}</div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-sm">{name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{role}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color }}>{org}</p>
                    </div>
                  </div>
                  <div className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full"
                    style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. MISSION / VISION / VALUES ────────────────────────────────── */}
        <section className="py-20 px-4" style={{ background: '#070812' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <SectionLabel>What We Stand For</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                Mission, Vision &amp; Values
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* Mission */}
              <div className="p-8 rounded-3xl border" style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }}>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">🎯 Our Mission</p>
                <p className="text-white font-extrabold text-xl leading-tight mb-3">
                  Democratise world-class AI education for every learner — regardless of background, age, or technical experience.
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  From a school student in Nagpur to a CXO in New York — every person who wants to master AI
                  deserves a live trainer, real projects, and a certificate the world recognises.
                </p>
              </div>

              {/* Vision */}
              <div className="p-8 rounded-3xl border" style={{ background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.18)' }}>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">🌍 Our Vision</p>
                <p className="text-white font-extrabold text-xl leading-tight mb-3">
                  An AI-skilled India that competes and leads globally in the age of intelligent machines.
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  The country that produced the world&apos;s top engineers and doctors will produce the
                  world&apos;s top AI practitioners. oStaran is part of making that happen — one live
                  session at a time.
                </p>
              </div>
            </div>

            {/* Values */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {VALUES.map(({ emoji, title, desc }) => (
                <div key={title} className="p-5 rounded-2xl border text-center"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <span className="text-3xl block mb-3">{emoji}</span>
                  <p className="font-bold text-white text-sm mb-2">{title}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 11. COMPANY INFO ─────────────────────────────────────────────── */}
        <section className="py-16 px-4 border-t" style={{ background: '#06080f', borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Legal */}
              <div className="rounded-2xl border p-6" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Company Information</p>
                <div className="space-y-2 text-sm">
                  {[
                    ['Brand',    'oStaran, by Star Analytix Pvt Ltd'],
                    ['Type',     'Private Limited Company, India'],
                    ['Founded',  'April 2020'],
                    ['HQ',       'Mira Road East, Mumbai, Maharashtra, India'],
                    ['GSTIN',    'Applied — GSTIN pending (Star Analytix Pvt Ltd)'],
                    ['Platforms','ostaran.com · partner.ostaran.com · webinar.ostaran.com'],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex gap-3">
                      <span className="text-slate-500 shrink-0 w-20">{k}</span>
                      <span className="text-slate-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="rounded-2xl border p-6" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Contact Us</p>
                <div className="space-y-3 text-sm">
                  <a href="mailto:ai@ostaran.com" className="flex items-center gap-3 text-indigo-400 hover:text-indigo-300 transition-colors">
                    <span className="text-xl">📧</span> ai@ostaran.com
                  </a>
                  <a href="https://wa.me/919930051053" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-green-400 hover:text-green-300 transition-colors">
                    <span className="text-xl">💬</span> +91 99300 51053 (WhatsApp)
                  </a>
                  <a href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-blue-400 hover:text-blue-300 transition-colors">
                    <span className="text-xl">💼</span> LinkedIn — Arijit Chowdhury
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 12. CTA ──────────────────────────────────────────────────────── */}
        <section className="py-20 px-4 text-center"
          style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #1e1b4b 100%)' }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Ready to Join the oStaran Journey?
            </h2>
            <p className="text-indigo-200 text-lg mb-10">
              Three ways to be part of what we&apos;re building.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { emoji: '🎓', label: 'Get Certified', sub: 'This Sunday · 90 min live', href: '/masterclass', bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)', text: 'white' },
                { emoji: '👥', label: 'Enrol Your Team', sub: 'Group & Corporate', href: '/group-enrol', bg: 'linear-gradient(135deg,#0e7490,#0891b2)', text: 'white' },
                { emoji: '🤝', label: 'Become a Partner', sub: 'Free to join', href: 'https://partner.ostaran.com', bg: 'rgba(255,255,255,0.08)', text: '#e2e8f0' },
              ].map(({ emoji, label, sub, href, bg, text }) => (
                <Link key={label} href={href}
                  className="flex flex-col items-center gap-2 p-6 rounded-2xl border border-white/10 font-bold transition-all hover:scale-105 hover:shadow-2xl"
                  style={{ background: bg, color: text }}>
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-base">{label}</span>
                  <span className="text-xs opacity-70 font-normal">{sub}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
