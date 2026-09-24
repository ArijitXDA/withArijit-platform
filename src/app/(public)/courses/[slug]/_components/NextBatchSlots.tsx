'use client'

// ── Timezone-aware "Next batch" list ─────────────────────────────────────────
// Batch times are stored as IST wall-clock (awa_batches.start_time). We build the
// absolute instant with an explicit +05:30 offset, then render it in the VIEWER's
// timezone (Intl uses the browser's zone). SSR + first client paint use Asia/Kolkata
// (so server and pre-hydration markup match — no hydration mismatch); after mount we
// switch to the viewer's detected zone. A user in India sees IST, one in the US sees ET.

import { useState, useEffect } from 'react'

export type BatchSlot = { date: string; time: string; day: string }

function shortZone(tz: string) {
  return tz.split('/').pop()?.replace(/_/g, ' ') ?? tz
}

export function NextBatchSlots({ slots }: { slots: BatchSlot[] }) {
  const [tz, setTz] = useState<string | null>(null)
  useEffect(() => {
    try { setTz(Intl.DateTimeFormat().resolvedOptions().timeZone) } catch { /* keep IST */ }
  }, [])

  if (!slots?.length) return <span>Enrol in the upcoming batch now</span>

  const zone = tz ?? 'Asia/Kolkata'
  const fmt = (s: BatchSlot) => {
    const dt = new Date(`${s.date}T${s.time}:00+05:30`)   // IST wall-clock → absolute instant
    if (isNaN(dt.getTime())) return { day: s.day, time: s.time }
    return {
      day:  dt.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: zone }),
      time: dt.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short', timeZone: zone }),
    }
  }

  const first = fmt(slots[0])
  return (
    <div className="space-y-1">
      <span>
        Next batch starts{' '}
        <span className="batch-date-neon text-base align-middle">{first.day}, {first.time}</span>
      </span>
      {slots.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {slots.slice(1).map((s, i) => {
            const f = fmt(s)
            return (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-md whitespace-nowrap"
                style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
                {f.day} · {f.time}
              </span>
            )
          })}
        </div>
      )}
      <div className="text-[10px] text-slate-500">
        Times shown in your timezone{tz ? ` (${shortZone(tz)})` : ' (IST)'}
      </div>
    </div>
  )
}
