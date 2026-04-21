import Link from 'next/link'
import { Sparkles, Video, Award, Globe, BookOpen, MessageCircle, CheckCircle2, ArrowRight } from 'lucide-react'

// ────────────────────────────────────────────────────────────────────────────
// AssistantProfessorUpgrade
// Shown to signed-in users who don't have an active PAID enrolment yet.
// Keeps the sidebar/top-nav intact (this is rendered inside (student)/layout.tsx)
// so users still feel signed in — they just see an upgrade path, not the chat.
// ────────────────────────────────────────────────────────────────────────────

const T = {
  border:      '#dce6f5',
  borderLight: '#e8f0fc',
  navy:        '#0f1f3d',
  blue:        '#2563eb',
  indigo:      '#4f46e5',
  purple:      '#7c3aed',
  blueLight:   '#eff6ff',
  bluePale:    '#dbeafe',
  textPrimary: '#0f1f3d',
  textSec:     '#475569',
  textMuted:   '#94a3b8',
}

const BENEFITS = [
  { icon: MessageCircle, title: '24/7 personal AI professor',       desc: 'Explain concepts, walk through code, answer questions from any session — anytime.' },
  { icon: Globe,         title: 'Chat in 100+ languages',           desc: 'English, Hindi, Bengali, Tamil, Telugu, Marathi, Kannada, Spanish, Mandarin, and more.' },
  { icon: BookOpen,      title: 'Knows your curriculum',            desc: 'Trained on your exact course materials, sessions, and batch schedule.' },
  { icon: Video,         title: 'Live cohort sessions',             desc: 'Weekly live classes with Arijit and industry mentors — not pre-recorded videos.' },
  { icon: Award,         title: 'Industry-recognised certificate',  desc: 'GST invoice for business expense claim. Trusted by 500+ Indian companies.' },
  { icon: Sparkles,      title: 'Tailored to your background',      desc: 'Career-specific programmes: Sales, Marketing, HR, CXO, Pharma, Startups, and more.' },
]

export default function AssistantProfessorUpgrade({ firstName }: { firstName: string }) {
  return (
    <div className="max-w-3xl space-y-5 pb-12">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, #4c1d95 0%, #4f46e5 50%, #7c3aed 100%)`,
          boxShadow: '0 4px 24px rgba(124,58,237,0.22)',
        }}
      >
        {/* decorative dots */}
        <div className="absolute inset-0 opacity-15"
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative px-6 py-8 md:px-10 md:py-10 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#ddd6fe' }}>
                Locked — enrol to unlock
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold">
                Hi {firstName}, meet your Assistant Professor
              </h1>
            </div>
          </div>

          <p className="text-base md:text-lg mb-6 max-w-xl" style={{ color: '#ede9fe' }}>
            Your own AI professor — available 24/7, in 100+ languages, trained on your exact course materials. Bundled free with every oStaran programme.
          </p>

          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:shadow-lg"
            style={{ background: 'white', color: '#4f46e5' }}
          >
            Browse courses <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* ── What's included ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border p-6 md:p-8" style={{ borderColor: T.border }}>
        <h2 className="text-lg font-extrabold mb-1" style={{ color: T.navy }}>
          What enrolment unlocks
        </h2>
        <p className="text-sm mb-5" style={{ color: T.textSec }}>
          Everything below is included at no extra cost — your Assistant Professor is one of six core benefits.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {BENEFITS.map(b => {
            const Icon = b.icon
            return (
              <div key={b.title} className="flex gap-3 p-4 rounded-xl"
                   style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: 'white', border: `1px solid ${T.bluePale}` }}>
                  <Icon size={16} style={{ color: T.indigo }} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm mb-0.5" style={{ color: T.navy }}>{b.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: T.textSec }}>{b.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Sample conversation preview ──────────────────────────────────── */}
      <div className="rounded-2xl bg-white border p-6 md:p-8" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={16} style={{ color: T.indigo }} />
          <h2 className="text-base font-extrabold" style={{ color: T.navy }}>
            Preview: what a session looks like
          </h2>
        </div>

        <div className="space-y-3">
          {/* User bubble */}
          <div className="flex justify-end">
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm"
                 style={{ background: T.indigo, color: 'white', borderBottomRightRadius: '6px' }}>
              Explain RAG to me like I'm a product manager, not an engineer.
            </div>
          </div>

          {/* Assistant bubble */}
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})` }}>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm"
                 style={{ background: T.blueLight, color: T.textPrimary, borderBottomLeftRadius: '6px' }}>
              <p className="mb-2"><strong>RAG = Retrieval-Augmented Generation.</strong> Think of it like giving an LLM a study guide before asking it a question.</p>
              <p className="mb-2"><strong>The PM framing:</strong> LLMs are frozen in time (training cutoff) and don&apos;t know your company&apos;s docs. RAG fixes both — it searches your data first, then hands those snippets to the LLM before it answers.</p>
              <p><strong>Example use case for your work:</strong> a support bot that knows your exact product docs, release notes, and customer tickets — answers grounded in your data, not generic web trivia.</p>
            </div>
          </div>
        </div>

        {/* Gated input */}
        <div className="mt-5 p-4 rounded-xl flex items-center gap-3 border-2 border-dashed"
             style={{ borderColor: T.bluePale, background: T.blueLight }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: 'white', border: `1px solid ${T.bluePale}` }}>
            🔒
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: T.indigo }}>
              Chat unlocks with any oStaran course
            </p>
            <p className="text-xs" style={{ color: T.textSec }}>
              Includes GST invoice · business-expense claimable
            </p>
          </div>
          <Link
            href="/courses"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: T.indigo }}
          >
            Browse courses <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* ── Already enrolled? ───────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 border flex items-start gap-3"
           style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
        <CheckCircle2 size={18} style={{ color: '#b45309' }} className="shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: '#b45309' }}>Recently enrolled?</p>
          <p className="text-xs mt-0.5" style={{ color: '#92400e' }}>
            It can take up to a few hours for your enrolment to sync. If it&apos;s been more than that, drop us a line at{' '}
            <a href="mailto:support@ostaran.com" className="underline font-semibold">support@ostaran.com</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
