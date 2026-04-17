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

  useEffect(() => {
    const raw = localStorage.getItem('community_member')
    if (raw) {
      try {
        const m = JSON.parse(raw) as Member
        if (m.expires_at && new Date(m.expires_at) < new Date()) {
          localStorage.removeItem('community_member'); setExpired(true)
        } else {
          setMember(m)
        }
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
              <div className="flex items-center gap-2">
                {/* Points pill */}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full hidden sm:block"
                  style={{ background: rankColor + '18', color: rankColor, border: `1px solid ${rankColor}33` }}>
                  {member.rank ?? 'Explorer'} · {member.points ?? 0} pts
                </span>
                {/* Tier badge */}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                  {TIER_LABEL[member.tier] ?? member.tier}
                </span>
                <span className="text-sm font-medium" style={{ color: '#111827' }}>{member.display_name}</span>
                <button onClick={handleLeave} className="text-xs transition-colors ml-1" style={{ color: '#9ca3af' }}>
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

      {/* Main layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex overflow-hidden"
        style={{ height: 'calc(100vh - 57px)' }}>
        {/* Channels sidebar */}
        <ChannelList channels={channels} active={activeChannel}
          onSelect={ch => { setActiveChannel(ch); setActiveThread(null) }} />

        {/* Centre */}
        <main className="flex-1 flex flex-col overflow-hidden border-x" style={{ borderColor: '#e5e7eb' }}>
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

      {showGuest && <GuestModal onJoin={handleJoin} onClose={() => setShowGuest(false)} />}
    </div>
  )
}
