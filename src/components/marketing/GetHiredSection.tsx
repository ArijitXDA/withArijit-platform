import Link from 'next/link'
import { Target, Search, ArrowRight, CheckCircle } from 'lucide-react'

/**
 * Get Discovered & Get Hired — surfaces the placement/recruiter marketplace.
 *
 * Pays off the "95% Placement Rate" claim in the TrustBar with a real mechanism:
 *  • Learners  → submit a resume once, get matched to AI roles (/find-ai-job → /resume/apply)
 *  • Recruiters → search certified AI talent by skill/location/experience (/recruit)
 */
export function GetHiredSection() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div
          className="rounded-3xl overflow-hidden p-10 md:p-14"
          style={{ background: 'linear-gradient(135deg, #04111a, #06251f, #0a2233)' }}
        >
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-5">
              Placement &amp; Hiring
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Get Certified. Get Discovered.{' '}
              <span style={{
                background: 'linear-gradient(135deg, #34d399, #22d3ee)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Get Hired.
              </span>
            </h2>
            <p className="text-emerald-100/80 text-lg leading-relaxed">
              <strong className="text-white">95% of our learners are placement-ready.</strong> Submit your
              resume once and get matched to AI, agentic-AI &amp; quantum roles across our hiring-partner
              network — or, if you&apos;re hiring, search certified AI talent directly.
            </p>
          </div>

          {/* Two-sided cards */}
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">

            {/* For learners */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-7 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-5">
                <Target size={22} className="text-emerald-300" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Looking for an AI role?</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-5">
                Submit your resume once — we match you to AI roles opening across our hiring-partner network
                and point you to the programme that bridges any gap.
              </p>
              <ul className="space-y-2 mb-7">
                {['One resume, many opportunities', 'Free — no payment needed', 'Your data stays private'].map(t => (
                  <li key={t} className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle size={15} className="text-emerald-400 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/find-ai-job"
                className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 transition-colors"
              >
                Get discovered — submit your resume <ArrowRight size={15} />
              </Link>
            </div>

            {/* For recruiters */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-7 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-5">
                <Search size={22} className="text-cyan-300" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Hiring AI-ready talent?</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-5">
                Search certified AI candidates by skill, location, experience, education and compensation —
                straight from our pool of trained, job-ready learners.
              </p>
              <ul className="space-y-2 mb-7">
                {['50,000+ certified candidates', 'Filter by skill, location & experience', 'Post roles, get matched applicants'].map(t => (
                  <li key={t} className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle size={15} className="text-cyan-400 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
              <a
                href="/recruit"
                className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-cyan-950 bg-cyan-400 hover:bg-cyan-300 transition-colors"
              >
                Browse AI talent — for recruiters <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
