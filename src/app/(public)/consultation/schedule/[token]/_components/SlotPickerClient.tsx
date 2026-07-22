'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, CheckCircle2, Calendar } from 'lucide-react'
import { InviteAttendees } from './InviteAttendees'

// IST wall-clock → UTC instant (IST = UTC+5:30, no DST).
function istToUtc(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, hh - 5, mm - 30))
}

export function SlotPickerClient({
  token,
  sessions,
  attendees,
  buyerTimezone,
}: {
  token: string
  sessions: number
  attendees: number
  buyerTimezone: string | null
}) {
  const [tz, setTz] = useState('Asia/Kolkata')
  const [slots, setSlots] = useState<{ date: string; time: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ joinUrl: string | null; sessions: { date: string; time: string }[] } | null>(null)

  useEffect(() => {
    let resolved = 'Asia/Kolkata'
    try {
      resolved = buyerTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
    } catch {
      resolved = buyerTimezone || 'Asia/Kolkata'
    }
    setTz(resolved)

    fetch(`/api/consultation/available-slots?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((j) => setSlots(Array.isArray(j.slots) ? j.slots : []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [token, buyerTimezone])

  const byDate = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const s of slots) {
      const a = m.get(s.date) ?? []
      a.push(s.time)
      m.set(s.date, a)
    }
    return m
  }, [slots])
  const dates = useMemo(() => Array.from(byDate.keys()), [byDate])
  const times = date ? byDate.get(date) ?? [] : []

  // Keep the selected time valid for the selected date.
  useEffect(() => {
    if (date && !(byDate.get(date) ?? []).includes(time)) setTime(byDate.get(date)?.[0] ?? '')
  }, [date, byDate, time])

  const preview = useMemo(() => {
    if (!date || !time) return []
    const [y, mo, d] = date.split('-').map(Number)
    const rows: string[] = []
    for (let n = 0; n < sessions; n++) {
      // Month-overflow-safe date for the nth weekly session.
      const anchor = new Date(Date.UTC(y, mo - 1, d + 7 * n, 12))
      const ds = `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, '0')}-${String(anchor.getUTCDate()).padStart(2, '0')}`
      const startUtc = istToUtc(ds, time)
      rows.push(
        new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }).format(startUtc),
      )
    }
    return rows
  }, [date, time, sessions, tz])

  async function submit() {
    setError('')
    if (!date || !time) {
      setError('Please pick a date and time.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/consultation/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_token: token, start_date: date, start_time: time }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j.error ?? 'Could not schedule. Please try again.')
        setBusy(false)
        return
      }
      setDone({ joinUrl: j.joinUrl ?? null, sessions: j.sessions ?? [] })
    } catch {
      setError('Network error. Please try again.')
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-white p-8 text-center">
        <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
        <h2 className="text-2xl font-extrabold text-gray-900">You&apos;re booked</h2>
        <p className="text-gray-600 mt-2">
          Your session{sessions > 1 ? 's are' : ' is'} scheduled. A calendar invite and the join link are on their way to your inbox.
        </p>
        {done.joinUrl && (
          <a href={done.joinUrl} className="inline-block mt-5 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700">
            Join link
          </a>
        )}
        {attendees > 1 && <InviteAttendees token={token} maxInvites={attendees - 1} />}
      </div>
    )
  }

  const inputCls = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:border-indigo-500 focus:outline-none'

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Finding available times…
      </div>
    )
  }
  if (!dates.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
        No open slots in the next few weeks. Please email{' '}
        <a href="mailto:ai@ostaran.com" className="text-indigo-600 font-semibold">ai@ostaran.com</a> and we&apos;ll find a time.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Date (IST)</span>
          <select className={inputCls} value={date} onChange={(e) => setDate(e.target.value)}>
            <option value="">Select a date…</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'short', day: 'numeric' }).format(
                  istToUtc(d, '12:00'),
                )}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Start time (IST)</span>
          <select className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} disabled={!date}>
            {times.map((t) => (
              <option key={t} value={t}>
                {t} IST
              </option>
            ))}
          </select>
        </label>
      </div>

      {preview.length > 0 && (
        <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 mb-2">
            <Calendar size={13} /> Your session{preview.length > 1 ? 's' : ''} · {tz.split('/').pop()?.replace(/_/g, ' ')} time
          </p>
          <ul className="space-y-1 text-sm text-gray-800">
            {preview.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={busy || !date || !time}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Booking…
          </>
        ) : (
          'Confirm booking'
        )}
      </button>
    </div>
  )
}
