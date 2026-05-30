'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Send, Loader2, ThumbsUp, Award, MessageSquare, ArrowDown, ChevronRight } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { renderContent } from './renderContent'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RANKS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  'Explorer':       { label: 'Explorer',       color: '#6b7280', bg: '#f3f4f6', icon: '🔭' },
  'Practitioner':   { label: 'Practitioner',   color: '#2563eb', bg: '#eff6ff', icon: '🛠' },
  'Analyst':        { label: 'Analyst',         color: '#7c3aed', bg: '#f5f3ff', icon: '📊' },
  'Specialist':     { label: 'Specialist',      color: '#059669', bg: '#ecfdf5', icon: '⚡' },
  'Mentor':         { label: 'Mentor',          color: '#d97706', bg: '#fffbeb', icon: '🏆' },
  'Thought Leader': { label: 'Thought Leader', color: '#ea580c', bg: '#fff7ed', icon: '🌟' },
}

interface Message {
  id: string; content: string; is_ask_ari: boolean; created_at: string
  upvote_count: number; is_best_answer: boolean; my_upvote?: boolean
  member: { id: string; display_name: string; tier: string; points?: number; rank?: string }
}

interface NewsItem {
  title?: string; source?: string; url?: string; summary?: string; significance?: string
}

interface Origin {
  title:        string
  is_question:  boolean
  created_at:   string
  creator:      { id: string; display_name: string; tier: string; rank?: string; points?: number } | null
  body:         string | null
  news_items:   NewsItem[] | null
  linkedin_url: string | null
  slot:         string | null
  is_news:      boolean
}

interface Member { id: string; tier: string; display_name: string }
interface Props {
  thread:     { id: string; title: string; created_by?: string; is_question?: boolean }
  channel:    { id: string; slug: string; name: string; icon: string }
  member:     Member | null
  focusMessageId?: string | null
  onBack:     () => void
  onNeedJoin: () => void
  onExpired:  () => void
}

