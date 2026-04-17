'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, MessageSquare, Pin, HelpCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { plainPreview } from './renderContent'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Thread {
  id: string; title: string; reply_count: number; last_msg_at: string | null
  is_pinned: boolean; is_question: boolean; best_answer_id: string | null
  first_message: string | null
  creator: { id: string; display_name: string; tier: string; points?: number; rank?: string }
}
interface Channel { id: string; name: string; icon: string; description: string }
interface Member  { id: string; tier: string; display_name: string }
interface Props {
  channel:        Channel
  member:         Member | null
  onSelectThread: (t: { id: string; title: string; created_by?: string; is_question?: boolean }) => void
  onNeedJoin:     () => void
  onExpired:      () => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ThreadList({ channel, member, onSelectThread, onNeedJoin, onExpired }: Props) {
  const [threads,    setThreads]    = useState<Thread[]>([])
  const [loading,    setLoading]    = useState(true)
  const [newTitle,   setNewTitle]   = useState('')
  const [creating,   setCreating]   = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const [isQuestion, setIsQuestion] = useState(false)

  const loadThreads = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/community/threads?channel_id=${channel.id}&limit=30`)
    const data = await res.json()
    setThreads(data.threads ?? [])
    setLoading(false)
  }, [channel.id])

  useEffect(() => { loadThreads() }, [loadThreads])

  useEffect(() => {
    const ch = supabase
      .channel(`threadlist-${channel.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_threads', filter: `channel_id=eq.${channel.id}` },
        () => { loadThreads() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [channel.id, loadThreads])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!member) { onNeedJoin(); return }
    if (!newTitle.trim()) return
    setCreating(true)
    const res  = await fetch('/api/community/threads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: channel.id, title: newTitle.trim(), member_id: member.id, is_question: isQuestion }),
    })
    const data = await res.json()
    if (data.expired) { onExpired(); return }
    if (data.thread) {
      setNewTitle(''); setShowNew(false); setIsQuestion(false)
      loadThreads()
      onSelectThread({ ...data.thread, created_by: member.id })
    }
    setCreating(false)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#f6f7f9' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between shrink-0 bg-white"
        style={{ borderColor: '#e5e7eb' }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: '#111827' }}>{channel.icon} #{channel.name}</h2>
          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{channel.description}</p>
        </div>
        <button
          onClick={() => member ? setShowNew(s => !s) : onNeedJoin()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>
          <Plus size={12} /> New Thread
        </button>
      </div>

      {/* New thread form */}
      {showNew && (
        <form onSubmit={handleCreate} className="px-5 py-3 border-b space-y-2 shrink-0"
          style={{ borderColor: '#e5e7eb', background: '#f5f3ff' }}>
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Thread title…" maxLength={120}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none border"
            style={{ border: '1px solid #ddd6fe', color: '#111827', background: '#fff' }}
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#6b7280' }}>
              <input type="checkbox" checked={isQuestion} onChange={e => setIsQuestion(e.target.checked)} className="accent-violet-500" />
              <HelpCircle size={12} /> Mark as question (+15 pts)
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowNew(false)}
                className="px-3 py-1.5 text-xs rounded-lg border"
                style={{ color: '#6b7280', borderColor: '#e5e7eb', background: '#fff' }}>
                Cancel
              </button>
              <button type="submit" disabled={creating || !newTitle.trim()}
                className="px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>
                {creating ? '…' : 'Start'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#9ca3af' }}>Loading…</div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2" style={{ color: '#d1d5db' }}>
            <MessageSquare size={28} className="opacity-40" />
            <p className="text-sm" style={{ color: '#9ca3af' }}>No threads yet. Start one!</p>
          </div>
        ) : (
          threads.map(t => (
            <button key={t.id}
              onClick={() => onSelectThread({ id: t.id, title: t.title, created_by: t.creator?.id, is_question: t.is_question })}
              className="w-full text-left px-5 py-4 border-b transition-all hover:bg-white flex items-start gap-3"
              style={{ borderColor: '#f0f0f0', background: 'transparent' }}>
              {/* Icon */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={t.is_question
                  ? { background: '#fff7ed', color: '#f97316' }
                  : t.is_pinned
                  ? { background: '#f5f3ff', color: '#7c3aed' }
                  : { background: '#f3f4f6', color: '#9ca3af' }}>
                {t.is_question ? <HelpCircle size={15} /> : t.is_pinned ? <Pin size={15} /> : <MessageSquare size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>{t.title}</p>
                  {t.best_answer_id && (
                    <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                      style={{ background: '#d1fae5', color: '#065f46' }}>
                      <CheckCircle2 size={9} /> Answered
                    </span>
                  )}
                </div>
                {t.first_message && (
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6b7280' }}>
                    {plainPreview(t.first_message, 200)}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                  by {t.creator?.display_name} · {t.reply_count} {t.reply_count === 1 ? 'reply' : 'replies'}
                  {t.last_msg_at && ` · ${timeAgo(t.last_msg_at)}`}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
