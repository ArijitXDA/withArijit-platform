import Link from 'next/link'
import { Video, Users, Globe2, Clock, ChevronRight } from 'lucide-react'
import { formatUsd } from '@/lib/consultationUsd'

interface ConsultationCardProps {
  // Lowest fixed per-hour USD rate across the active project types; null → quote-only.
  fromRate: number | null
}

// Expert Consultation is NOT a cohort course — it's a per-hour, USD-priced 1:1/team
// advisory with its own booking flow. This card matches the course-grid visual language
// but links to /expert-consultation and shows real USD pricing (never "Free"/a fake rating).
const ACCENT = '#4338ca'
const BG = '#eef2ff'

export function ConsultationCard({ fromRate }: ConsultationCardProps) {
  return (
    <Link
      href="/expert-consultation"
      className="group relative flex flex-col rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-transparent bg-white"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Accent top bar */}
      <div className="h-1.5 w-full transition-all duration-300 group-hover:h-2"
        style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}99)` }} />

      {/* Header */}
      <div className="p-5 pb-3" style={{ background: BG }}>
        <div className="flex items-start justify-between gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{ background: `${ACCENT}18`, border: `1.5px solid ${ACCENT}30` }}>
            <Video size={20} style={{ color: ACCENT }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 mt-0.5"
            style={{ color: ACCENT, background: `${ACCENT}12`, borderColor: `${ACCENT}25` }}>
            1:1 Advisory
          </span>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Founders, teams &amp; leaders</p>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5 pt-3">
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-indigo-700 transition-colors">
          Expert Consultation &mdash; AI Projects
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">
          One-on-one and team sessions with an industrial Agentic AI expert &mdash; Agentic AI, quantum AI,
          data-centre &amp; governance, BI and custom projects.
        </p>

        {/* Info pills */}
        <div className="flex items-center gap-2 flex-wrap mb-4 mt-auto">
          <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            <Users size={11} className="text-gray-400" /> 1:1 or small-group
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            <Globe2 size={11} className="text-gray-400" /> In your timezone
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            <Clock size={11} className="text-gray-400" /> Book by project
          </span>
        </div>

        {/* Footer: price + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 leading-none mb-0.5">{fromRate != null ? 'Starting from' : 'Pricing'}</p>
            <p className="text-xl font-extrabold" style={{ color: ACCENT }}>
              {fromRate != null ? (
                <>
                  {formatUsd(fromRate)}
                  <span className="text-xs font-medium text-gray-400"> / hour</span>
                </>
              ) : (
                'Custom quote'
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold transition-all duration-200 group-hover:gap-2"
            style={{ color: ACCENT }}>
            Book a session <ChevronRight size={16} />
          </div>
        </div>
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `0 0 0 2px ${ACCENT}40, 0 20px 60px ${ACCENT}15` }} />
    </Link>
  )
}
