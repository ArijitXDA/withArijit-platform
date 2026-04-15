'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, MessageSquare, Pin, HelpCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Thread {
  id: string; title: string; reply_count: number; last_msg_at: string | null
  is_pinned: boolean; is_question: boolean; best_answer_id: string | null
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
  const [threads,  setThreads]  = useState<Thread[]>([])
  const [loading,  setLoading]  = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [isQuestion, setIsQuestion] = useState(false)

  const loadThreads = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/community/threads?channel_id=${channel.id}&limit=30`)
    const data = await res.json()
    setThreads(data.threads ?? [])
    setLoading(false)
  }, [channel.id])

  useEffect(() => { loadThreads() }, [loadThreads])

  // Realtime: reload thread list when new messages arrive in this channel
  useEffect(() => {
    const ch = supabase
      .channel(`threadlist-${channel.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'community_threads',
        filter: `channel_id=eq.${channel.id}`,
      }, () => { loadThreads() })
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
    <div className="flex flex-col h-full" style={{ background: '#080820' }}>
      {/* Header */}
      <div className="px-4 py-3.5 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'rgba(139,92,246,0.15)', background: 'rgba(13,11,43,0.95)' }}>
        <div>
          <h2 className="text-sm font-bold text-white">{channel.icon} #{channel.name}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>{channel.description}</p>
        </div>
        <button
          onClick={() => member ? setShowNew(s => !s) : onNeedJoin()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>
          <Plus size={12} /> New Thread
        </button>
      </div>

      {/* New thread form */}
      {showNew && (
        <form onSubmit={handleCreate} className="px-4 py-3 border-b space-y-2 shrink-0"
          style={{ borderColor: 'rgba(139,92,246,0.15)', background: 'rgba(124,58,237,0.06)' }}>
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Thread title…" maxLength={120}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.3)', color: '#e2e8f0' }}
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#94a3b8' }}>
              <input type="checkbox" checked={isQuestion} onChange={e => setIsQuestion(e.target.checked)}
                className="accent-violet-500" />
              <HelpCircle size={12} /> Mark as question (+15 pts)
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowNew(false)}
                className="px-3 py-1.5 text-xs rounded-lg"
                style={{ color: '#64748b', background: 'rgba(255,255,255,0.04)' }}>
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

      {/* Thread list — sorted by last_msg_at desc */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading…</div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-600 gap-2">
            <MessageSquare size={28} className="opacity-20" />
            <p className="text-sm">No threads yet. Start one!</p>
          </div>
        ) : (
          threads.map(t => (
            <button key={t.id} onClick={() => onSelectThread({ id: t.id, title: t.title, created_by: t.creator?.id, is_question: t.is_question })}
              className="w-full text-left px-4 py-3.5 border-b transition-all hover:bg-white/[0.03] flex items-start gap-3"
              style={{ borderColor: 'rgba(139,92,246,0.08)' }}>
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={t.is_question
                  ? { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }
                  : t.is_pinned
                  ? { background: 'rgba(124,58,237,0.18)', color: '#a78bfa' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#475569' }}>
                {t.is_question ? <HelpCircle size={14} /> : t.is_pinned ? <Pin size={14} /> : <MessageSquare size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-slate-200 truncate">{t.title}</p>
                  {t.best_answer_id && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0"
                      style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>✓ Answered</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
                  by {t.creator?.display_name} · {t.reply_count} replies
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
