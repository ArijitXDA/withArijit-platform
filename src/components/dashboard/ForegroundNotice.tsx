'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X } from 'lucide-react'

// Renders foreground pushes — messages that arrive while the app is open and focused.
//
// The FCM SW SDK deliberately suppresses the system notification whenever a visible client exists on
// the origin, and instead posts the message to that client (verified in firebase-messaging-compat
// 10.14.1). pushClient re-emits it as an 'ostaran:notification' window event. Nothing listened for
// that event, so a push landing while the app was open produced NOTHING on screen — the bell only
// caught up on its next 60-second poll, which is useless for "your class is live".
//
// Sends are data-only, so title/body/link live on payload.data.
type Notice = { title: string; body: string; link: string }

export function ForegroundNotice() {
  const [notice, setNotice] = useState<Notice | null>(null)
  const router = useRouter()

  useEffect(() => {
    function onPush(e: Event) {
      const p = (e as CustomEvent).detail || {}
      const d = p.data || p.notification || {}
      const title = d.title || 'oStaran'
      if (!title && !d.body) return
      setNotice({ title, body: d.body || '', link: d.link || '/dashboard' })
      // Let the bell pick up the matching inbox row straight away rather than up to 60s later.
      window.dispatchEvent(new CustomEvent('ostaran:refresh-notifications'))
    }
    window.addEventListener('ostaran:notification', onPush)
    return () => window.removeEventListener('ostaran:notification', onPush)
  }, [])

  // Time-critical messages ("class is live") shouldn't linger, but shouldn't vanish before it's read.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 12000)
    return () => clearTimeout(t)
  }, [notice])

  if (!notice) return null

  function open() {
    const link = notice!.link
    setNotice(null)
    if (link.startsWith('/')) { router.push(link); return }
    try {
      if (new URL(link).protocol === 'https:') window.open(link, '_blank', 'noopener,noreferrer')
    } catch { /* malformed link — the inbox row is still there */ }
  }

  return (
    <div className="fixed left-0 right-0 z-[100] flex justify-center px-3"
         style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}>
      <div role="status" aria-live="polite"
           className="w-full max-w-md rounded-2xl px-4 py-3 flex items-start gap-3 bg-white"
           style={{ border: '1px solid #dce6f5', boxShadow: '0 10px 30px rgba(15,31,61,0.18)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: 'rgba(37,99,235,0.10)' }}>
          <Bell size={15} style={{ color: '#2563eb' }} />
        </div>
        <button onClick={open} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold truncate" style={{ color: '#0f1f3d' }}>{notice.title}</p>
          {notice.body && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#64748b' }}>{notice.body}</p>}
        </button>
        <button onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 p-1">
          <X size={14} style={{ color: '#94a3b8' }} />
        </button>
      </div>
    </div>
  )
}
