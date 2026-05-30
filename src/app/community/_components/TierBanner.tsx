'use client'
// ─────────────────────────────────────────────────────────────────────────────
// TierBanner — single-line, tier-aware "next step" banner shown above the
// main thread area. Converts community traffic into action by surfacing the
// most relevant CTA for who's reading.
//
//   • guest               → register for next free webinar
//   • webinar (registered) → countdown + add-to-calendar
//   • enrolled            → cohort start info / dashboard link
//   • admin               → silent (no banner)
//
// Dismissible per-session via localStorage so it doesn't nag.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { Sparkles, X, ArrowRight, CalendarCheck, Flame } from 'lucide-react'
import type { NextWebinar } from './WebinarCard'

interface Props {
  tier:           string | undefined
  displayName:    string | undefined
  webinar:        NextWebinar | null
}

const DISMISS_KEY = 'community_tier_banner_dismissed_v1'

function fmtDateShort(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function TierBanner({ tier, displayName, webinar }: Props) {
  const [dismissed, setDismissed] = useState(true) // start dismissed until hydration

  useEffect(() => {
    setDismissed(typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  if (dismissed || tier === 'admin') return null

  // Build the right message
  let icon: React.ReactNode = <Sparkles size={14} />
  let text:   React.ReactNode = null
  let href:   string = '/masterclass'
  let cta:    string = 'Register'
  let bg              = 'linear-gradient(90deg,#7c3aed,#6366f1)'

  if (tier === 'enrolled') {
    icon = <CalendarCheck size={14} />
    text = <>Welcome back{displayName ? `, ${displayName.split(' ')[0]}` : ''} — your dashboard has cohort details & live sessions.</>
    href = '/dashboard'
    cta  = 'Open dashboard'
    bg   = 'linear-gradient(90deg,#059669,#0ea5e9)'
  } else if (tier === 'webinar' && webinar) {
    const start = new Date(`${webinar.webinar_date}T${webinar.webinar_time}+05:30`)
    const ms    = start.getTime() - Date.now()
    const hrs   = Math.floor(ms / 3_600_000)
    const isToday = hrs >= 0 && hrs < 24
    icon = <Flame size={14} />
    text = isToday
      ? <>You're in for today's webinar at {fmtTime(webinar.webinar_time)} IST. See you in the room.</>
      : <>You're in for <b>{fmtDateShort(webinar.webinar_date)}, {fmtTime(webinar.webinar_time)} IST</b>. Add it to your calendar so you don't miss it.</>
    href = '/dashboard'
    cta  = isToday ? 'Get ready' : 'View details'
    bg   = isToday ? 'linear-gradient(90deg,#ea580c,#dc2626)' : 'linear-gradient(90deg,#7c3aed,#6366f1)'
  } else if (webinar) {
    // guest / null
    text = <>Join the next free webinar — <b>{fmtDateShort(webinar.webinar_date)}, {fmtTime(webinar.webinar_time)} IST</b>. 90 min, hands-on, live.</>
    cta  = 'Save my seat'
  } else {
    text = <>Welcome to the oStaran AI community — explore threads, ask Ask Ari, climb the leaderboard.</>
    cta  = 'Explore courses'
    href = '/courses'
    bg   = 'linear-gradient(90deg,#0ea5e9,#7c3aed)'
  }

  return (
    <div className="shrink-0 px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 text-white"
      style={{ background: bg }}>
      <div className="shrink-0 hidden sm:flex w-7 h-7 rounded-full items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.18)' }}>
        {icon}
      </div>
      <p className="flex-1 text-[12px] sm:text-[13px] leading-snug min-w-0 truncate sm:whitespace-normal">{text}</p>
      <a href={href}
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all hover:shadow-md hover:translate-y-[-1px]"
        style={{ background: '#fff', color: '#1f2937' }}>
        {cta} <ArrowRight size={11} />
      </a>
      <button onClick={() => { sessionStorage.setItem(DISMISS_KEY, '1'); setDismissed(true) }}
        aria-label="Dismiss"
        className="shrink-0 p-1 rounded-md transition-colors hover:bg-white/15"
        style={{ color: 'rgba(255,255,255,0.8)' }}>
        <X size={14} />
      </button>
    </div>
  )
}
