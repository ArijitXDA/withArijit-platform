'use client'
import { useState, useEffect, useCallback } from 'react'
import { GuestModal }    from './GuestModal'
import { ChannelList }   from './ChannelList'
import { ThreadList }    from './ThreadList'
import { ThreadView }    from './ThreadView'
import { AskAriBadge }  from './AskAriBadge'

interface Channel { id: string; slug: string; name: string; description: string; icon: string; sort_order: number }
interface Member  { id: string; tier: string; expires_at: string | null; display_name: string }

interface Props { channels: Channel[] }

export function CommunityShell({ channels }: Props) {
  const [member,      setMember]      = useState<Member | null>(null)
  const [showGuest,   setShowGuest]   = useState(false)
  const [activeChannel, setActiveChannel] = useState<Channel>(channels[0])
  const [activeThread,  setActiveThread]  = useState<{ id: string; title: string } | null>(null)
  const [expired,     setExpired]     = useState(false)

  // Restore session from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('community_member')
    if (raw) {
      try {
        const m = JSON.parse(raw) as Member
        if (m.expires_at && new Date(m.expires_at) < new Date()) {
          localStorage.removeItem('community_member')
          setExpired(true)
        } else {
          setMember(m)
        }
      } catch { localStorage.removeItem('community_member') }
    }
  }, [])

  const handleJoin = useCallback((m: Member) => {
    setMember(m)
    localStorage.setItem('community_member', JSON.stringify(m))
    setShowGuest(false)
  }, [])

  const handleExpired = useCallback(() => {
    setMember(null)
    localStorage.removeItem('community_member')
    setExpired(true)
  }, [])

  const handleLeave = useCallback(() => {
    setMember(null)
    localStorage.removeItem('community_member')
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-indigo-700 tracking-tight">oStaran</span>
            <span className="text-gray-300 text-xl font-thin">|</span>
            <span className="text-sm font-semibold text-gray-600">Community</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">🟢 Live</span>
          </div>
          <div className="flex items-center gap-3">
            <AskAriBadge />
            {member ? (
              <div className="flex items-center gap-2">
                <TierBadge tier={member.tier} />
                <span className="text-sm text-gray-700 font-medium">{member.display_name}</span>
                <button onClick={handleLeave} className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1">Leave</button>
              </div>
            ) : (
              <button
                onClick={() => setShowGuest(true)}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                Join Chat
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Expired banner */}
      {expired && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-800 text-center">
          Your community access has expired.{' '}
          <a href="https://www.ostaran.com/masterclass" className="font-bold underline hover:text-amber-900">
            Register for the AI Masterclass
          </a>{' '}
          to continue participating.
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex gap-0 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Left: channels */}
        <ChannelList
          channels={channels}
          active={activeChannel}
          onSelect={ch => { setActiveChannel(ch); setActiveThread(null) }}
        />

        {/* Centre: threads or thread view */}
        <main className="flex-1 flex flex-col overflow-hidden border-x border-gray-100">
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

        {/* Right: info panel */}
        <aside className="hidden lg:flex w-64 flex-col bg-white border-l border-gray-100 p-4 gap-4 overflow-y-auto">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">About Ask Ari</p>
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
              <p className="text-sm font-semibold text-indigo-800 mb-1">🤖 Ask Ari</p>
              <p className="text-xs text-indigo-600 leading-relaxed">AI research assistant. Answers questions, proactively chimes in on discussions, always ≤30 words. Tag with <code className="bg-indigo-100 px-1 rounded">@AskAri</code> for an instant reply.</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Access Tiers</p>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-start gap-2"><TierBadge tier="guest" small /><span><b>Guest</b> — 60 days (email + WhatsApp)</span></div>
              <div className="flex items-start gap-2"><TierBadge tier="webinar" small /><span><b>Webinar / Masterclass</b> — 30 days from registration</span></div>
              <div className="flex items-start gap-2"><TierBadge tier="enrolled" small /><span><b>Enrolled Student</b> — Lifetime access</span></div>
            </div>
          </div>
          <div>
            <a href="https://www.ostaran.com/masterclass"
              className="block w-full text-center px-3 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">
              Get AI Certified →
            </a>
          </div>
        </aside>
      </div>

      {/* Guest modal */}
      {showGuest && <GuestModal onJoin={handleJoin} onClose={() => setShowGuest(false)} />}
    </div>
  )
}

function TierBadge({ tier, small }: { tier: string; small?: boolean }) {
  const cfg: Record<string, { label: string; bg: string; text: string }> = {
    guest:    { label: 'Guest',    bg: 'bg-gray-100',    text: 'text-gray-600' },
    webinar:  { label: 'Webinar',  bg: 'bg-blue-100',    text: 'text-blue-700' },
    enrolled: { label: 'Student',  bg: 'bg-green-100',   text: 'text-green-700' },
    admin:    { label: 'Admin',    bg: 'bg-purple-100',  text: 'text-purple-700' },
  }
  const c = cfg[tier] ?? cfg.guest
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full font-bold ${small ? 'text-[10px]' : 'text-xs'} ${c.bg} ${c.text} shrink-0`}>
      {c.label}
    </span>
  )
}
