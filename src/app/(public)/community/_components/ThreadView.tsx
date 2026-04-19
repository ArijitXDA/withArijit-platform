'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Send, Loader2, ThumbsUp, Award, MessageSquare, ArrowDown } from 'lucide-react'
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
interface Member { id: string; tier: string; display_name: string }
interface Props {
  thread:     { id: string; title: string; created_by?: string; is_question?: boolean }
  member:     Member | null
  onBack:     () => void
  onNeedJoin: () => void
  onExpired:  () => void
}

export function ThreadView({ thread, member, onBack, onNeedJoin, onExpired }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading,  setLoading]  = useState(true)
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState('')
  const [atBottom, setAtBottom] = useState(true)
  const [unread,   setUnread]   = useState(0)
  const bottomRef    = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

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
    setMessages(msgs)
    setLoading(false)
    prevCountRef.current = msgs.length
    // Always scroll to bottom on initial load so user sees latest.
    scrollToBottom('auto')
    setAtBottom(true)
    setUnread(0)
  }, [thread.id, member, scrollToBottom])

  useEffect(() => { loadMessages() }, [loadMessages])

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
        async (payload) => {
          const res  = await fetch(`/api/community/messages?thread_id=${thread.id}&limit=1${member ? `&member_id=${member.id}` : ''}`)
          const data = await res.json()
          const newMsg = (data.messages ?? []).find((m: Message) => m.id === payload.new.id)
          if (newMsg) setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
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
  const shareText = `Discussing: "${thread.title}" on oStaran AI Community`
  const SHARE_LINKS = [
    { label: 'WhatsApp', color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}` },
    { label: 'LinkedIn', color: '#0A66C2', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
    { label: 'X',        color: '#111827', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { label: 'Facebook', color: '#1877F2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
  ]

  const isThreadOwner = member?.id === (thread as any).created_by

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-start gap-3 shrink-0 bg-white" style={{ borderColor: '#e5e7eb' }}>
        <button onClick={onBack} className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 shrink-0 mt-0.5" style={{ color: '#6b7280' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          {/* Allow the title to wrap up to 2 lines — critical for news-bot
              titles like "Afternoon Tech Pulse — Adobe Launches Firefly..." */}
          <h3 className="text-sm sm:text-base font-bold leading-snug"
            style={{
              color: '#111827',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}>
            {thread.title}
          </h3>
          <p className="text-[11px] mt-1" style={{ color: '#a78bfa' }}>@AskAri is active · Tag @AskAri for instant AI reply</p>
        </div>
        {/* Share — hidden below sm to give the title more room on mobile */}
        <div className="hidden sm:flex items-center gap-1 shrink-0 mt-0.5">
          <span className="text-[10px] mr-1" style={{ color: '#9ca3af' }}>Share:</span>
          {SHARE_LINKS.map(s => (
            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-semibold px-2 py-1 rounded-md transition-all hover:opacity-80 border"
              style={{ color: s.color, borderColor: s.color + '44', background: s.color + '0d' }}>
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-4 relative" style={{ background: '#f6f7f9' }}>
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#9ca3af' }}>
            <Loader2 size={18} className="animate-spin mr-2" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16" style={{ color: '#9ca3af' }}>
            <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No messages yet — start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg}
              isOwn={msg.member?.id === member?.id}
              isThreadOwner={isThreadOwner}
              onUpvote={handleUpvote}
              onBestAnswer={handleBestAnswer} />
          ))
        )}
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

      {/* Input */}
      <div className="border-t px-4 py-3 shrink-0 bg-white" style={{ borderColor: '#e5e7eb' }}>
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
