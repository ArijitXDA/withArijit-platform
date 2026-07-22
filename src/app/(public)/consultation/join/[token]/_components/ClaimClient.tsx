'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export function ClaimClient({ token }: { token: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function accept() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/consultation/claim-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j.error ?? 'Could not accept. Please try again.')
        setBusy(false)
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setError('Network error. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={accept}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Activating…
          </>
        ) : (
          'Accept my seat'
        )}
      </button>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  )
}
