import Link from 'next/link'
import type { Metadata } from 'next'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'
import { Upload, Sparkles, GraduationCap, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Share Your Resume — Get Matched to the Right AI Course',
  description:
    'Upload your resume. We tailor AI course recommendations to your background and onboard you to the oStaran community — India\'s most active AI learning platform.',
  keywords: [
    'AI course for my background',
    'resume based AI course recommendation',
    'best AI course for professionals India',
    'oStaran AI education',
    'AI upskilling India',
  ],
  alternates: { canonical: 'https://www.ostaran.com/resume' },
  openGraph: {
    title: 'Share Your Resume · oStaran',
    description: 'Get tailored AI course recommendations. Onboard to India\'s most active AI learning community in minutes.',
    url: 'https://www.ostaran.com/resume',
  },
}

const STEPS = [
  {
    n: 1,
    icon: Upload,
    title: 'Share your resume',
    body: 'Upload a PDF or Word file, or paste the text. 2 minutes. No account needed yet.',
  },
  {
    n: 2,
    icon: Sparkles,
    title: 'We read & personalise',
    body: 'Our AI reads your background and tailors the right course pathway for your career stage.',
  },
  {
    n: 3,
    icon: GraduationCap,
    title: 'Sign up & start',
    body: 'Verify your email, land in your student dashboard, and pick the batch that fits your schedule.',
  },
]

const WHO_FITS = [
  { emoji: '🎓', label: 'College students & final-year freshers' },
  { emoji: '💼', label: 'Working professionals switching to AI' },
  { emoji: '🧠', label: 'Senior consultants going deeper into Agentic AI & Quantum' },
  { emoji: '🏠', label: 'Career returners & pivoters' },
]

export default function ResumeLandingPage() {
  return (
    <div className="bg-white">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f1f3d 0%,#1e3a8a 60%,#4f46e5 100%)' }}>
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
               style={{ background: 'rgba(255,255,255,0.12)', color: '#bfdbfe', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Sparkles size={14} /> For anyone figuring out their AI learning path
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight mb-5">
            Share your résumé.<br />
            <span style={{ color: '#fcd34d' }}>Find your AI learning path.</span>
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8" style={{ color: '#cbd5e1' }}>
            Get an AI course pathway tailored to your actual background — and onboard to the
            oStaran community where India&apos;s practitioners are upskilling for the AI era.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/resume/apply"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-base transition-all hover:scale-[1.02]"
              style={{ background: '#fcd34d', color: '#0f1f3d', boxShadow: '0 6px 24px rgba(252,211,77,0.3)' }}
            >
              Share My Résumé →
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              Browse Courses
            </Link>
          </div>

          <p className="text-xs mt-6" style={{ color: 'rgba(203,213,225,0.7)' }}>
            Free · Takes 2 minutes · No payment · No spam
          </p>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#4f46e5' }}>How it works</p>
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#0f1f3d' }}>
            Three steps. No friction.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map(({ n, icon: Icon, title, body }) => (
            <div key={n} className="rounded-2xl p-6 border bg-white transition-all hover:shadow-md hover:-translate-y-0.5"
                 style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                     style={{ background: '#eef2ff', border: '1px solid #e0e7ff' }}>
                  <Icon size={20} style={{ color: '#4f46e5' }} />
                </div>
                <div className="text-5xl font-black" style={{ color: '#f3f4f6' }}>
                  {n}
                </div>
              </div>
              <h3 className="font-bold text-lg mb-1.5" style={{ color: '#0f1f3d' }}>{title}</h3>
              <p className="text-sm" style={{ color: '#64748b' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who this is for ───────────────────────────────────────────── */}
      <section className="py-20" style={{ background: '#f8faff' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#4f46e5' }}>Who this is for</p>
            <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#0f1f3d' }}>
              Anyone figuring out AI — at any stage.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {WHO_FITS.map(({ emoji, label }) => (
              <div key={label} className="rounded-2xl px-5 py-4 bg-white border flex items-center gap-4"
                   style={{ borderColor: '#e5e7eb' }}>
                <div className="text-3xl shrink-0">{emoji}</div>
                <p className="font-semibold text-sm" style={{ color: '#1e293b' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-5 rounded-2xl"
             style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
          <div className="flex items-center gap-2">
            <Users size={18} style={{ color: '#4f46e5' }} />
            <span className="text-sm font-semibold" style={{ color: '#0f1f3d' }}>50,000+ learners certified</span>
          </div>
          <div className="hidden md:block w-px h-5" style={{ background: '#cbd5e1' }} />
          <div className="text-sm font-semibold" style={{ color: '#0f1f3d' }}>⭐ 4.9 platform rating</div>
          <div className="hidden md:block w-px h-5" style={{ background: '#cbd5e1' }} />
          <div className="text-sm font-semibold" style={{ color: '#0f1f3d' }}>🇮🇳 Founded Mumbai, 2020</div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="rounded-3xl p-10 md:p-14 text-center"
             style={{ background: 'linear-gradient(135deg,#4c1d95 0%,#4f46e5 60%,#7c3aed 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
            Ready to get your AI course pathway?
          </h2>
          <p className="text-base md:text-lg mb-7 max-w-xl mx-auto" style={{ color: '#ddd6fe' }}>
            Upload your résumé and we&apos;ll take it from there.
          </p>
          <Link
            href="/resume/apply"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-transform hover:scale-[1.03]"
            style={{ background: '#fcd34d', color: '#0f1f3d', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
          >
            Share My Résumé →
          </Link>
          <p className="text-xs mt-5" style={{ color: 'rgba(221,214,254,0.7)' }}>
            Your data is private. We never sell it. <Link href="/privacy" className="underline hover:text-white">Read our privacy policy.</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