export function ThreadView({ thread, channel, member, focusMessageId, onBack, onNeedJoin, onExpired }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [origin,   setOrigin]   = useState<Origin | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState('')
  const [atBottom, setAtBottom] = useState(true)
  const [unread,   setUnread]   = useState(0)
  const bottomRef    = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  const focusRef     = useRef<HTMLDivElement>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  // Smooth-scroll to the latest message. 'instant' for initial load to
  // avoid a visible jump; 'smooth' for live updates.
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior, block: 'end' }), 50)
  }, [])

  // Track whether the user is currently near the bottom of the list.
  // If they've scrolled up to read older messages, we must NOT yank them
  // back when a new message arrives.
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const isNearBottom = distanceFromBottom < 140
    setAtBottom(isNearBottom)
    if (isNearBottom) setUnread(0)
  }, [])

  const loadMessages = useCallback(async () => {
    const res  = await fetch(`/api/community/messages?thread_id=${thread.id}&limit=80${member ? `&member_id=${member.id}` : ''}`)
    const data = await res.json()
    const msgs = data.messages ?? []
    setOrigin(data.origin ?? null)
    setMessages(msgs)
    setLoading(false)
    prevCountRef.current = msgs.length
    // Always scroll to bottom on initial load so user sees latest.
    scrollToBottom('auto')
    setAtBottom(true)
    setUnread(0)
  }, [thread.id, member, scrollToBottom])

  useEffect(() => { loadMessages() }, [loadMessages])

  // Deep-link focus: once messages load, scroll to + briefly highlight the
  // message named in ?msg=<id> (the specific post/reply that was shared).
  useEffect(() => {
    if (loading || !focusMessageId) return
    if (!messages.some(m => m.id === focusMessageId)) return
    const t = setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightId(focusMessageId)
      setTimeout(() => setHighlightId(null), 2600)
    }, 150)
    return () => clearTimeout(t)
  }, [loading, focusMessageId, messages])

  // On new messages: if user is at bottom, auto-scroll. If they're reading
  // older messages (scrolled up), increment the unread counter so they see
  // a "N new messages ↓" pill instead of being yanked to the bottom.
  useEffect(() => {
    if (loading) return
    const prev = prevCountRef.current
    const next = messages.length
    if (next <= prev) { prevCountRef.current = next; return }

    const incoming = next - prev
    prevCountRef.current = next

    // Detect whether the new message is from the current member — if so,
    // always scroll (they just posted and want to see their own message).
    const last = messages[next - 1]
    const ownPost = last && member && last.member?.id === member.id

    if (atBottom || ownPost) {
      scrollToBottom('smooth')
    } else {
      setUnread(u => u + incoming)
    }
  }, [messages, loading, atBottom, member, scrollToBottom])

  useEffect(() => {
    const channel = supabase
      .channel(`thread-${thread.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `thread_id=eq.${thread.id}` },
        async () => {
          // Refresh the whole thread payload. The server now decides which
          // message (if any) gets promoted into origin.body, so we can't
          // safely just append a single row here — the server's reply list
          // may exclude a message the realtime event told us about.
          const res  = await fetch(`/api/community/messages?thread_id=${thread.id}&limit=80${member ? `&member_id=${member.id}` : ''}`)
          const data = await res.json()
          setOrigin(data.origin ?? null)
          setMessages(data.messages ?? [])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [thread.id, member])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    if (!member) { onNeedJoin(); return }
    setSending(true); setError('')
    const res  = await fetch('/api/community/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: thread.id, member_id: member.id, content: text.trim() }),
    })
    const data = await res.json()
    if (data.expired) { onExpired(); return }
    if (!res.ok) { setError(data.error || 'Failed to send'); setSending(false); return }
    setText(''); setSending(false)
  }

  async function handleUpvote(msgId: string) {
    if (!member) { onNeedJoin(); return }
    const res  = await fetch('/api/community/upvote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: msgId, member_id: member.id }),
    })
    const data = await res.json()
    if (data.expired) { onExpired(); return }
    setMessages(prev => prev.map(m => m.id === msgId
      ? { ...m, upvote_count: m.upvote_count + (data.upvoted ? 1 : -1), my_upvote: data.upvoted }
      : m))
  }

  async function handleBestAnswer(msgId: string) {
    if (!member) return
    await fetch('/api/community/best-answer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: thread.id, message_id: msgId, member_id: member.id }),
    })
    setMessages(prev => prev.map(m => ({ ...m, is_best_answer: m.id === msgId })))
  }

  const shareUrl  = `https://www.ostaran.com/community?thread=${thread.id}`
  const shareText = `💬 Join me in this discussion on oStaran AI Community:\n\n"${thread.title}"`

  const isThreadOwner = member?.id === (thread as any).created_by

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Sticky breadcrumb header — clear back-out path. The icon-only arrow
          before was too easy to miss; this row makes the way home obvious and
          gives mobile users a thumb target for "back to channel". */}
      <div className="sticky top-0 z-10 shrink-0 border-b backdrop-blur-md"
        style={{ background: 'rgba(255,255,255,0.92)', borderColor: '#e5e7eb' }}>
        <div className="px-3 sm:px-4 py-2 flex items-center gap-1.5 text-xs min-w-0">
          {/* Back chip — text + icon for unmistakable affordance */}
          <button onClick={onBack}
            className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold transition-all hover:bg-gray-100 shrink-0"
            style={{ color: '#7c3aed' }}>
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Back to channel</span>
            <span className="sm:hidden">Back</span>
          </button>
          <ChevronRight size={12} className="shrink-0" style={{ color: '#d1d5db' }} />
          {/* Channel — also clickable, returns to threadlist via same onBack */}
          <button onClick={onBack}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg font-medium transition-colors hover:bg-gray-100 shrink-0 max-w-[40vw] sm:max-w-none truncate"
            style={{ color: '#6b7280' }}
            title={`#${channel.slug}`}>
            <span>{channel.icon}</span>
            <span className="truncate">#{channel.slug}</span>
          </button>
          <ChevronRight size={12} className="shrink-0 hidden sm:inline" style={{ color: '#d1d5db' }} />
          {/* Current thread title (truncated) */}
          <span className="hidden sm:inline truncate font-medium" style={{ color: '#111827' }}>
            {thread.title}
          </span>
          {/* Ask-Ari hint pushed to the right when space allows */}
          <span className="ml-auto hidden lg:inline text-[10px] shrink-0" style={{ color: '#a78bfa' }}>
            Tag @AskAri for instant AI reply
          </span>
        </div>
      </div>

      {/* Messages — min-h-0 is CRITICAL here so the scroll area can shrink
          below its content height. Without it, a tall OpeningPost card
          pushes the container past the ThreadView bounds and the composer
          below gets clipped by <main>'s overflow-hidden on mobile. */}
      <div ref={containerRef} onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-5 relative" style={{ background: '#f6f7f9' }}>
        {/* Opening Post — full title, author, body (news / social / first-reply) */}
        {origin && <OpeningPost origin={origin} replyCount={messages.length} shareUrl={shareUrl} shareText={shareText} />}

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#9ca3af' }}>
              <Loader2 size={18} className="animate-spin mr-2" /> Loading…
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#9ca3af' }}>
              <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No replies yet — be the first!</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} id={`msg-${msg.id}`}
                ref={focusMessageId === msg.id ? focusRef : undefined}
                className="rounded-xl transition-all duration-500"
                style={highlightId === msg.id
                  ? { boxShadow: '0 0 0 2px #a78bfa', background: '#faf5ff' }
                  : undefined}>
                <MessageBubble msg={msg}
                  isOwn={msg.member?.id === member?.id}
                  isThreadOwner={isThreadOwner}
                  onUpvote={handleUpvote}
                  onBestAnswer={handleBestAnswer} />
              </div>
            ))
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* "N new messages ↓" pill — only visible when user scrolled up and new
          messages have arrived. Tap to jump to latest. */}
      {unread > 0 && (
        <button
          onClick={() => { scrollToBottom('smooth'); setUnread(0) }}
          className="absolute left-1/2 -translate-x-1/2 z-10 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
            color: '#fff',
            bottom: '96px',
          }}>
          <ArrowDown size={12} />
          {unread} new message{unread === 1 ? '' : 's'}
        </button>
      )}

      {/* Input — padding-bottom respects iOS home indicator safe area so
          the textarea isn't cut in half by the home bar on phones. */}
      <div className="border-t px-4 shrink-0 bg-white"
        style={{
          borderColor: '#e5e7eb',
          paddingTop:    '0.75rem',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        {!member ? (
          <button onClick={onNeedJoin}
            className="w-full py-3 text-sm font-semibold rounded-xl transition-colors border"
            style={{ color: '#7c3aed', borderColor: '#ddd6fe', background: '#f5f3ff' }}>
            Join the conversation →
          </button>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <textarea value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any) } }}
              placeholder="Type a message… (Tag @AskAri for AI reply)"
              rows={1} maxLength={2000}
              className="flex-1 text-sm rounded-xl px-3.5 py-2.5 resize-none outline-none border transition-all"
              style={{ border: '1px solid #e5e7eb', color: '#111827', background: '#f9fafb', minHeight: '42px', maxHeight: '120px' }}
            />
            <button type="submit" disabled={!text.trim() || sending}
              className="p-2.5 rounded-xl transition-all disabled:opacity-40 shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              {sending ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
            </button>
          </form>
        )}
        <p className="text-[10px] mt-1.5 text-right" style={{ color: '#d1d5db' }}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

