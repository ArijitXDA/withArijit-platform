import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'
import {
  Upload, ArrowRight, Sparkles, Bot, Atom, Microscope, Cpu, Briefcase,
  CheckCircle2, Mail, FileText, Globe2, ShieldCheck,
} from 'lucide-react'

export const metadata = {
  title: 'Submit your CV — AI, Agentic AI & Quantum Computing jobs',
  description:
    'Submit your CV and let us match you with AI, Agentic AI, Quantum, AI Research, Hi-Tech and Business Consulting opportunities from our empanelled employers across India, Canada, Western Europe & the USA. Free service, on behalf of oStaran AI Education Platform.',
  alternates: { canonical: 'https://www.ostaran.com/resume' },
  openGraph: {
    title: 'Submit your CV — oStaran AI Employment Repository',
    description:
      'The largest AI-only employment repository across India, Canada, Western Europe & USA. Free for job-seekers and employers.',
    url: 'https://www.ostaran.com/resume',
    type: 'website',
  },
}

// ── The six practice areas we recruit for ──────────────────────────────────
const DOMAINS = [
  { icon: Sparkles,   title: 'Artificial Intelligence', desc: 'ML engineering, applied AI, LLMs, computer vision, NLP.' },
  { icon: Bot,        title: 'Agentic AI',              desc: 'Autonomous agents, tool-use systems, MCP, RAG platforms.' },
  { icon: Atom,       title: 'Quantum Computing',       desc: 'Quantum ML, algorithm design, hybrid classical-quantum.' },
  { icon: Microscope, title: 'AI Research',             desc: 'Research scientists, PhDs, applied research roles.' },
  { icon: Cpu,        title: 'Hi-Tech',                 desc: 'Platform, infra, data, MLOps, and deep-tech product roles.' },
  { icon: Briefcase,  title: 'Business Consulting',     desc: 'AI strategy, transformation, and industry consulting.' },
]

// ── Geographies served ─────────────────────────────────────────────────────
const GEOGRAPHIES = [
  { flag: '🇮🇳', name: 'India'           },
  { flag: '🇨🇦', name: 'Canada'          },
  { flag: '🇪🇺', name: 'Western Europe'  },
  { flag: '🇺🇸', name: 'USA'             },
]

// ── How it works ───────────────────────────────────────────────────────────
const STEPS = [
  {
    n: 1,
    title: 'Submit your CV',
    desc: 'Fill a short form and upload a PDF/DOCX — under two minutes. No payment, no obligation.',
  },
  {
    n: 2,
    title: 'We match against empanelled employers',
    desc: 'Our team screens your profile against live AI, Agentic AI, Quantum and Hi-Tech openings from vetted employers.',
  },
  {
    n: 3,
    title: 'We get back to you',
    desc: 'When a role fits, we introduce you personally — full-time, internship, or consulting. You choose what moves forward.',
  },
]

