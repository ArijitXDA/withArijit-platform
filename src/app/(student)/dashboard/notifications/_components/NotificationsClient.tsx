'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Inbox } from 'lucide-react'

// Mobile-first list. Rows are large tap targets because this screen lives inside the Android app,
// where a dropdown-sized hit area is unusable.

const T = {
  navy: '#0f1f3d', blue: '#2563eb', border: '#dce6f5', borderLight: '#e8f0fc',
  textSec: '#475569', textMuted: '#94a3b8', unreadBg: '#f5f9ff',
}

interface Row {
  id: string; kind: string; title: string; body: string | null
  link: string | null; ticket_id: string | null
  read_at: string | null; created_at: string
}

// Relative for anything recent, absolute once it stops being useful.
function when(iso: string) {
  const then = new Date(iso).getTime()
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1)    return 'just now'
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)    return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
}

// Class reminders carry a Teams join link, so the row's destination is often off-site. Restricted to
// https so a malformed or hostile link can't smuggle in javascript:/data:. Internal paths still route
// in-app; without this branch a "your class is live" tap silently did nothing.
function isExternal(link: string | null): boolean {
  if (!link) return false
  try { return new URL(link).protocol === 'https:' } catch { return false }
}

export default function NotificationsClient({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial)
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const unread = rows.filter(r => !r.read_at).length

  async function open(n: Row) {
    // Mark read optimistically — the list must not feel laggy on a phone, and a failed
    // mark-read is recoverable (it stays unread and can be tapped again).
    if (!n.read_at) {
      setRows(rs => rs.map(r => r.id === n.id ? { ...r, read_at: new Date().toISOString() } : r))
      fetch('/api/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
    }
    if (n.ticket_id) router.push(`/dashboard/tickets?open=${n.ticket_id}`)
    else if (n.link && n.link.startsWith('/')) router.push(n.link)
    else if (isExternal(n.link)) window.open(n.link!, '_blank', 'noopener,noreferrer')
  }

  async function markAll() {
    setBusy(true)
    setRows(rs => rs.map(r => r.read_at ? r : { ...r, read_at: new Date().toISOString() }))
    try { await fetch('/api/notifications', { method: 'POST' }) } catch {}
    setBusy(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: '#eff6ff', border: '1px solid #dbeafe' }}>
            <Bell size={16} style={{ color: T.blue }} />
          </div>
          <div>
            <h1 className="font-bold text-lg" style={{ color: T.navy }}>Notifications</h1>
            <p className="text-xs" style={{ color: T.textMuted }}>
              {unread > 0 ? `${unread} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAll} disabled={busy}
                  className="text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg disabled:opacity-50"
                  style={{ color: T.blue, border: `1px solid ${T.border}` }}>
            <CheckCheck size={13} />Mark all read
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl px-5 py-14 text-center bg-white" style={{ border: `1px solid ${T.border}` }}>
          <Inbox size={28} style={{ color: T.textMuted }} className="mx-auto mb-3" />
          <p className="text-sm font-semibold" style={{ color: T.navy }}>Nothing here yet</p>
          <p className="text-xs mt-1.5" style={{ color: T.textMuted }}>
            Class reminders, new study material and replies to your doubts will show up here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${T.border}` }}>
          {rows.map(n => {
            const tappable = !!(n.ticket_id || (n.link && n.link.startsWith('/')) || isExternal(n.link))
            return (
              <button key={n.id} onClick={() => open(n)} disabled={!tappable && !!n.read_at}
                      className="w-full text-left px-4 py-3.5 border-b last:border-b-0 transition-colors hover:bg-blue-50/40 disabled:cursor-default"
                      style={{ borderColor: T.borderLight, background: n.read_at ? '#fff' : T.unreadBg }}>
                <div className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                        style={{ background: n.read_at ? 'transparent' : T.blue }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug" style={{ color: T.navy }}>{n.title}</p>
                    {n.body && (
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: T.textSec }}>{n.body}</p>
                    )}
                    <p className="text-[11px] mt-1.5" style={{ color: T.textMuted }}>{when(n.created_at)}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
