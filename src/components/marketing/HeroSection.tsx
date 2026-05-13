import Link from 'next/link'

// Animated floating AI node for hero background
function AINode({ x, y, delay, size = 4 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <div
      className="absolute rounded-full opacity-20 animate-pulse"
      style={{
        left: `${x}%`, top: `${y}%`,
        width: size, height: size,
        background: 'rgba(139,92,246,0.8)',
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
      className="relative overflow-hidden text-white"
      style={{
        background: 'linear-gradient(135deg, #05051a 0%, #0d0b2b 30%, #1a0a3d 60%, #0d1b3e 100%)',
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
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to bottom, transparent, #05051a)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-20 lg:py-28 w-full">
        <div className="max-w-4xl mx-auto text-center">

          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-8 border"
            style={{
              background: 'rgba(139,92,246,0.15)',
              borderColor: 'rgba(139,92,246,0.4)',
              color: '#c4b5fd',
              letterSpacing: '0.08em',
            }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            INDIA&apos;S AI EDUCATION PLATFORM · 50,000+ CERTIFIED
          </div>

          {/* H1 — SEO optimised */}
          <h1
            className="font-extrabold leading-[1.08] mb-6 tracking-tight"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)' }}
          >
            <span className="text-white">Master AI.</span>
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #a78bfa, #60a5fa, #34d399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Get Certified
            </span>
            <span className="text-white"> This Sunday.</span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed mb-4 max-w-2xl mx-auto"
            style={{ color: '#94a3b8' }}>
            90-minute live AI Certification session. Globally recognised certificate.
            Personalised for your career — not a generic course.
          </p>

          {/* ── Bold hype line — the three pillars of every oStaran programme ── */}
          <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mb-6 px-5 py-3 rounded-2xl font-bold text-sm md:text-base"
            style={{
              background: 'linear-gradient(90deg, rgba(124,58,237,0.18), rgba(79,70,229,0.18), rgba(6,182,212,0.15))',
              border: '1px solid rgba(124,58,237,0.4)',
              color: '#e0e7ff',
              boxShadow: '0 0 32px rgba(124,58,237,0.15)',
            }}>
            <span>🎥 <span className="text-white">Live Classes</span> by Industrial AI Leaders</span>
            <span className="text-indigo-400">·</span>
            <span>🛠️ <span className="text-white">Real Projects</span>, No Toys</span>
            <span className="text-indigo-400">·</span>
            <span style={{ color: '#c4b5fd' }}>🎓 <span className="text-white">Assistant Professor (AI)</span>, 24/7 in 100+ languages</span>
          </div>

          {/* Audience pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              ['💼', 'Working Professionals'],
              ['📚', 'School Students'],
              ['🎓', 'College & Job Seekers'],
              ['💻', 'Tech Developers'],
              ['🏆', 'Business Leaders'],
            ].map(([emoji, label]) => (
              <span key={label as string}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: '#cbd5e1',
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
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff',
                boxShadow: '0 0 40px rgba(124,58,237,0.4)',
              }}
            >
              🎓 Get Certified This Sunday
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base border transition-all hover:bg-white/10"
              style={{
                borderColor: 'rgba(255,255,255,0.2)',
                color: '#e2e8f0',
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
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
                color: '#fff',
                borderColor: 'rgba(251,191,36,0.6)',
                boxShadow: '0 0 40px rgba(245,158,11,0.4)',
                animation: 'pulse-gold 2.5s ease-in-out infinite',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>🤝</span>
              <span>Become an AI Partner</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'rgba(0,0,0,0.18)' }}>
                Earn ₹X / referral
              </span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* Mini trust line */}
          <p className="mt-8 text-xs" style={{ color: '#475569' }}>
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