function MessageBubble({ msg, isOwn, isThreadOwner, onUpvote, onBestAnswer }: {
  msg: Message; isOwn: boolean; isThreadOwner: boolean
  onUpvote: (id: string) => void; onBestAnswer: (id: string) => void
}) {
  const isAri     = msg.is_ask_ari
  const isNewsBot = msg.member?.display_name === 'oStaran News Bot'
  const rank      = RANKS[msg.member?.rank ?? 'Explorer'] ?? RANKS.Explorer

  // News bot posts: full-width card with violet left border, markdown rendered
  if (isNewsBot) {
    return (
      <div className="w-full rounded-xl border overflow-hidden shadow-sm"
        style={{ background: '#fff', borderColor: '#e5e7eb', borderLeft: '4px solid #7c3aed' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: '#f3f4f6', background: '#fafafa' }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0"
            style={{ background: '#f5f3ff' }}>📰</div>
          <span className="text-xs font-semibold" style={{ color: '#7c3aed' }}>oStaran News Bot</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-auto"
            style={{ background: '#f5f3ff', color: '#7c3aed' }}>AI Digest</span>
          <span className="text-[10px]" style={{ color: '#9ca3af' }}>
            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="px-4 py-4 text-sm" style={{ color: '#374151' }}>
          {renderContent(msg.content)}
        </div>
      </div>
    )
  }

  // Ask Ari: soft violet card
  if (isAri) {
    return (
      <div className="flex gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>🤖</div>
        <div className="max-w-[80%] flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: '#7c3aed' }}>Ask Ari</span>
            <span className="text-[10px]" style={{ color: '#9ca3af' }}>
              {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed border"
            style={{ background: '#f5f3ff', borderColor: '#ddd6fe', color: '#4c1d95' }}>
            {renderContent(msg.content)}
          </div>
        </div>
      </div>
    )
  }

  // Own messages: violet pill, right-aligned
  if (isOwn) {
    return (
      <div className="flex gap-2.5 flex-row-reverse">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
          style={{ background: '#7c3aed', color: '#fff' }}>
          {(msg.member?.display_name?.[0] ?? '?').toUpperCase()}
        </div>
        <div className="max-w-[72%] flex flex-col gap-1 items-end">
          <span className="text-[10px]" style={{ color: '#9ca3af' }}>
            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>
            {msg.content}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <button onClick={() => onUpvote(msg.id)}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border transition-all"
              style={msg.my_upvote
                ? { background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }
                : { background: '#fff', color: '#9ca3af', borderColor: '#e5e7eb' }}>
              <ThumbsUp size={10} />
              {msg.upvote_count > 0 && <span>{msg.upvote_count}</span>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Others' messages: white card, left-aligned
  return (
    <div className="flex gap-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={{ background: rank.bg, color: rank.color }}>
        {(msg.member?.display_name?.[0] ?? '?').toUpperCase()}
      </div>
      <div className="max-w-[72%] flex flex-col gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: '#111827' }}>{msg.member?.display_name ?? 'Unknown'}</span>
          {msg.member?.rank && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: rank.bg, color: rank.color }}>
              {rank.icon} {rank.label}
            </span>
          )}
          {msg.is_best_answer && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: '#d1fae5', color: '#065f46' }}>✓ Best Answer</span>
          )}
          <span className="text-[10px]" style={{ color: '#9ca3af' }}>
            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed border shadow-sm"
          style={{ background: '#ffffff', borderColor: '#e5e7eb', color: '#374151' }}>
          {renderContent(msg.content)}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 mt-0.5">
          <button onClick={() => onUpvote(msg.id)}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border transition-all"
            style={msg.my_upvote
              ? { background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }
              : { background: '#fff', color: '#9ca3af', borderColor: '#e5e7eb' }}>
            <ThumbsUp size={10} />
            {msg.upvote_count > 0 && <span>{msg.upvote_count}</span>}
          </button>
          {isThreadOwner && (
            <button onClick={() => onBestAnswer(msg.id)}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border transition-all"
              style={msg.is_best_answer
                ? { background: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' }
                : { background: '#fff', color: '#9ca3af', borderColor: '#e5e7eb' }}>
              <Award size={10} />
              <span>{msg.is_best_answer ? 'Best' : 'Mark best'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * OpeningPost renders the "first message" of a thread as a distinguished
 * card above the replies. Content sources, in priority order:
 *   1. community_news_log.linkedin_post — for news-bot threads cross-posted
 *      to LinkedIn (origin.is_news === true).
 *   2. Just the title, when the thread has no body content.
 *
 * When `news_items` are present, a compact source list renders below the
 * body — each item is a tappable link to the original article.
 *
 * Share bar sits above the reply count footer and invites friends to
 * join the discussion via WhatsApp, X, LinkedIn, Facebook, Instagram
 * (copy-link with paste hint), Copy Link, or the native share sheet
 * (mobile only — shown when navigator.share is available).
 */
function OpeningPost({ origin, replyCount, shareUrl, shareText }: {
  origin:     Origin
  replyCount: number
  shareUrl:   string
  shareText:  string
}) {
  const [copyMsg,     setCopyMsg]     = useState('')
  const [canShareApi, setCanShareApi] = useState(false)

  useEffect(() => {
    setCanShareApi(typeof navigator !== 'undefined' && !!(navigator as any).share)
  }, [])

  const shareBody = `${shareText}\n\n${shareUrl}`

  function flashToast(msg: string) {
    setCopyMsg(msg)
    setTimeout(() => setCopyMsg(''), 2500)
  }

  async function copyLink(toast: string) {
    try {
      await navigator.clipboard.writeText(shareBody)
      flashToast(toast)
    } catch {
      flashToast('Copy failed — please try again')
    }
  }

  function nativeShare() {
    try {
      ;(navigator as any).share({
        title: 'oStaran AI Community',
        text:  shareText,
        url:   shareUrl,
      }).catch(() => {})
    } catch {
      copyLink('Link copied — paste anywhere to share')
    }
  }

  const creator   = origin.creator
  const isNewsBot = creator?.display_name === 'oStaran News Bot'
  const rank      = RANKS[creator?.rank ?? 'Explorer'] ?? RANKS.Explorer
  const initial   = (creator?.display_name ?? '?').trim().charAt(0).toUpperCase() || '?'

  // Accent colour on the left edge conveys what kind of opening post this is
  const leftAccent = origin.is_question ? '#f97316'
                   : isNewsBot          ? '#7c3aed'
                   :                      '#3b82f6'

  const ts = new Date(origin.created_at).toLocaleString('en-IN', {
    day:    'numeric',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  })

  const items = Array.isArray(origin.news_items) ? origin.news_items : []

  const SHARE_PLATFORMS = [
    {
      label: 'WhatsApp',
      icon:  '💬',
      color: '#25D366',
      url:   `https://wa.me/?text=${encodeURIComponent(shareBody)}`,
    },
    {
      label: 'X',
      icon:  '𝕏',
      color: '#111827',
      url:   `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: 'LinkedIn',
      icon:  'in',
      color: '#0A66C2',
      url:   `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: 'Facebook',
      icon:  'f',
      color: '#1877F2',
      url:   `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
  ]

  return (
    <article className="rounded-2xl bg-white shadow-sm overflow-hidden mb-6"
      style={{
        border:     '1px solid #e5e7eb',
        borderLeft: `4px solid ${leftAccent}`,
      }}>

      {/* Meta strip */}
      <header className="flex items-center gap-2.5 px-4 py-2.5 border-b"
        style={{ borderColor: '#f3f4f6', background: '#fafafa' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={isNewsBot
            ? { background: '#f5f3ff', color: '#7c3aed' }
            : { background: rank.bg, color: rank.color }}>
          {isNewsBot ? '📰' : initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold truncate"
              style={{ color: isNewsBot ? '#7c3aed' : '#111827' }}>
              {creator?.display_name ?? 'Unknown'}
            </span>
            {isNewsBot ? (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                AI Digest
              </span>
            ) : creator?.rank && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: rank.bg, color: rank.color }}>
                {rank.icon} {rank.label}
              </span>
            )}
            {origin.is_question && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                ❓ Question
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: '#9ca3af' }}>
            {ts}
            {origin.linkedin_url && (
              <>
                {' · '}
                <a href={origin.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="font-semibold hover:underline" style={{ color: '#0A66C2' }}>
                  View on LinkedIn ↗
                </a>
              </>
            )}
          </p>
        </div>
      </header>

      {/* Title — always shown, full length, never truncated */}
      <h1 className="px-4 pt-4 pb-2 text-base sm:text-lg font-extrabold leading-snug"
        style={{ color: '#111827', wordBreak: 'break-word' }}>
        {origin.title}
      </h1>

      {/* Body — rendered only when content exists */}
      {origin.body && (
        <div className="px-4 pb-4 text-sm leading-relaxed" style={{ color: '#374151' }}>
          {renderContent(origin.body)}
        </div>
      )}

      {/* News sources list — compact, tappable links to the original articles */}
      {items.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: '#9ca3af' }}>
            Sources · {items.length}
          </p>
          <div className="space-y-1.5">
            {items.slice(0, 8).map((item, i) => (
              item.url ? (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="block rounded-lg border px-3 py-2 text-xs transition-all hover:bg-violet-50"
                  style={{ borderColor: '#e5e7eb' }}>
                  <p className="font-semibold leading-snug" style={{ color: '#111827' }}>
                    {item.title ?? item.url}
                  </p>
                  {item.source && (
                    <p className="text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>
                      {item.source} ↗
                    </p>
                  )}
                </a>
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* Share bar — invite friends to join the discussion */}
      <div className="px-4 py-3 border-t" style={{ borderColor: '#f3f4f6' }}>
        <p className="text-[11px] font-semibold mb-2 flex items-center gap-1" style={{ color: '#374151' }}>
          <span>📣</span>
          <span>Invite friends to join this discussion</span>
        </p>
        <div className="flex gap-1.5 flex-wrap items-center">
          {SHARE_PLATFORMS.map(p => (
            <a key={p.label} href={p.url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80 border inline-flex items-center gap-1.5"
              style={{ color: p.color, borderColor: p.color + '44', background: p.color + '0d' }}>
              <span className="font-extrabold" style={{ minWidth: '0.75rem', textAlign: 'center' }}>{p.icon}</span>
              <span>{p.label}</span>
            </a>
          ))}

          {/* Instagram — no web share API; copy link with paste instruction */}
          <button
            onClick={() => copyLink('Link copied — paste in your Instagram story or DM')}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80 border inline-flex items-center gap-1.5"
            style={{ color: '#E4405F', borderColor: '#E4405F44', background: '#E4405F0d' }}>
            <span className="font-extrabold" style={{ minWidth: '0.75rem', textAlign: 'center' }}>📷</span>
            <span>Instagram</span>
          </button>

          {/* Copy link */}
          <button
            onClick={() => copyLink('Link copied to clipboard')}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80 border inline-flex items-center gap-1.5"
            style={{ color: '#6b7280', borderColor: '#e5e7eb', background: '#fff' }}>
            <span>📋</span>
            <span>Copy link</span>
          </button>

          {/* Native share — only when the browser supports navigator.share */}
          {canShareApi && (
            <button
              onClick={nativeShare}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80 border inline-flex items-center gap-1.5"
              style={{ color: '#7c3aed', borderColor: '#ddd6fe', background: '#f5f3ff' }}>
              <span>📤</span>
              <span>More…</span>
            </button>
          )}
        </div>
        {copyMsg && (
          <p className="text-[10px] mt-2 font-semibold" style={{ color: '#059669' }}>
            ✓ {copyMsg}
          </p>
        )}
      </div>

      {/* Reply count footer */}
      <footer className="px-4 py-2 border-t text-[11px] font-medium"
        style={{ borderColor: '#f3f4f6', color: '#6b7280', background: '#fafafa' }}>
        {replyCount === 0
          ? '💬 Be the first to reply'
          : replyCount === 1
            ? '💬 1 reply'
            : `💬 ${replyCount} replies`}
      </footer>
    </article>
  )
}
