'use client'
// ─────────────────────────────────────────────────────────────────────────────
// CohortCard — right-rail card promoting paid course enrolment.
//
// Variant-aware: shows Weekend9 vs Long26 tabs so a visitor sees both options
// side-by-side. Uses `v_anaant_cohort_fill_forecast` rows to surface live fill
// % and "Almost full" social proof.
//
// Hidden for already-enrolled members.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { GraduationCap, ArrowRight, Users, Flame } from 'lucide-react'

export interface CohortRow {
  batch_id:        string
  batch_code:      string
  label:           string
  variant:         string         // 'weekend9' | 'long26'
  day_of_week:     string
  start_date:      string
  start_time:      string
  max_seats:       number
  seats_filled:    number
  fill_pct:        number | string | null
  days_to_start:   number
  status_note:     string
}

interface Props {
  cohorts: CohortRow[]
  tier:    string | undefined
  compact?: boolean
}

const VARIANTS: Array<{ key: 'weekend9' | 'long26'; label: string; sub: string; accent: string }> = [
  { key: 'weekend9', label: 'Weekend 9-wk',  sub: 'Saturday or Sunday',  accent: '#7c3aed' },
  { key: 'long26',   label: 'Long 26-wk',    sub: 'Weekday evenings',    accent: '#0ea5e9' },
]

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export function CohortCard({ cohorts, tier, compact }: Props) {
  const [tab, setTab] = useState<'weekend9' | 'long26'>('weekend9')

  // Group cohorts by variant — keep only future-start, fastest-filling first
  const byVariant = useMemo(() => {
    const groups: Record<string, CohortRow[]> = { weekend9: [], long26: [] }
    for (const c of cohorts) {
      if (c.days_to_start < 0) continue
      if (groups[c.variant]) groups[c.variant].push(c)
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => {
        const pa = Number(a.fill_pct ?? 0), pb = Number(b.fill_pct ?? 0)
        if (pb !== pa) return pb - pa            // higher fill first (social proof)
        return a.days_to_start - b.days_to_start // sooner first
      })
    }
    return groups
  }, [cohorts])

  if (tier === 'enrolled' || tier === 'admin') return null

  const top = byVariant[tab]?.slice(0, 2) ?? []
  const variant = VARIANTS.find(v => v.key === tab)!

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all hover:shadow-lg ${compact ? 'min-w-[280px]' : ''}`}
      style={{ background: 'linear-gradient(135deg,#fafaff,#fff)', borderColor: '#e5e7eb' }}>
      <div className="h-0.5" style={{ background: `linear-gradient(90deg,${variant.accent},${variant.accent}66,transparent)` }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: variant.accent }}>
            <GraduationCap size={11} />
            AI Mastery Programme
          </p>
        </div>

        {/* Variant tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: '#f3f4f6' }}>
          {VARIANTS.map(v => {
            const active = v.key === tab
            return (
              <button key={v.key} onClick={() => setTab(v.key)}
                className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={active
                  ? { background: '#fff', color: v.accent, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                  : { background: 'transparent', color: '#6b7280' }
                }>
                {v.label}
              </button>
            )
          })}
        </div>

        <p className="text-[10px] mb-3" style={{ color: '#9ca3af' }}>{variant.sub}</p>

        {/* Top cohort(s) */}
        {top.length === 0 && (
          <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
            No open batches yet. Check back soon or register interest below.
          </p>
        )}
        <div className="space-y-2 mb-3">
          {top.map(c => {
            const pct  = Math.min(100, Math.round(Number(c.fill_pct ?? 0)))
            const hot  = pct >= 80
            return (
              <div key={c.batch_id} className="rounded-xl p-2.5 border"
                style={{ background: '#fff', borderColor: '#f3f4f6' }}>
                <div className="flex items-start justify-between mb-1.5">
                  <p className="text-[11px] font-bold leading-tight" style={{ color: '#111827' }}>
                    {c.day_of_week} · starts {fmtDate(c.start_date)}
                  </p>
                  {hot && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: '#fff7ed', color: '#c2410c' }}>
                      <Flame size={9} /> Almost full
                    </span>
                  )}
                </div>
                {/* Fill bar */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: '#f3f4f6' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: hot ? 'linear-gradient(90deg,#f97316,#dc2626)' : `linear-gradient(90deg,${variant.accent},${variant.accent}99)`,
                    }} />
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1" style={{ color: '#6b7280' }}>
                  <span className="flex items-center gap-0.5"><Users size={9} />{c.seats_filled}/{c.max_seats} seats</span>
                  <span>{pct}% full</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <a href="/courses" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 hover:translate-y-[-1px]"
          style={{ background: `linear-gradient(135deg,${variant.accent},${variant.accent}dd)`, color: '#fff', boxShadow: `0 4px 12px ${variant.accent}33` }}>
          {tier === 'webinar' ? 'See attendee pricing' : 'Explore programmes'}
          <ArrowRight size={12} />
        </a>
      </div>
    </div>
  )
}
