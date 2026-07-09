'use client'

import { useState } from 'react'
import type { FxRates } from '@/lib/currency-config'

export function CurrencyRatesForm({ initial }: { initial: FxRates }) {
  const [usd, setUsd] = useState(String(initial.usd_inr))
  const [eur, setEur] = useState(String(initial.eur_inr))
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/settings/currency-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usd_inr: Number(usd), eur_inr: Number(eur) }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ ok: false, text: j.error ?? 'Failed to save.' })
        return
      }
      setMsg({ ok: true, text: 'Saved — new orders will use these rates.' })
    } catch {
      setMsg({ ok: false, text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="font-medium">1 USD = ₹</span>
          <input
            type="number" min={40} max={500} step="0.01" inputMode="decimal"
            value={usd} onChange={(e) => setUsd(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">1 EUR = ₹</span>
          <input
            type="number" min={40} max={500} step="0.01" inputMode="decimal"
            value={eur} onChange={(e) => setEur(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors"
        >
          {saving ? 'Saving…' : 'Save rates'}
        </button>
        {msg && (
          <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>
        )}
      </div>
    </div>
  )
}
