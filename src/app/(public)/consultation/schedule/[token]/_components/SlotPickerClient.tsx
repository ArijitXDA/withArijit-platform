'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, CheckCircle2, Calendar } from 'lucide-react'

const IST_DAYS = [1, 2, 4] // Mon, Tue, Thu (ISO weekday)

function allowedTimes(durationMins: number): string[] {
  const out: string[] = []
  for (const [from, to] of [
    [600, 720], // 10:00–12:00
    [1020, 1140], // 17:00–19:00
  ]) {
    for (let m = from; m + durationMins <= to; m += durationMins) {
      out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
    }
  }
  return out
}

const ymd = (y: number, mo: number, d: number) =>
  `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// IST wall-clock → UTC instant (IST = UTC+5:30, no DST).
function istToUtc(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, hh - 5, mm - 30))
}

export function SlotPickerClient({
  token,
  durationSku,
  sessions,
  buyerTimezone,
}: {
  token: string
  durationSku: string
  sessions: number
  buyerTimezone: string | null
}) {
  const durationMins = durationSku === 'min30' ? 30 : 60
  const times = useMemo(() => allowedTimes(durationMins), [durationMins])

  const [tz, setTz] = useState('Asia/Kolkata')
  const [dates, setDates] = useState<string[]>([])
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

    // Next ~14 Mon/Tue/Thu dates in IST, starting tomorrow.
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0')
    const start = new Date(Date.UTC(get('year'), get('month') - 1, get('day') + 1, 12))
    const out: string[] = []
    for (let i = 0; i < 28 && out.length < 14; i++) {
      const iso = ((start.getUTCDay() + 6) % 7) + 1
      if (IST_DAYS.includes(iso)) out.push(ymd(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()))
      start.setUTCDate(start.getUTCDate() + 1)
    }
    setDates(out)
    setTime(times[0] ?? '')
  }, [buyerTimezone, times])

  const preview = useMemo(() => {
    if (!date || !time) return []
    const [y, mo, d] = date.split('-').map(Number)
    const rows: string[] = []
    for (let n = 0; n < sessions; n++) {
      const startUtc = istToUtc(ymd(y, mo, d + 7 * n), time)
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
        <p className="text-gray-600 mt-2">Your session{sessions > 1 ? 's are' : ' is'} scheduled. A calendar invite and the join link are on their way to your inbox.</p>
        {done.joinUrl && (
          <a href={done.joinUrl} className="inline-block mt-5 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700">
            Join link
          </a>
        )}
      </div>
    )
  }

  const inputCls = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:border-indigo-500 focus:outline-none'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Date (Mon / Tue / Thu, IST)</span>
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
          <select className={inputCls} value={time} onChange={(e) => setTime(e.target.value)}>
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
