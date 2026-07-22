import { Sparkles, Globe2, ShieldCheck, Users } from 'lucide-react'
import { formatUsd } from '@/lib/consultationUsd'

export function ConsultationHero({
  fromRate,
  freeAttendees,
  checkoutEnabled = false,
}: {
  fromRate: number | null
  freeAttendees: number
  checkoutEnabled?: boolean
}) {
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #1e1b4b 100%)' }}
    >
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: '#7c3aed' }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: '#4f46e5' }}
      />

      <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-20">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border"
          style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', borderColor: 'rgba(124,58,237,0.4)' }}
        >
          <Sparkles size={15} /> For Corporates, Founders &amp; CXOs
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-5">
          Book a slot with an Industrial Agentic&nbsp;AI Expert
        </h1>
        <p className="text-lg md:text-xl text-indigo-200 max-w-2xl mb-8">
          One-on-one and small-team consultations on real AI projects — from agentic AI
          development and system design to quantum AI, data-centre strategy and governance.
          Priced in USD, scheduled in your own timezone.
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
            <Globe2 size={13} /> Your local timezone
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
            <Users size={13} /> Up to {freeAttendees} attendees included
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
            <ShieldCheck size={13} /> Optional session recording
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {fromRate != null && (
            <div className="px-7 py-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <p className="text-xs text-indigo-300 uppercase tracking-widest mb-1">Starting from</p>
              <p className="text-5xl font-black text-white leading-none">
                {formatUsd(fromRate)}
                <span className="text-2xl font-bold text-indigo-300">/hour</span>
              </p>
            </div>
          )}
          {checkoutEnabled ? (
            <div className="flex flex-col items-start gap-2">
              <a
                href="#book"
                className="inline-flex items-center justify-center px-7 py-4 rounded-xl bg-white text-indigo-900 text-base font-bold hover:bg-indigo-50 transition-colors shadow-lg"
              >
                See pricing &amp; book →
              </a>
              <a href="#enquiry" className="text-sm font-semibold text-indigo-200 hover:text-white transition-colors">
                Prefer to talk first? Enquire →
              </a>
            </div>
          ) : (
            <a
              href="#enquiry"
              className="inline-flex items-center justify-center px-7 py-4 rounded-xl bg-white text-indigo-900 text-base font-bold hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Request your consultation →
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
