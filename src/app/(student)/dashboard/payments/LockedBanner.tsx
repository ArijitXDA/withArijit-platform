'use client'
import { useState } from 'react'
import { Lock, X } from 'lucide-react'

const T = { amber: '#d97706', amberBg: '#fffbeb', amberBorder: '#fde68a', amberDark: '#b45309' }

// Which on-demand surface bounced the student here. Copy is shared — the map keeps
// it future-proof if the three ever need to diverge. Any other value renders nothing.
const LOCK_MSG: Record<string, string> = {
  study:     'Clear your 50-50 balance to unlock your course recordings, study notes & AI Professor.',
  recording: 'Clear your 50-50 balance to unlock your course recordings, study notes & AI Professor.',
  professor: 'Clear your 50-50 balance to unlock your course recordings, study notes & AI Professor.',
}

export function LockedBanner({ reason }: { reason?: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (!reason || !LOCK_MSG[reason] || dismissed) return null
  return (
    <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
      style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}` }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'white', border: `1px solid ${T.amberBorder}` }}>
        <Lock size={15} style={{ color: T.amber }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: T.amberDark }}>Content locked</p>
        <p className="text-xs mt-0.5" style={{ color: T.amber }}>{LOCK_MSG[reason]}</p>
        <p className="text-xs mt-1" style={{ color: T.amber, opacity: 0.85 }}>
          Your live classes stay open — clear the balance below to restore full access.
        </p>
      </div>
      <button onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-lg transition-colors hover:bg-black/5"
        style={{ color: T.amber }} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  )
}
