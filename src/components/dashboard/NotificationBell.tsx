'use client'
import { Bell } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

function isExternalLink(link: string): boolean {
  try { return new URL(link).protocol === 'https:' } catch { return false }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const load = async () => {
    const d = await fetch('/api/notifications').then(r => r.json()).catch(() => ({ notifications: [], unread: 0 }))
    setItems(d.notifications ?? []); setUnread(d.unread ?? 0)
  }
  // Poll as a baseline, but refresh immediately when a foreground push lands — waiting up to 60s to
  // show a "class is live" row defeats the point.
  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    const onRefresh = () => load()
    window.addEventListener('ostaran:refresh-notifications', onRefresh)
    return () => { clearInterval(t); window.removeEventListener('ostaran:refresh-notifications', onRefresh) }
  }, [])
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function openNotif(n: any) {
    setOpen(false)
    fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).then(load)
    // Tickets open in the ticket view; broadcasts and other pushes carry their own destination.
    // Class reminders point at a Teams join link, so off-site destinations open in a new tab —
    // restricted to https so a malformed link can't smuggle in javascript:/data:.
    if (n.ticket_id) router.push(`/dashboard/tickets?open=${n.ticket_id}`)
    else if (typeof n.link === 'string' && n.link.startsWith('/')) router.push(n.link)
    else if (typeof n.link === 'string' && isExternalLink(n.link)) window.open(n.link, '_blank', 'noopener,noreferrer')
  }
  async function markAll() { await fetch('/api/notifications', { method: 'POST' }); load() }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} aria-label="Notifications"
        className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-blue-50" style={{ color: '#64748b' }}>
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: '#ef4444' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl z-50" style={{ background: '#fff', border: '1px solid #dce6f5', boxShadow: '0 8px 28px rgba(15,31,61,0.14)' }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: '#eef3fb' }}>
            <p className="text-sm font-semibold" style={{ color: '#0f1f3d' }}>Notifications</p>
            <div className="flex items-center gap-3">
              {unread > 0 && <button onClick={markAll} className="text-xs font-semibold" style={{ color: '#2563eb' }}>Mark all read</button>}
              {/* The dropdown only ever shows the newest 50 and is cramped on a phone — the full
                  screen is where a tapped push lands, so always offer the way through to it. */}
              <button onClick={() => { setOpen(false); router.push('/dashboard/notifications') }}
                      className="text-xs font-semibold" style={{ color: '#475569' }}>View all</button>
            </div>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm" style={{ color: '#94a3b8' }}>You&apos;re all caught up.</p>
          ) : items.map(n => (
            <button key={n.id} onClick={() => openNotif(n)} className="w-full text-left px-4 py-2.5 border-b transition-colors hover:bg-blue-50/60" style={{ borderColor: '#f1f5fb', background: n.read_at ? '#fff' : '#f5f9ff' }}>
              <div className="flex items-start gap-2">
                {!n.read_at && <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#2563eb' }} />}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>{n.title}</p>
                  {n.body && <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{n.body}</p>}
                  <p className="text-[10px] mt-0.5" style={{ color: '#cbd5e1' }}>{fmt(n.created_at)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
