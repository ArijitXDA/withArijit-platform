import Link from 'next/link'
import { LaunchCourseCTA } from '@/components/marketing/LaunchCourseCTA'

// Animated floating AI node for hero background
function AINode({ x, y, delay, size = 4 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <div
      className="absolute rounded-full opacity-20 animate-pulse"
      style={{
        left: `${x}%`, top: `${y}%`,
        width: size, height: size,
        background: 'var(--os-node)',
        animationDelay: `${delay}s`,
        animationDuration: `${2 + delay}s`,
      }}
    />
  )
}

const NODES = [
  [8,15,0.2,3],[15,60,0.8,5],[92,20,0.4,4],[88,70,1.2,3],[50,8,0.6,6],
  [72,45,0.3,3],[25,85,1.0,4],[60,92,0.7,5],[35,30,1.5,3],[80,10,0.1,4],
  [5,50,0.9,5],[45,75,0.5,3],[95,55,1.3,4],[20,95,0.2,6],[70,28,0.8,3],
]

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: 'var(--os-hero-bg)',
        color: 'var(--os-ink)',
        minHeight: '88vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Animated background — AI network nodes */}
      <div className="absolute inset-0 overflow-hidden">
        {NODES.map(([x, y, delay, size], i) => (
          <AINode key={i} x={x as number} y={y as number} delay={delay as number} size={size as number} />
        ))}
        {/* Grid overlay */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(var(--os-grid) 1px, transparent 1px), linear-gradient(90deg, var(--os-grid) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--os-glow) 0%, transparent 70%)' }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--os-page))' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-20 lg:py-28 w-full">
        <div className="max-w-4xl mx-auto text-center">

          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-8 border"
            style={{
              background: 'var(--os-surface)',
              borderColor: 'var(--os-pill-line)',
              color: 'var(--os-accent-soft)',
              boxShadow: 'var(--os-sh-3d)',
              letterSpacing: '0.08em',
            }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            INDIA&apos;S AI EDUCATION PLATFORM · 50,000+ CERTIFIED
          </div>

          {/* H1 — SEO optimised */}
          <h1
            className="font-extrabold leading-[1.08] mb-6 tracking-tight"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', color: 'var(--os-ink)' }}
          >
            <span>Master AI.</span>
            <br />
            <span style={{
              background: 'var(--os-head-grad)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Get Certified
            </span>
            <span> This Sunday.</span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed mb-4 max-w-2xl mx-auto"
            style={{ color: 'var(--os-ink-2)' }}>
            90-minute live AI Certification session. Globally recognised certificate.
            Personalised for your career — not a generic course.
          </p>

          {/* ── Bold hype line — the three pillars of every oStaran programme ── */}
          <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mb-6 px-5 py-3 rounded-2xl font-bold text-sm md:text-base"
            style={{
              background: 'var(--os-surface)',
              border: '1px solid var(--os-pill-line)',
              color: 'var(--os-ink)',
              boxShadow: 'var(--os-sh-3d)',
            }}>
            <span>🎥 <b>Live Classes</b> by Industrial AI Leaders</span>
            <span style={{ color: 'var(--os-accent)' }}>·</span>
            <span>🛠️ <b>Real Projects</b>, No Toys</span>
            <span style={{ color: 'var(--os-accent)' }}>·</span>
            <span>🎓 <b>Assistant Professor (AI)</b>, 24/7 in 100+ languages</span>
          </div>

          {/* Audience pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              ['💼', 'Working Professionals'],
              ['🎓', 'College & Job Seekers'],
              ['🚀', 'Entrepreneurs & Owners'],
              ['🏆', 'Business Leaders'],
              ['🏡', 'Homemakers & Returners'],
              ['💻', 'Tech Developers'],
              ['🔬', 'Engineers & Researchers'],
              ['📚', 'School Students'],
            ].map(([emoji, label]) => (
              <span key={label as string}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                style={{
                  background: 'var(--os-surface)',
                  borderColor: 'var(--os-pill-line)',
                  color: 'var(--os-ink-2)',
                  boxShadow: 'var(--os-sh-sm)',
                }}>
                {emoji} {label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/masterclass"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all hover:scale-105 hover:shadow-2xl"
              style={{
                background: 'var(--os-cta-grad)',
                color: '#fff',
                boxShadow: 'var(--os-sh-btn)',
              }}
            >
              🎓 Get Certified This Sunday
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base border transition-all hover:scale-105"
              style={{
                background: 'var(--os-surface)',
                borderColor: 'var(--os-pill-line)',
                color: 'var(--os-ink)',
                boxShadow: 'var(--os-sh-3d)',
              }}
            >
              Explore Full Programmes →
            </Link>
          </div>

          {/* Become an AI Partner — distinctive gold CTA for the earning-side audience */}
          <div className="mt-8 flex justify-center">
            <Link
              href="https://partner.ostaran.com"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all hover:scale-105 hover:shadow-2xl border-2"
              style={{
                background: 'var(--os-gold-grad)',
                color: '#fff',
                borderColor: 'rgba(251,191,36,0.6)',
                boxShadow: 'var(--os-sh-gold)',
                animation: 'pulse-gold 2.5s ease-in-out infinite',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>🤝</span>
              <span>Become an AI Partner</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'rgba(0,0,0,0.18)' }}>
                Earn up to 30% / referral
              </span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* Launch your course — pink neon CTA for professors (opens a how-it-works modal) */}
          <LaunchCourseCTA />

          {/* Mini trust line */}
          <p className="mt-8 text-xs" style={{ color: 'var(--os-faint)' }}>
            🔒 Secured by Razorpay · GST Invoice Issued · Certificate within 24 hours
          </p>

          {/* Gold-pulse keyframe for the partner CTA */}
          <style>{`
            @keyframes pulse-gold {
              0%, 100% { box-shadow: 0 0 40px rgba(245,158,11,0.4), 0 0 0 0 rgba(245,158,11,0.25); }
              50%      { box-shadow: 0 0 60px rgba(245,158,11,0.6), 0 0 0 12px rgba(245,158,11,0); }
            }
          `}</style>
        </div>
      </div>
    </section>
  )
}
