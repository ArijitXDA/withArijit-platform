'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft, Send, Loader2, ThumbsUp, Award, Share2,
  CheckCircle2, MessageSquare,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Point system constants ────────────────────────────────────────────────────
const RANKS: Record<string, { label: string; color: string; icon: string }> = {
  'Explorer':       { label: 'Explorer',       color: '#94a3b8', icon: '🔭' },
  'Practitioner':   { label: 'Practitioner',   color: '#60a5fa', icon: '🛠' },
  'Analyst':        { label: 'Analyst',         color: '#a78bfa', icon: '📊' },
  'Specialist':     { label: 'Specialist',      color: '#34d399', icon: '⚡' },
  'Mentor':         { label: 'Mentor',          color: '#f59e0b', icon: '🏆' },
  'Thought Leader': { label: 'Thought Leader', color: '#f97316', icon: '🌟' },
}

interface Message {
  id: string
  content: string
  is_ask_ari: boolean
  created_at: string
  upvote_count: number
  is_best_answer: boolean
  my_upvote?: boolean
  member: { id: string; display_name: string; tier: string; points?: number; rank?: string }
}
interface Member  { id: string; tier: string; display_name: string }
interface Props {
  thread:       { id: string; title: string; created_by?: string; is_question?: boolean }
  member:       Member | null
  onBack:       () => void
  onNeedJoin:   () => void
  onExpired:    () => void
}

export function ThreadView({ thread, member, onBack, onNeedJoin, onExpired }: Props) {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [loading,   setLoading]   = useState(true)
  const [text,      setText]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [error,     setError]     = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  const loadMessages = useCallback(async () => {
    const res  = await fetch(`/api/community/messages?thread_id=${thread.id}&limit=80${member ? `&member_id=${member.id}` : ''}`)
    const data = await res.json()
    setMessages(data.messages ?? [])
    setLoading(false)
    scrollToBottom()
  }, [thread.id, member, scrollToBottom])

  useEffect(() => { loadMessages() }, [loadMessages])

  // Scroll to bottom whenever messages change
  useEffect(() => { if (!loading) scrollToBottom() }, [messages, loading, scrollToBottom])

  // Realtime subscription — append new messages, then scroll
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${thread.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'community_messages', filter: `thread_id=eq.${thread.id}`,
      }, async (payload) => {
        // Re-fetch the message with member join + upvote data
        const res  = await fetch(`/api/community/messages?thread_id=${thread.id}&limit=1${member ? `&member_id=${member.id}` : ''}`)
        const data = await res.json()
        const newMsg = (data.messages ?? []).find((m: Message) => m.id === payload.new.id)
        if (newMsg) {
          setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        }
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
    setText('')
    setSending(false)
  }

  async function handleUpvote(msgId: string) {
    if (!member) { onNeedJoin(); return }
    const res  = await fetch('/api/community/upvote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: msgId, member_id: member.id }),
    })
    const data = await res.json()
    if (data.expired) { onExpired(); return }
    setMessages(prev => prev.map(m => m.id === msgId ? {
      ...m,
      upvote_count: m.upvote_count + (data.upvoted ? 1 : -1),
      my_upvote: data.upvoted,
    } : m))
  }

  async function handleBestAnswer(msgId: string) {
    if (!member) return
    await fetch('/api/community/best-answer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: thread.id, message_id: msgId, member_id: member.id }),
    })
    setMessages(prev => prev.map(m => ({ ...m, is_best_answer: m.id === msgId })))
  }

  const shareUrl = `https://www.ostaran.com/community?thread=${thread.id}`
  const shareText = `Discussing: "${thread.title}" on oStaran AI Community`

  const SHARE_LINKS = [
    { label: 'WhatsApp', color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}` },
    { label: 'LinkedIn', color: '#0A66C2', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
    { label: 'X',        color: '#000000', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { label: 'Facebook', color: '#1877F2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
  ]

  const isThreadOwner = member?.id === (thread as any).created_by

  return (
    <div className="flex flex-col h-full" style={{ background: '#080820' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0"
        style={{ borderColor: 'rgba(139,92,246,0.15)', background: 'rgba(13,11,43,0.95)' }}>
        <button onClick={onBack}
          className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {thread.is_question && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Q</span>
            )}
            <h3 className="text-sm font-bold text-white truncate">{thread.title}</h3>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(139,92,246,0.7)' }}>@AskAri is active · Tag @AskAri for an instant AI reply</p>
        </div>
        {/* Share buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-slate-500 mr-1 hidden sm:block">Share:</span>
          {SHARE_LINKS.map(s => (
            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-bold px-2 py-1 rounded-md transition-all hover:opacity-80"
              style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}33` }}>
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-16">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
            <p>No messages yet — start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} isOwn={msg.member?.id === member?.id}
              isThreadOwner={isThreadOwner} onUpvote={handleUpvote} onBestAnswer={handleBestAnswer} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 shrink-0"
        style={{ borderColor: 'rgba(139,92,246,0.15)', background: 'rgba(13,11,43,0.95)' }}>
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        {!member ? (
          <button onClick={onNeedJoin}
            className="w-full py-3 text-sm font-semibold rounded-xl transition-colors"
            style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
            Join the conversation →
          </button>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <textarea value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any) } }}
              placeholder="Type a message… (Tag @AskAri for AI reply)"
              rows={1} maxLength={2000}
              className="flex-1 text-sm rounded-xl px-3.5 py-2.5 resize-none transition-all outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.25)',
                color: '#e2e8f0', minHeight: '42px', maxHeight: '120px',
              }}
            />
            <button type="submit" disabled={!text.trim() || sending}
              className="p-2.5 rounded-xl transition-all disabled:opacity-40 shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              {sending ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
            </button>
          </form>
        )}
        <p className="text-[10px] text-slate-700 mt-1.5 text-right">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

