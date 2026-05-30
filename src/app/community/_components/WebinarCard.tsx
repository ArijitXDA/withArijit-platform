'use client'
// ─────────────────────────────────────────────────────────────────────────────
// WebinarCard — right-rail card promoting the next free webinar.
//
// Personalises by `member.tier`:
//   • guest / null         → "Save my seat" (registration CTA)
//   • webinar (registered) → "You're in" + Add-to-calendar + (live link when imminent)
//   • enrolled / admin     → hidden (they don't need to re-register)
//
// Falls back gracefully if no webinar is scheduled.
// ─────────────────────────────────────────────────────────────────────────────

import { Calendar, Clock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface NextWebinar {
  id:                 string
  webinar_date:       string  // 'YYYY-MM-DD'
  webinar_time:       string  // 'HH:MM:SS'
  course_short_name:  string | null
  course_name:        string | null
  status:             string | null
}

interface Props {
  webinar: NextWebinar | null
  tier:    string | undefined  // 'guest' | 'webinar' | 'enrolled' | 'admin' | undefined
  compact?: boolean             // horizontal layout (mobile carousel)
}

function fmtDate(iso: string) {
  // 'May 17, Sun'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', weekday: 'short' })
}

function fmtTime(t: string) {
  // '11:00:00' → '11:00 AM'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function WebinarCard({ webinar, tier, compact }: Props) {
  // Live ticker — re-render every minute so the "in 3h 22m" countdown updates
  const [, force] = useState(0)
  useEffect(() => { const id = setInterval(() => force(n => n + 1), 60_000); return () => clearInterval(id) }, [])

  // Enrolled students don't see this card
  if (tier === 'enrolled' || tier === 'admin') return null

  if (!webinar) {
    return (
      <div className="rounded-2xl p-4 border" style={{ background: '#fff', borderColor: '#e5e7eb' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Next webinar</p>
        <p className="text-sm" style={{ color: '#6b7280' }}>No session scheduled yet — check back soon.</p>
      </div>
    )
  }

  const isRegistered = tier === 'webinar'
  const start = new Date(`${webinar.webinar_date}T${webinar.webinar_time}+05:30`)
  const ms    = start.getTime() - Date.now()
  const mins  = Math.floor(ms / 60_000)
  const isLive       = ms <= 0 && ms > -90 * 60_000   // within 90 min after start
  const isImminent   = mins > 0 && mins <= 60          // < 1 hour to start
  const isToday      = mins > 0 && mins <= 24 * 60     // < 24 hours to start

  let countdown = ''
  if (isLive) {
    countdown = 'Live now'
  } else if (mins > 0) {
    const h = Math.floor(mins / 60); const m = mins % 60
    if (h === 0)       countdown = `in ${m}m`
    else if (h < 24)   countdown = `in ${h}h ${m}m`
    else               countdown = `in ${Math.floor(h / 24)}d`
  }

  // Accent stack — different colour for "live now" vs "imminent" vs "future"
  const accent = isLive     ? '#dc2626'
              :  isImminent ? '#ea580c'
              :  isToday    ? '#7c3aed'
              :              '#6366f1'
  const bgGrad = isLive
    ? 'linear-gradient(135deg,#fef2f2,#fff)'
    : 'linear-gradient(135deg,#f5f3ff,#fff)'

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all hover:shadow-lg ${compact ? 'min-w-[260px]' : ''}`}
      style={{ background: bgGrad, borderColor: accent + '33' }}
    >
      {/* Top accent line */}
      <div className="h-0.5" style={{ background: `linear-gradient(90deg,${accent},${accent}66,transparent)` }} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accent }}>
            <Calendar size={11} />
            {isLive ? 'Live now' : isToday ? 'Webinar today' : 'Next free webinar'}
          </p>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: accent }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: accent }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              </span>
              LIVE
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-bold leading-snug mb-2" style={{ color: '#111827' }}>
          {webinar.course_short_name ?? 'AI Certification Webinar'}
        </p>

        {/* Date / time */}
        <div className="flex items-center gap-3 text-xs mb-3" style={{ color: '#4b5563' }}>
          <span className="flex items-center gap-1">
            <Calendar size={12} style={{ color: '#9ca3af' }} />
            {fmtDate(webinar.webinar_date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} style={{ color: '#9ca3af' }} />
            {fmtTime(webinar.webinar_time)} IST
          </span>
        </div>

        {/* Countdown chip */}
        {countdown && !isLive && (
          <div
            className="text-[11px] font-bold inline-block px-2 py-0.5 rounded-full mb-3"
            style={{ background: accent + '15', color: accent, border: `1px solid ${accent}33` }}
          >
            Starts {countdown}
          </div>
        )}

        {/* CTA */}
        {isRegistered ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#059669' }}>
              <CheckCircle2 size={14} />
              You're registered
            </div>
            {(isLive || isImminent) ? (
              <a href="/dashboard" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg,${accent},${accent}dd)`, color: '#fff' }}>
                Join now <ArrowRight size={12} />
              </a>
            ) : (
              <a href="/dashboard" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border hover:bg-white"
                style={{ borderColor: accent + '55', color: accent, background: 'transparent' }}>
                View details <ArrowRight size={12} />
              </a>
            )}
          </div>
        ) : (
          <a href="/masterclass" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 hover:translate-y-[-1px]"
            style={{ background: `linear-gradient(135deg,${accent},${accent}dd)`, color: '#fff', boxShadow: `0 4px 12px ${accent}33` }}>
            Save my seat <ArrowRight size={12} />
          </a>
        )}
      </div>
    </div>
  )
}
