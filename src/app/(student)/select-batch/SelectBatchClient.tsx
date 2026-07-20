'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, Users, Calendar, ChevronRight, Loader2, Info } from 'lucide-react'

interface Batch {
  id: string
  batch_code: string
  label: string
  day_of_week: string
  start_time: string
  start_date: string
  end_date: string | null
  duration_mins: number
  max_seats: number
  seats_filled: number
  notes: string | null
  is_open: boolean
  course_id: string
  variant: string          // 'weekend9' | 'long26'
  total_sessions: number
}

interface Course {
  id: string
  name: string
  short_name: string | null
  slug: string | null
  total_sessions: number | null
  session_duration_mins: number | null
}

// ── Variant presentation ──────────────────────────────────────────────────────
// Only the styling is static. Session count, duration and weekend-vs-weeknight are
// DERIVED from the batches — hardcoded copy was wrong twice over: it promised
// "2-hour sessions" while Agentic runs 105 min, and "finish in 9 weekends" after
// Agentic Cohort B moved to Monday evenings. Anything restating the schedule as
// prose goes stale the next time a batch moves.
const VARIANT_STYLE: Record<string, { emoji: string; accent: string; order: number }> = {
  weekend9: { emoji: '🔥', accent: '#f97316', order: 0 },  // led with — the intensive
  long26:   { emoji: '📅', accent: '#6366f1', order: 1 },
  rolling:  { emoji: '♾️', accent: '#06b6d4', order: 2 },  // Quantum & AI Continued
}
const FALLBACK_STYLE = { emoji: '📘', accent: '#6366f1', order: 9 }

function variantOrder(v: string) {
  return (VARIANT_STYLE[v] ?? FALLBACK_STYLE).order
}

const WEEKEND_DAYS = new Set(['Saturday', 'Sunday'])

