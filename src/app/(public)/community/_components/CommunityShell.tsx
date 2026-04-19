'use client'
import { useState, useEffect, useCallback } from 'react'
import { GuestModal }        from './GuestModal'
import { ChannelList }       from './ChannelList'
import { ThreadList }        from './ThreadList'
import { ThreadView }        from './ThreadView'
import { LeaderboardPanel }  from './LeaderboardPanel'
import Image                 from 'next/image'

interface Channel { id: string; slug: string; name: string; description: string; icon: string; sort_order?: number }
interface Member  { id: string; tier: string; expires_at: string | null; display_name: string; points?: number; rank?: string; badges?: string[] }

interface Props { channels: Channel[] }

const RANK_COLORS: Record<string, string> = {
  Explorer:        '#94a3b8',
  Practitioner:    '#60a5fa',
  Analyst:         '#a78bfa',
  Specialist:      '#34d399',
  Mentor:          '#f59e0b',
  'Thought Leader':'#f97316',
}
const TIER_LABEL: Record<string, string> = {
  guest: 'Guest', webinar: 'Webinar', enrolled: 'Student', admin: 'Admin',
}

export function CommunityShell({ channels }: Props) {
  const [member,        setMember]        = useState<Member | null>(null)
  const [showGuest,     setShowGuest]     = useState(false)
  const [activeChannel, setActiveChannel] = useState<Channel>(channels[0])
  const [activeThread,  setActiveThread]  = useState<{ id: string; title: string; created_by?: string; is_question?: boolean } | null>(null)
  const [expired,       setExpired]       = useState(false)

  // Restore session from localStorage, then refresh points from server
  useEffect(() => {
    const raw = localStorage.getItem('community_member')
    if (raw) {
      try {
        const m = JSON.parse(raw) as Member
        if (m.expires_at && new Date(m.expires_at) < new Date()) {
          localStorage.removeItem('community_member'); setExpired(true); return
        }
        setMember(m)
        // Refresh points/rank/badges from server (localStorage may be stale)
        fetch(`/api/community/me?member_id=${m.id}`)
          .then(r => r.json())
          .then(data => {
            if (data.expired) { localStorage.removeItem('community_member'); setExpired(true); return }
            if (data.member) {
              const fresh = { ...m, points: data.member.points, rank: data.member.rank, badges: data.member.badges }
              setMember(fresh)
              localStorage.setItem('community_member', JSON.stringify(fresh))
            }
          })
          .catch(() => {}) // silently fail — stale data is fine
      } catch { localStorage.removeItem('community_member') }
    }
  }, [])

  const handleJoin = useCallback((m: Member) => {
    setMember(m); localStorage.setItem('community_member', JSON.stringify(m)); setShowGuest(false)
  }, [])

  const handleExpired = useCallback(() => {
    setMember(null); localStorage.removeItem('community_member'); setExpired(true)
  }, [])

  const handleLeave = useCallback(() => {
    setMember(null); localStorage.removeItem('community_member')
  }, [])

  const rankColor = RANK_COLORS[member?.rank ?? 'Explorer'] ?? '#94a3b8'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f6f7f9' }}>
      {/* Top nav — oStaran dark theme */}
      <header className="sticky top-0 z-30 border-b bg-white"
        style={{ borderBottomColor: '#e5e7eb' }}>
        {/* Violet accent line */}
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg,#7c3aed,#a78bfa,transparent)' }} />
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* oStaran logo */}
            <a href="/" className="flex items-center gap-2.5">
              <img src="/ostaran-logo.png" alt="oStaran" className="h-7 object-contain" />
            </a>
            <span style={{ color: '#d1d5db' }} className="text-xl font-thin">|</span>
            <span className="text-sm font-semibold" style={{ color: '#6b7280' }}>AI Community</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
              🟢 Live
            </span>
          </div>
          <div className="flex items-center gap-3">
            {member ? (
              <div className="flex items-center gap-2 min-w-0">
                {/* Points pill — compact on mobile (just points), full "Rank · N pts" on sm+ */}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ background: rankColor + '18', color: rankColor, border: `1px solid ${rankColor}33` }}>
                  <span className="hidden sm:inline">{member.rank ?? 'Explorer'} · </span>{member.points ?? 0} pts
                </span>
                {/* Tier badge */}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                  {TIER_LABEL[member.tier] ?? member.tier}
                </span>
                {/* Display name — hidden on xs to save header space */}
                <span className="text-sm font-medium hidden sm:inline truncate max-w-[140px]" style={{ color: '#111827' }}>
                  {member.display_name}
                </span>
                <button onClick={handleLeave} className="text-xs transition-colors ml-1 shrink-0" style={{ color: '#9ca3af' }}>
                  Leave
                </button>
              </div>
            ) : (
              <button onClick={() => setShowGuest(true)}
                className="px-4 py-1.5 text-sm font-bold rounded-lg transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>
                Join Chat
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Expired banner */}
      {expired && (
        <div className="px-4 py-3 text-sm text-center"
          style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d', color: '#92400e' }}>
          Your community access has expired.{' '}
          <a href="https://www.ostaran.com/masterclass" className="font-bold underline hover:opacity-80">
            Register for the AI Masterclass
          </a>{' '}
          to continue participating.
        </div>
      )}

      {/* Main layout ─ outer column holds the optional mobile channel strip
          on top (mobile only) plus the horizontal row (desktop) / fullwidth
          main (mobile) below. Uses 100dvh so iOS Safari's collapsible URL
          bar doesn't cut off the bottom. min-h-0 on the inner row is
          critical so flex-col children can actually shrink. */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col overflow-hidden"
        style={{ height: 'calc(100dvh - 57px)' }}>

        {/* Mobile-only channel strip ─ horizontal scrolling pills above main */}
        <nav className="sm:hidden flex overflow-x-auto shrink-0 bg-white border-b px-2 py-2 gap-1.5"
          style={{ borderColor: '#e5e7eb', scrollbarWidth: 'none' }}
          aria-label="Channels">
          {channels.map(ch => {
            const isActive = activeChannel.id === ch.id
            return (
              <button key={ch.id}
                onClick={() => { setActiveChannel(ch); setActiveThread(null) }}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all border"
                style={isActive ? {
                  background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                  color: '#fff',
                  borderColor: '#7c3aed',
                } : {
                  background: '#fff',
                  color: '#6b7280',
                  borderColor: '#e5e7eb',
                }}>
                <span>{ch.icon}</span>
                <span>#{ch.slug}</span>
              </button>
            )
          })}
        </nav>

        {/* Row: sidebar (sm+) | main | leaderboard (lg+) */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <ChannelList channels={channels} active={activeChannel}
            onSelect={ch => { setActiveChannel(ch); setActiveThread(null) }} />

          {/* Centre */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0 sm:border-x"
            style={{ borderColor: '#e5e7eb' }}>
            {activeThread ? (
              <ThreadView
                thread={activeThread}
                member={member}
                onBack={() => setActiveThread(null)}
                onNeedJoin={() => setShowGuest(true)}
                onExpired={handleExpired}
              />
            ) : (
              <ThreadList
                channel={activeChannel}
                member={member}
                onSelectThread={setActiveThread}
                onNeedJoin={() => setShowGuest(true)}
                onExpired={handleExpired}
              />
            )}
          </main>

          {/* Right: leaderboard + points */}
          <LeaderboardPanel member={member ? {
            points: member.points ?? 0,
            rank:   member.rank ?? 'Explorer',
            badges: member.badges ?? [],
          } : null} />
        </div>
      </div>

      {showGuest && <GuestModal onJoin={handleJoin} onClose={() => setShowGuest(false)} />}
    </div>
  )
}
