'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Send, Loader2, Bot } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Message {
  id: string
  content: string
  is_ask_ari: boolean
  created_at: string
  member: { id: string; display_name: string; tier: string }
}
interface Member { id: string; tier: string; display_name: string }
interface Props {
  thread:      { id: string; title: string }
  member:      Member | null
  onBack:      () => void
  onNeedJoin:  () => void
  onExpired:   () => void
}

const TIER_COLOURS: Record<string, string> = {
  guest:    'bg-gray-100 text-gray-600',
  webinar:  'bg-blue-100 text-blue-700',
  enrolled: 'bg-green-100 text-green-700',
  admin:    'bg-purple-100 text-purple-700',
}

export function ThreadView({ thread, member, onBack, onNeedJoin, onExpired }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading,  setLoading]  = useState(true)
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/community/messages?thread_id=${thread.id}&limit=60`)
    const data = await res.json()
    setMessages(data.messages ?? [])
    setLoading(false)
  }, [thread.id])

  useEffect(() => { loadMessages() }, [loadMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${thread.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'community_messages',
          filter: `thread_id=eq.${thread.id}`,
        },
        async (payload) => {
          // Fetch full row with member join
          const res  = await fetch(`/api/community/messages?thread_id=${thread.id}&limit=1`)
          const data = await res.json()
          const newMsg = (data.messages ?? []).find((m: Message) => m.id === payload.new.id)
          if (newMsg) {
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [thread.id])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    if (!member) { onNeedJoin(); return }

    setSending(true); setError('')
    const res  = await fetch('/api/community/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: thread.id, member_id: member.id, content: text.trim() }),
    })
    const data = await res.json()

    if (data.expired) { onExpired(); return }
    if (!res.ok) { setError(data.error || 'Failed to send'); setSending(false); return }

    setText('')
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">{thread.title}</h3>
          <p className="text-xs text-gray-400">@AskAri is active in this thread</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200 shrink-0">
          <Bot size={11} /> Ask Ari active
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-16">
            <Bot size={32} className="mx-auto mb-2 opacity-30" />
            <p>No messages yet. Start the conversation!</p>
            <p className="text-xs mt-1">Tag <code className="bg-gray-100 px-1 rounded">@AskAri</code> for an instant AI reply.</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} isOwn={msg.member?.id === member?.id} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-4 py-3 shrink-0">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        {!member ? (
          <button
            onClick={onNeedJoin}
            className="w-full py-3 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors">
            Join the conversation →
          </button>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
              placeholder="Type a message… (Tag @AskAri for AI reply)"
              rows={1}
              maxLength={2000}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none transition-all"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shrink-0">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        )}
        <p className="text-[10px] text-gray-300 mt-1.5 text-right">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  const isAri = msg.is_ask_ari
  const tierClass = TIER_COLOURS[msg.member?.tier ?? 'guest'] ?? TIER_COLOURS.guest

  return (
    <div className={`flex gap-2.5 ${isOwn && !isAri ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        isAri ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
      }`}>
        {isAri ? '🤖' : (msg.member?.display_name?.[0] ?? '?').toUpperCase()}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isOwn && !isAri ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-700">
            {isAri ? 'Ask Ari 🤖' : msg.member?.display_name ?? 'Unknown'}
          </span>
          {!isAri && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tierClass}`}>
              {msg.member?.tier ?? 'guest'}
            </span>
          )}
          <span className="text-[10px] text-gray-300">
            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isAri
            ? 'bg-indigo-50 border border-indigo-100 text-indigo-900'
            : isOwn
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-gray-100 text-gray-800 shadow-sm'
        }`}>
          {msg.content}
        </div>
      </div>
    </div>
  )
}
