'use client'
import { useEffect, useState } from 'react'
import { registerPushForStudent } from '@/lib/pushClient'

// A tap-gated prompt to turn on push. Chrome only shows the notification permission
// dialog in response to a real user gesture, so an auto-prompt on page load is often
// silently suppressed — this button is the reliable path (and is what students see).
// Renders nothing once notifications are already on (or unsupported).
type State = 'checking' | 'unsupported' | 'prompt' | 'working' | 'granted' | 'blocked' | 'error'

export default function EnableNotifications() {
  const [state,  setState]  = useState<State>('checking')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported'); return
    }
    const p = Notification.permission
    setState(p === 'granted' ? 'granted' : p === 'denied' ? 'blocked' : 'prompt')
  }, [])

  async function enable() {
    setState('working'); setReason('')
    const res = await registerPushForStudent()
    if (res.ok)                      { setState('granted'); return }
    if (res.reason === 'denied')     { setState('blocked'); return }
    setState('error'); setReason(res.reason || 'unknown')
  }

  if (state === 'checking' || state === 'unsupported' || state === 'granted') return null

  return (
    <div className="mx-4 md:mx-6 mt-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
      style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
      <div className="text-sm" style={{ color: '#1e3a8a' }}>
        <b>🔔 Turn on notifications</b> — class reminders, new study material, and replies to your doubts.
        {state === 'blocked' && (
          <div className="text-xs mt-1" style={{ color: '#b91c1c' }}>
            Notifications are blocked for this site. Tap the 🔒 padlock in the address bar → Site settings →
            Notifications → <b>Allow</b>, then reload this page.
          </div>
        )}
        {state === 'error' && (
          <div className="text-xs mt-1" style={{ color: '#b91c1c' }}>Couldn’t enable — {reason}</div>
        )}
      </div>
      {state !== 'blocked' && (
        <button onClick={enable} disabled={state === 'working'}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white shrink-0 disabled:opacity-50"
          style={{ background: '#2563eb' }}>
          {state === 'working' ? 'Enabling…' : 'Enable'}
        </button>
      )}
    </div>
  )
}
