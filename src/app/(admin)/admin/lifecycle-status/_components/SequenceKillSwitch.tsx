'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Power } from 'lucide-react'

interface Props {
  sequenceKey: string
  isActive:    boolean
}

export function SequenceKillSwitch({ sequenceKey, isActive }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleToggle() {
    if (busy) return
    const action = isActive ? 'Pause' : 'Activate'
    if (!confirm(`${action} sequence "${sequenceKey}"?`)) return

    setBusy(true)
    try {
      const res = await fetch('/api/admin/lifecycle/toggle-sequence', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sequence_key: sequenceKey, target_state: !isActive }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        alert(`Failed to toggle: ${json.error || res.statusText}`)
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-colors ' +
        (isActive
          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100') +
        (busy ? ' opacity-60 cursor-wait' : '')
      }
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
      {isActive ? 'Pause' : 'Activate'}
    </button>
  )
}