/** 120 → "2-hour" · 60 → "1-hour" · 105 → "1h 45m" · 45 → "45-minute" */
function durationWord(mins: number): string {
  if (mins >= 60 && mins % 60 === 0) return mins === 60 ? '1-hour' : `${mins / 60}-hour`
  const h = Math.floor(mins / 60)
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}-minute`
}

/**
 * `group` is the set of batches sharing this format — or a single batch when naming
 * one selection. Passing the batches in is what keeps the wording honest: a format
 * whose cohorts all sit on Sat/Sun reads "Weekend", one that has moved to weeknights
 * reads "Weeknight", and a mixed format claims neither.
 */
function variantMeta(variant: string, group: Batch[]) {
  const style = VARIANT_STYLE[variant] ?? FALLBACK_STYLE
  const n     = group[0]?.total_sessions ?? 0
  const dur   = group[0]?.duration_mins ?? 60
  const dw    = durationWord(dur)

  if (variant === 'rolling') {
    return {
      ...style,
      label:   'Continued Up-skilling · Monthly',
      tagline: `A ${dw} session every week — continues month to month`,
    }
  }

  const allWeekend = group.length > 0 && group.every(b => WEEKEND_DAYS.has(b.day_of_week))
  const noWeekend  = group.length > 0 && group.every(b => !WEEKEND_DAYS.has(b.day_of_week))
  const dayWord    = allWeekend ? 'Weekend ' : noWeekend ? 'Weeknight ' : ''

  // A long track is defined by its length, not by its key, so a future 16- or
  // 20-session format is described correctly without touching this file.
  if (n >= 20) {
    return {
      ...style,
      label:   `${n}-Week Long Track`,
      tagline: `A steady ${dw} weekly rhythm over ~${Math.round(n / 4.345)} months`,
    }
  }
  return {
    ...style,
    label:   `${n}-Week ${dayWord}Intensive`,
    tagline: `One ${dw} session a week — finish in ${n} ${allWeekend ? 'weekends' : 'weeks'}`,
  }
}

const DAY_ORDER: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7,
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}
/** start_time + duration_mins → formatted end time, e.g. "10:00 AM". */
function endTime(start: string, durationMins: number) {
  const [hh, mm] = start.split(':').map(Number)
  const end = new Date(0, 0, 0, hh, mm + (durationMins || 60))
  const h = end.getHours()
  return `${h % 12 || 12}:${String(end.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SelectBatchClient({
  course, batches, enrolmentId, studentEmail, pendingCount, isSharedGroup,
}: {
  course: Course
  batches: Batch[]
  enrolmentId: string | null
  studentEmail: string
  pendingCount?: number
  isSharedGroup?: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  // Group batches by variant first (weekend9 before long26), days sorted within.
  const batchesByVariant = useMemo(() => {
    const groups: Record<string, Batch[]> = {}
    for (const b of batches) {
      ;(groups[b.variant] ??= []).push(b)
    }
    for (const list of Object.values(groups)) {
      list.sort((a, b) => (DAY_ORDER[a.day_of_week] ?? 9) - (DAY_ORDER[b.day_of_week] ?? 9))
    }
    return Object.entries(groups).sort(
      ([a], [b]) => variantOrder(a) - variantOrder(b)
    )
  }, [batches])

  async function handleConfirm() {
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/student/select-batch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id:     selected,
          course_id:    course.id,
          enrolment_id: enrolmentId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save batch')
      router.push('/dashboard?welcome=1')
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const selectedBatch = batches.find(b => b.id === selected)
  // Named from the single chosen batch, so the summary says "Weeknight" when that is
  // what they picked, even if the format as a whole also runs on weekends.
  const selectedMeta  = selectedBatch ? variantMeta(selectedBatch.variant, [selectedBatch]) : null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #111827 100%)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-center gap-3 px-6 py-4 border-b border-white/5">
        <Image src="/ostaran-logo.png" alt="oStaran" width={100} height={33} className="h-8 w-auto" />
        <span className="text-white/30 text-lg">|</span>
        <Image src="/awa-logo.jpg" alt="AIwithArijit" width={100} height={27} className="h-6 w-auto rounded" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-4">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-semibold">Payment Successful — You're In! 🎉</span>
            </div>

            {pendingCount && pendingCount > 1 && (
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4 ml-2">
                <span className="text-amber-400 text-sm font-semibold">
                  📚 {pendingCount} courses need batch selection
                </span>
              </div>
            )}

            <h1 className="text-3xl font-extrabold text-white mb-3">Choose Your Format & Batch</h1>

            <p className="text-slate-400 text-base">
              You're enrolled in{' '}
              <span className="text-indigo-400 font-semibold">{course.name}</span>
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Same curriculum, same certificate — pick the pace and weekend slot that fits you.
            </p>
          </div>

          {/* Shared group info banner */}
          {isSharedGroup && (
            <div className="rounded-2xl border mb-6 px-5 py-4 flex items-start gap-3"
              style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)' }}>
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-indigo-300 text-sm font-semibold mb-0.5">
                  All timeslots available to you
                </p>
                <p className="text-indigo-400/70 text-xs leading-relaxed">
                  Your programme shares the same world-class curriculum across all audience groups.
                  Every format and timeslot below is available — pick whichever fits your schedule best.
                  Your certificate will be issued under <strong className="text-indigo-300">{course.name}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Batch cards — grouped by variant, then day */}
          <div className="space-y-8 mb-8">
            {batchesByVariant.map(([variant, variantBatches]) => {
              const meta  = variantMeta(variant, variantBatches)
              const nSess = variantBatches[0]?.total_sessions ?? 0
              const dur   = variantBatches[0]?.duration_mins ?? 60
              return (
                <div key={variant}>
                  {/* Variant header */}
                  <div className="rounded-xl border px-4 py-3 mb-3"
                    style={{ background: `${meta.accent}14`, borderColor: `${meta.accent}40` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meta.emoji}</span>
                      <span className="text-white font-bold text-sm">{meta.label}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${meta.accent}26`, color: meta.accent }}>
                        {/* A monthly subscription isn't a fixed-length course — quoting its
                            rolling 52-week horizon as "52 sessions" reads as what you've bought. */}
                        {variant === 'rolling'
                          ? `${dur} min · every week`
                          : `${nSess} sessions · ${dur} min each`}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{meta.tagline}</p>
                  </div>

                  <div className="space-y-2">
                    {variantBatches.map(batch => {
                      const seatsLeft  = batch.max_seats - batch.seats_filled
                      const almostFull = seatsLeft > 0 && seatsLeft <= 10
                      const isFull     = !batch.is_open || seatsLeft <= 0
                      const isSelected = selected === batch.id

                      return (
                        <button
                          key={batch.id}
                          onClick={() => !isFull && setSelected(batch.id)}
                          disabled={isFull}
                          className="w-full text-left rounded-2xl border p-5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            background: isSelected ? `${meta.accent}1f` : 'rgba(255,255,255,0.03)',
                            borderColor: isSelected ? `${meta.accent}99` : 'rgba(255,255,255,0.08)',
                            boxShadow: isSelected ? `0 0 0 1px ${meta.accent}4d` : 'none',
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              {/* Radio */}
                              <div className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                                style={{ borderColor: isSelected ? meta.accent : 'rgba(255,255,255,0.2)' }}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.accent }} />}
                              </div>

                              <div>
                                {/* Day + time range — the primary info */}
                                <p className="text-white font-bold text-base">
                                  {batch.day_of_week} · {formatTime(batch.start_time)} – {endTime(batch.start_time, batch.duration_mins)} IST
                                </p>

                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  <span className="flex items-center gap-1 text-slate-400 text-xs">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(batch.start_date)}
                                    {batch.end_date ? ` – ${formatDate(batch.end_date)}` : ''}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs"
                                    style={{ color: isFull ? '#94a3b8' : almostFull ? '#fb923c' : '#4ade80' }}>
                                    <Users className="w-3 h-3" />
                                    {isFull ? 'Batch Full' : almostFull ? `Only ${seatsLeft} seats left!` : `${seatsLeft} seats available`}
                                  </span>
                                </div>

                                {batch.notes && (
                                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{batch.notes}</p>
                                )}
                              </div>
                            </div>

                            {/* Right badges */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              {isFull && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }}>
                                  Full
                                </span>
                              )}
                              {!isFull && almostFull && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
                                  Almost Full
                                </span>
                              )}
                              {!isFull && batch.seats_filled > batch.max_seats * 0.5 && !almostFull && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                                  Popular
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selected batch summary */}
          {selectedBatch && selectedMeta && (
            <div className="rounded-2xl border mb-4 px-5 py-4"
              style={{
                background: `${selectedMeta.accent}12`,
                borderColor: `${selectedMeta.accent}4d`,
              }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: selectedMeta.accent }}>
                Your Selection
              </p>
              <p className="text-white font-semibold">
                {selectedMeta.emoji} {selectedMeta.label}
                {' · '}
                {selectedBatch.day_of_week} {formatTime(selectedBatch.start_time)} IST
              </p>
              <p className="text-slate-400 text-sm mt-0.5">
                {course.name} ·{' '}
                {selectedBatch.variant === 'rolling'
                  ? 'weekly · continues monthly'
                  : `${selectedBatch.total_sessions} sessions`} ·{' '}
                {selectedBatch.variant === 'rolling' ? 'from ' : ''}
                {formatDate(selectedBatch.start_date)}
                {selectedBatch.end_date ? ` – ${formatDate(selectedBatch.end_date)}` : ''}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center mb-4 bg-red-500/10 rounded-xl px-4 py-2 border border-red-500/20">
              {error}
            </p>
          )}

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={!selected || saving}
            className="w-full py-4 rounded-2xl text-base font-bold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            style={{
              background: selected
                ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                : 'rgba(255,255,255,0.08)',
            }}
          >
            {saving
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Confirming…</>
              : <><span>Confirm Batch & Go to Dashboard</span><ChevronRight className="w-5 h-5" /></>
            }
          </button>

          <p className="text-center text-slate-600 text-xs mt-4">
            You can contact us to change your batch later if needed
          </p>
        </div>
      </div>
    </div>
  )
}
