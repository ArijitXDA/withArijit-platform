import Image from 'next/image'

const CREDENTIALS = [
  {
    label: 'Global Corporate Experience',
    value: '19 Years',
    sub:   'HSBC · Reliance · Yes Bank · Murugappa · Qubit Microsystems · Star Analytix',
  },
  {
    label: 'Current Role',
    value: 'CAIO & Founder',
    sub:   'Global Fintech Firm · Star Analytix Pvt Ltd',
  },
  {
    label: 'Guest Lecturer',
    value: 'IIT Bombay',
    sub:   'KJ Somaiya · NL Dalmia Institute',
  },
  {
    label: 'Corporate Coach',
    value: 'Big 4 & MNCs',
    sub:   'Deloitte · PwC · McKinsey · Capgemini · Cognizant',
  },
  {
    label: 'Learners Trained',
    value: '50,000+',
    sub:   'India · USA · Canada',
  },
  {
    label: 'Platform Rating',
    value: '4.9 / 5',
    sub:   'From verified learner reviews',
  },
]

const RESEARCH_AREAS = [
  'Agentic AI',
  'AGI',
  'Quantum Computing',
  'Industrial AI',
  'AI Defence',
]

export function CourseTrainer() {
  return (
    <section className="py-16 px-4" style={{ background: '#06080f' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white mb-2">Your Trainer</h2>
          <p className="text-slate-500 text-sm">
            The person who will personally teach every single live session
          </p>
        </div>

        <div
          className="rounded-3xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div className="grid md:grid-cols-[260px_1fr]">

            {/* ── Left: Photo + identity ──────────────────────────────────────── */}
            <div
              className="flex flex-col items-center justify-start pt-8 pb-8 px-8 text-center border-b md:border-b-0 md:border-r"
              style={{
                borderColor: 'rgba(255,255,255,0.07)',
                background:  'rgba(79,70,229,0.06)',
              }}
            >
              {/* Photo */}
              <div className="relative mb-4">
                <Image
                  src="/arijit-image.png"
                  alt="Arijit Chowdhury"
                  width={128}
                  height={128}
                  className="w-32 h-32 rounded-full object-cover object-top border-2"
                  style={{ borderColor: 'rgba(139,92,246,0.5)' }}
                />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-black flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>

              {/* Name */}
              <p className="font-extrabold text-white text-xl leading-tight">
                Arijit Chowdhury
              </p>

              {/* Primary title */}
              <p className="text-indigo-400 text-xs mt-1 font-semibold">
                CAIO · AI Educator · Entrepreneur
              </p>

              {/* Research tag */}
              <p className="text-slate-500 text-xs mt-1">Mumbai, India 🇮🇳</p>

              {/* Research & Trainer areas */}
              <div className="mt-4 w-full">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Researcher &amp; Trainer
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {RESEARCH_AREAS.map(area => (
                    <span
                      key={area}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{
                        background:  'rgba(139,92,246,0.12)',
                        borderColor: 'rgba(139,92,246,0.25)',
                        color:       '#a78bfa',
                      }}
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* LinkedIn button */}
              <a
                href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 hover:shadow-lg w-full justify-center"
                style={{ background: '#0077B5' }}
              >
                {/* LinkedIn icon inline SVG */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                View &amp; Follow on LinkedIn
              </a>
            </div>

            {/* ── Right: Bio + credentials ──────────────────────────────────── */}
            <div className="p-8">
              <p className="text-slate-300 leading-relaxed mb-6 text-sm">
                Arijit Chowdhury is one of India&apos;s most sought-after AI educators,
                researchers, and corporate trainers. With 19 years of global experience spanning
                HSBC, Reliance, Yes Bank, Murugappa Group, Qubit Microsystems, and Star Analytix —
                and current roles as CAIO at a Global Fintech and Founder of Star Analytix Pvt Ltd —
                he brings deep, real-world AI expertise into every live session.
              </p>
              <p className="text-slate-400 leading-relaxed mb-7 text-sm">
                His research spans Agentic AI, AGI, Quantum Computing, Industrial AI, and AI Defence.
                As Guest Lecturer at IIT Bombay and corporate coach for Deloitte, PwC, McKinsey,
                Capgemini, and Cognizant, Arijit has trained 50,000+ learners across India, USA,
                and Canada. He doesn&apos;t use slides or pre-recorded content — everything is built
                live, from scratch, in front of you.
              </p>

              {/* Credential grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CREDENTIALS.map(({ label, value, sub }) => (
                  <div
                    key={label}
                    className="rounded-xl p-3 border"
                    style={{
                      background:  'rgba(255,255,255,0.02)',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">
                      {label}
                    </p>
                    <p className="text-white font-extrabold text-sm">{value}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