export default function ResumeLandingPage() {
  return (
    <div>

      {/* ─────────────────────────────────────────────────────────────────────
          HERO
          ───────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-900 text-white pt-20 pb-24 px-4">
        {/* decorative dots */}
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* soft glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
               style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.35)', color: '#c7d2fe' }}>
            <FileText size={12} /> oStaran AI Employment Repository
          </div>

          <h1 className="text-[40px] leading-[1.05] md:text-6xl md:leading-[1.02] font-extrabold mb-6 tracking-tight">
            Submit your CV.<br />
            <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
              Let the right AI job find you.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Share your CV and we&apos;ll get back to you with suitable <strong className="text-white">jobs, internships and consulting opportunities</strong> that match our empanelled employers&apos; requirements.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/resume/apply"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'bg-indigo-500 hover:bg-indigo-400 text-white px-8 h-12 text-base'
              )}
            >
              <Upload className="mr-2 h-4 w-4" />
              Submit your CV
            </Link>
            <Link
              href="#how-it-works"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-white/20 bg-white/5 text-white hover:bg-white/10 h-12 text-base'
              )}
            >
              How it works
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center mt-8 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-400" /> Free for job-seekers</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-400" /> Takes about 2 minutes</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-400" /> Your data stays private</span>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          AUTHORITY STRIP — the largest AI-only repository
          ───────────────────────────────────────────────────────────────── */}
      <section className="relative -mt-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-xl"
               style={{
                 background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
                 border: '1px solid #dce6f5',
               }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <Globe2 size={22} className="text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
                The largest AI-only employment repository
              </p>
              <p className="text-sm md:text-base text-gray-700">
                Across <strong>India</strong>, <strong>Canada</strong>, <strong>Western Europe</strong> and the <strong>USA</strong> — focused exclusively on AI, Agentic AI, Quantum Computing, AI Research, Hi-Tech and Business Consulting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          DOMAINS — 6 practice areas
          ───────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">What we recruit for</p>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900">Six practice areas. One focus: AI.</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOMAINS.map(d => {
              const Icon = d.icon
              return (
                <div key={d.title}
                  className="group p-6 rounded-2xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors"
                       style={{ background: '#eef2ff' }}>
                    <Icon size={20} className="text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-base mb-1.5 text-gray-900">{d.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{d.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          GEOGRAPHIES
          ───────────────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">Where we place talent</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Four geographies. Opportunities everywhere.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {GEOGRAPHIES.map(g => (
              <div key={g.name}
                className="p-5 rounded-2xl border border-gray-200 bg-white text-center hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="text-3xl mb-2" aria-hidden>{g.flag}</div>
                <p className="font-bold text-sm text-gray-900">{g.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          HOW IT WORKS — 3 steps
          ───────────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">How it works</p>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900">Three steps. No noise.</h2>
          </div>

          <div className="relative space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative p-6 md:p-7 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                    {s.n}
                  </div>
                  <h3 className="font-bold text-base md:text-lg text-gray-900 pt-2">{s.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          FREE FOR BOTH SIDES
          ───────────────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl p-8 md:p-10 text-center"
               style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #eef2ff 100%)', border: '1px solid #c7d2fe' }}>
            <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5"
                 style={{ background: '#fff', border: '1px solid #c7d2fe' }}>
              <ShieldCheck size={22} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              A free service. For everyone.
            </h2>
            <p className="text-gray-700 md:text-lg leading-relaxed max-w-2xl mx-auto">
              oStaran runs this repository on behalf of the <strong>oStaran AI Education Platform</strong> — free for both job-seekers and employers. No placement fees, no subscription, no paywalls. We do this because AI talent and AI roles deserve a specialist channel.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          BEHIND IT — who we are
          ───────────────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <Sparkles size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 mb-1">Run by oStaran AI Education Platform</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                We train working professionals and fresh talent in AI, Agentic AI and Quantum Computing — so we already know what employers need, and what candidates are capable of. This repository is how we close the loop.
              </p>
            </div>
            <Link href="/about"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500 shrink-0">
              Learn about us <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          BOTTOM CTA
          ───────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 px-4 bg-gradient-to-br from-indigo-900 via-indigo-950 to-gray-950 text-white">
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-5 leading-tight">
            Your next AI role<br />starts with your CV.
          </h2>
          <p className="text-gray-300 mb-9 max-w-xl mx-auto text-base md:text-lg">
            Two minutes to submit. Real opportunities back from real employers. Always free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/resume/apply"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'bg-indigo-500 hover:bg-indigo-400 text-white px-10 h-12 text-base'
              )}
            >
              Submit your CV <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="mailto:careers@ostaran.com?subject=Employer%20enquiry%20%E2%80%94%20AI%20Employment%20Repository"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-white/20 bg-white/5 text-white hover:bg-white/10 h-12 text-base'
              )}
            >
              <Mail className="mr-2 h-4 w-4" /> Hiring? Talk to us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
