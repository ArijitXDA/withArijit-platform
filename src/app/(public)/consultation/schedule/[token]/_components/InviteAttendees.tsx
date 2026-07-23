'use client'

import { useState } from 'react'
import { Loader2, Plus, X, CheckCircle2 } from 'lucide-react'

export function InviteAttendees({ token, maxInvites }: { token: string; maxInvites: number }) {
  const [rows, setRows] = useState<string[]>([''])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(0)
  const [links, setLinks] = useState<{ email: string; url: string }[]>([])
  const [copied, setCopied] = useState('')

  if (maxInvites < 1) return null

  function setRow(i: number, v: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? v : r)))
  }
  function addRow() {
    setRows((prev) => (prev.length < maxInvites ? [...prev, ''] : prev))
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      /* clipboard blocked — the link is still shown in the field for manual copy */
    }
  }

  async function submit() {
    setError('')
    const emails = rows.map((e) => e.trim()).filter(Boolean).map((email) => ({ email }))
    if (!emails.length) {
      setError('Add at least one email.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/consultation/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_token: token, emails }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j.error ?? 'Could not send invites.')
        setBusy(false)
        return
      }
      setSent((s) => s + (j.invited ?? emails.length))
      setLinks((prev) => [...prev, ...((Array.isArray(j.links) ? j.links : []) as { email: string; url: string }[])])
      setRows([''])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-left">
      <h3 className="font-bold text-gray-900">Invite your team</h3>
      <p className="text-sm text-gray-600 mt-1">
        Your booking covers up to {maxInvites + 1} people. Invite up to {maxInvites} more — they&apos;ll get the
        join link and the recordings.
      </p>

      {sent > 0 && (
        <div className="mt-3">
          <p className="inline-flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 size={15} /> {sent} invite{sent === 1 ? '' : 's'} sent.
          </p>
          {links.length > 0 && (
            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-2">
                We&apos;ve emailed each person. If they don&apos;t see it (tell them to check spam), copy their
                link and share it directly:
              </p>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l.url}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">{l.email}</span>
                      <button
                        type="button"
                        onClick={() => copy(l.url)}
                        className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        {copied === l.url ? 'Copied ✓' : 'Copy link'}
                      </button>
                    </div>
                    <input
                      readOnly
                      value={l.url}
                      onFocus={(e) => e.currentTarget.select()}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="email"
              value={r}
              onChange={(e) => setRow(i, e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            />
            {rows.length > 1 && (
              <button onClick={() => removeRow(i)} className="text-gray-400 hover:text-gray-700" aria-label="Remove">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        {rows.length < maxInvites && (
          <button onClick={addRow} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            <Plus size={15} /> Add another
          </button>
        )}
        <button
          onClick={submit}
          disabled={busy}
          className="ml-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Sending…
            </>
          ) : (
            'Send invites'
          )}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
