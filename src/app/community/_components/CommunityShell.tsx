'use client'
import { useState, useEffect, useCallback } from 'react'
import { BookOpen } from 'lucide-react'
import { GuestModal }           from './GuestModal'
import { ChannelList }          from './ChannelList'
import { ThreadList }           from './ThreadList'
import { ThreadView }           from './ThreadView'
import { TierBanner }           from './TierBanner'
import { CommunitySidePanel }   from './CommunitySidePanel'
import type { NextWebinar }     from './WebinarCard'
import type { CohortRow }       from './CohortCard'

interface Channel { id: string; slug: string; name: string; description: string; icon: string; sort_order?: number }
interface Member  { id: string; tier: string; expires_at: string | null; display_name: string; points?: number; rank?: string; badges?: string[] }

interface Props {
  channels: Channel[]
  webinar:  NextWebinar | null
  cohorts:  CohortRow[]
}

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

export function CommunityShell({ channels, webinar, cohorts }: Props) {
  const [member,        setMember]        = useState<Member | null>(null)
  const [showGuest,     setShowGuest]     = useState(false)
  const [activeChannel, setActiveChannel] = useState<Channel>(channels[0])
  const [activeThread,  setActiveThread]  = useState<{ id: string; title: string; created_by?: string; is_question?: boolean } | null>(null)
  const [expired,       setExpired]       = useState(false)
  const [focusMsgId,    setFocusMsgId]    = useState<string | null>(null)

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
          .catch(() => {})
      } catch { localStorage.removeItem('community_member') }
    }
  }, [])

  // Deep-link: ?thread=<id> opens that thread directly (optionally ?msg=<id>
  // focuses a specific reply). Without this, LinkedIn/FB share links landed on
  // the default channel's thread list instead of the shared post.
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const threadId = params.get('thread')
    const msgId    = params.get('msg')
    if (!threadId) return
    let cancelled = false
    fetch(`/api/community/thread?id=${encodeURIComponent(threadId)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled || !data?.thread) return
        const t  = data.thread
        const ch = channels.find(c => c.id === t.channel_id)
        if (ch) setActiveChannel(ch)
        setActiveThread({ id: t.id, title: t.title, created_by: t.created_by, is_question: t.is_question })
        if (msgId) setFocusMsgId(msgId)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [channels])

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
  const tier      = member?.tier

  return (
    <div className="flex flex-col overflow-hidden"
      style={{ height: '100dvh', background: '#f6f7f9' }}>

      {/* ─────────────── Top nav ─────────────── */}
      <header className="shrink-0 border-b bg-white"
        style={{ borderBottomColor: '#e5e7eb' }}>
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg,#7c3aed,#a78bfa,transparent)' }} />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <a href="/" className="flex items-center gap-2.5 shrink-0">
              <img src="/ostaran-logo.png" alt="oStaran" className="h-7 object-contain" />
            </a>
            <span style={{ color: '#d1d5db' }} className="text-xl font-thin hidden sm:inline">|</span>
            <span className="text-sm font-semibold hidden sm:inline" style={{ color: '#6b7280' }}>AI Community</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
              style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#10b981' }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#10b981' }} />
              </span>
              Live
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Library quick-link */}
            <a href="/library"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-gray-50"
              style={{ color: '#059669' }}>
              <BookOpen size={14} />
              Library
            </a>
            {member ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ background: rankColor + '18', color: rankColor, border: `1px solid ${rankColor}33` }}>
                  <span className="hidden sm:inline">{member.rank ?? 'Explorer'} · </span>{member.points ?? 0} pts
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap hidden sm:inline-block"
                  style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                  {TIER_LABEL[member.tier] ?? member.tier}
                </span>
                <span className="text-sm font-medium hidden md:inline truncate max-w-[140px]" style={{ color: '#111827' }}>
                  {member.display_name}
                </span>
                <button onClick={handleLeave} className="text-xs transition-colors ml-1 shrink-0 hover:text-gray-600" style={{ color: '#9ca3af' }}>
                  Leave
                </button>
              </div>
            ) : (
              <button onClick={() => setShowGuest(true)}
                className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all hover:opacity-90 hover:translate-y-[-1px]"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                Join Chat
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────── Tier-aware action banner ─────────────── */}
      {/* Hidden on mobile while a thread is open so the conversation + composer
          get the full screen (the banner returns on the thread-list view). */}
      <div className={activeThread ? 'hidden sm:block' : 'block'}>
        <TierBanner tier={tier} displayName={member?.display_name} webinar={webinar} />
      </div>

      {/* ─────────────── Expired notice ─────────────── */}
      {expired && (
        <div className="shrink-0 px-4 py-2.5 text-xs text-center"
          style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d', color: '#92400e' }}>
          Your community access has expired.{' '}
          <a href="/masterclass" className="font-bold underline hover:opacity-80">
            Register for the AI Masterclass
          </a>{' '}
          to continue participating.
        </div>
      )}

      {/* ─────────────── Main layout: channels | threads/thread | side panel ─────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col overflow-hidden min-h-0">

        {/* Mobile chrome (cards strip + channel pills) shows only on the
            thread-LIST view. Once a thread is open it collapses so the
            conversation + composer get the full mobile screen. */}
        {!activeThread && (<>
        {/* Mobile-only horizontal cards strip (webinar / cohort / library). */}
        <CommunitySidePanel
          variant="mobile"
          webinar={webinar}
          cohorts={cohorts}
          tier={tier}
          member={null}
        />

        {/* Mobile channel pills (horizontal scroll) */}
        <nav className="sm:hidden flex overflow-x-auto shrink-0 bg-white border-b px-2 py-2 gap-1.5"
          style={{ borderColor: '#e5e7eb', scrollbarWidth: 'none' }}
          aria-label="Channels">
          {channels.map(ch => {
            const isActive = activeChannel.id === ch.id
            return (
              <button key={ch.id}
                onClick={() => { setActiveChannel(ch); setActiveThread(null); setFocusMsgId(null) }}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all border"
                style={isActive ? {
                  background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                  color: '#fff',
                  borderColor: '#7c3aed',
                  boxShadow: '0 2px 6px rgba(124,58,237,0.25)',
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
        </>)}

        <div className="flex-1 flex overflow-hidden min-h-0">
          <ChannelList channels={channels} active={activeChannel}
            onSelect={ch => { setActiveChannel(ch); setActiveThread(null); setFocusMsgId(null) }} />

          <main className="flex-1 flex flex-col overflow-hidden min-w-0 sm:border-x"
            style={{ borderColor: '#e5e7eb' }}>
            {activeThread ? (
              <ThreadView
                thread={activeThread}
                channel={activeChannel}
                member={member}
                focusMessageId={focusMsgId}
                onBack={() => { setActiveThread(null); setFocusMsgId(null) }}
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

          {/* Right rail — desktop only */}
          <CommunitySidePanel
            variant="desktop"
            webinar={webinar}
            cohorts={cohorts}
            tier={tier}
            member={member ? {
              points: member.points ?? 0,
              rank:   member.rank ?? 'Explorer',
              badges: member.badges ?? [],
            } : null}
          />
        </div>
      </div>

      {showGuest && <GuestModal onJoin={handleJoin} onClose={() => setShowGuest(false)} />}
    </div>
  )
}
