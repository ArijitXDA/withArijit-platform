'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, MessageSquare, Pin } from 'lucide-react'

interface Thread { id: string; title: string; reply_count: number; last_msg_at: string | null; is_pinned: boolean; creator: { display_name: string; tier: string } }
interface Channel { id: string; name: string; icon: string; description: string; sort_order?: number }
interface Member  { id: string; tier: string; display_name: string }

interface Props {
  channel:       Channel
  member:        Member | null
  onSelectThread:(t: { id: string; title: string }) => void
  onNeedJoin:    () => void
  onExpired:     () => void
}

export function ThreadList({ channel, member, onSelectThread, onNeedJoin, onExpired }: Props) {
  const [threads,    setThreads]    = useState<Thread[]>([])
  const [loading,    setLoading]    = useState(true)
  const [newTitle,   setNewTitle]   = useState('')
  const [creating,   setCreating]   = useState(false)
  const [showNew,    setShowNew]    = useState(false)

  const loadThreads = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/community/threads?channel_id=${channel.id}`)
    const data = await res.json()
    setThreads(data.threads ?? [])
    setLoading(false)
  }, [channel.id])

  useEffect(() => { loadThreads() }, [loadThreads])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!member) { onNeedJoin(); return }
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await fetch('/api/community/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: channel.id, title: newTitle.trim(), member_id: member.id }),
    })
    const data = await res.json()
    if (data.expired) { onExpired(); return }
    if (data.thread) {
      setNewTitle(''); setShowNew(false)
      loadThreads()
      onSelectThread(data.thread)
    }
    setCreating(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">{channel.icon} #{channel.name}</h2>
          <p className="text-xs text-gray-400">{channel.description}</p>
        </div>
        <button
          onClick={() => member ? setShowNew(s => !s) : onNeedJoin()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={13} /> New Thread
        </button>
      </div>

      {/* New thread form */}
      {showNew && (
        <form onSubmit={handleCreate} className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Thread title…"
            className="flex-1 text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            maxLength={120}
          />
          <button type="submit" disabled={creating || !newTitle.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {creating ? '…' : 'Start'}
          </button>
          <button type="button" onClick={() => setShowNew(false)} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
        </form>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading…</div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
            <MessageSquare size={32} className="opacity-30" />
            <p className="text-sm">No threads yet. Start one!</p>
          </div>
        ) : (
          threads.map(t => (
            <button key={t.id} onClick={() => onSelectThread(t)}
              className="w-full text-left px-5 py-4 border-b border-gray-50 hover:bg-white transition-colors flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-400">
                {t.is_pinned ? <Pin size={15} /> : <MessageSquare size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