function MessageBubble({ msg, isOwn, isThreadOwner, onUpvote, onBestAnswer }: {
  msg: Message; isOwn: boolean
  isThreadOwner: boolean
  onUpvote: (id: string) => void
  onBestAnswer: (id: string) => void
}) {
  const isAri  = msg.is_ask_ari
  const rank   = RANKS[msg.member?.rank ?? 'Explorer'] ?? RANKS.Explorer

  return (
    <div className={`flex gap-2.5 ${isOwn && !isAri ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={isAri
          ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }
          : { background: 'rgba(139,92,246,0.18)', color: '#a78bfa' }}>
        {isAri ? '🤖' : (msg.member?.display_name?.[0] ?? '?').toUpperCase()}
      </div>

      {/* Bubble + actions */}
      <div className={`max-w-[78%] flex flex-col gap-1 ${isOwn && !isAri ? 'items-end' : 'items-start'}`}>
        {/* Name row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-200">
            {isAri ? 'Ask Ari' : msg.member?.display_name ?? 'Unknown'}
          </span>
          {!isAri && msg.member?.rank && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: rank.color + '22', color: rank.color, border: `1px solid ${rank.color}33` }}>
              {rank.icon} {rank.label}
            </span>
          )}
          {msg.is_best_answer && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              Best Answer
            </span>
          )}
          <span className="text-[10px] text-slate-600">
            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Content bubble */}
        <div className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={isAri ? {
            background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', color: '#c4b5fd',
          } : isOwn ? {
            background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
          } : {
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.12)', color: '#e2e8f0',
          }}>
          {msg.content}
        </div>

        {/* Upvote + Best Answer actions */}
        {!isAri && (
          <div className="flex items-center gap-2 mt-0.5">
            <button onClick={() => onUpvote(msg.id)}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg transition-all"
              style={msg.my_upvote
                ? { background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }
                : { background: 'rgba(255,255,255,0.04)', color: '#475569' }}>
              <ThumbsUp size={10} />
              <span>{msg.upvote_count > 0 ? msg.upvote_count : ''}</span>
            </button>
            {isThreadOwner && !isOwn && (
              <button onClick={() => onBestAnswer(msg.id)}
                title="Mark as best answer (+50 pts to author)"
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg transition-all"
                style={msg.is_best_answer
                  ? { background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#475569' }}>
                <Award size={10} />
                <span>{msg.is_best_answer ? 'Best' : 'Mark best'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
