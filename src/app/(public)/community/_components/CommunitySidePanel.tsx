'use client'
// ─────────────────────────────────────────────────────────────────────────────
// CommunitySidePanel — stacks the right-rail content on desktop and renders
// it as a horizontal-scrollable cards strip on mobile.
//
// Desktop (lg+):  vertical column to the right of threads
//   • WebinarCard      (hidden for enrolled/admin)
//   • CohortCard       (hidden for enrolled/admin)
//   • LeaderboardPanel (existing — points / ranks / earn)
//   • LibraryTile
//
// Mobile (< lg):  horizontal strip between top nav and channel pills, shows
//   • WebinarCard · CohortCard · LibraryTile
//   (Leaderboard remains desktop-only — points are visible in the top nav.)
// ─────────────────────────────────────────────────────────────────────────────

import { WebinarCard, type NextWebinar } from './WebinarCard'
import { CohortCard, type CohortRow }    from './CohortCard'
import { LibraryTile }                   from './LibraryTile'
import { LeaderboardPanel }              from './LeaderboardPanel'

interface Member { points: number; rank: string; badges: string[] }

interface Props {
  webinar:    NextWebinar | null
  cohorts:    CohortRow[]
  tier:       string | undefined
  member:     Member | null
  variant:    'desktop' | 'mobile'
}

export function CommunitySidePanel({ webinar, cohorts, tier, member, variant }: Props) {
  if (variant === 'mobile') {
    return (
      <div className="lg:hidden shrink-0 px-3 py-2 overflow-x-auto bg-white border-b"
        style={{ borderColor: '#e5e7eb', scrollbarWidth: 'none' }}>
        <div className="flex gap-2.5 snap-x snap-mandatory">
          <div className="snap-start"><WebinarCard webinar={webinar} tier={tier} compact /></div>
          <div className="snap-start"><CohortCard  cohorts={cohorts} tier={tier} compact /></div>
          <div className="snap-start"><LibraryTile compact /></div>
        </div>
      </div>
    )
  }

  return (
    <aside className="hidden lg:flex w-72 flex-col overflow-y-auto py-5 px-4 gap-4 shrink-0 border-l"
      style={{ background: '#fafafa', borderColor: '#e5e7eb' }}>
      <WebinarCard webinar={webinar} tier={tier} />
      <CohortCard  cohorts={cohorts} tier={tier} />
      <LeaderboardPanel member={member} />
      <LibraryTile />
    </aside>
  )
}
