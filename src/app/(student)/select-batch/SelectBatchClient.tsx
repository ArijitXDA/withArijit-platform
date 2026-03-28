'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, Clock, Users, Calendar, ChevronRight, Loader2 } from 'lucide-react'

interface Batch {
  id: string
  batch_code: string
  label: string
  day_of_week: string
  start_time: string
  start_date: string
  max_seats: number
  seats_filled: number
  notes: string | null
  is_open: boolean
}

interface Course {
  id: string
  name: string
  short_name: string | null
  total_sessions: number | null
  session_duration_mins: number | null
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12  = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function SelectBatchClient({
  course, batches, enrolmentId, studentEmail,
}: {
  course: Course
  batches: Batch[]
  enrolmentId: string | null
  studentEmail: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

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
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-6">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-semibold">Payment Successful — You're In! 🎉</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-3">
              Choose Your Batch
            </h1>
            <p className="text-slate-400 text-base">
              Pick the weekend timeslot that works best for you.<br />
              <span className="text-indigo-400 font-medium">{course.name}</span>
            </p>
            {course.total_sessions && (
              <p className="text-slate-500 text-sm mt-2">
                {course.total_sessions} live sessions · {course.session_duration_mins ?? 90} mins each · Every weekend
              </p>
            )}
          </div>

          {/* Batch cards */}
          <div className="space-y-3 mb-8">
            {batches.map(batch => {
              const seatsLeft  = batch.max_seats - batch.seats_filled
              const almostFull = seatsLeft <= 10
              const isFull     = !batch.is_open || seatsLeft <= 0
              const isSelected = selected === batch.id

              return (
                <button
                  key={batch.id}
                  onClick={() => !isFull && setSelected(batch.id)}
                  disabled={isFull}
                  className="w-full text-left rounded-2xl border p-5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: isSelected
                      ? 'rgba(99,102,241,0.12)'
                      : 'rgba(255,255,255,0.03)',
                    borderColor: isSelected
                      ? 'rgba(99,102,241,0.5)'
                      : 'rgba(255,255,255,0.08)',
                    boxShadow: isSelected ? '0 0 0 1px rgba(99,102,241,0.3)' : 'none',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Radio indicator */}
                      <div className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                        style={{ borderColor: isSelected ? '#6366f1' : 'rgba(255,255,255,0.2)' }}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                      </div>
                      <div>
                        <p className="text-white font-bold text-base">{batch.label}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-400 text-xs">
                            <Calendar className="w-3 h-3" />
                            Starts {formatDate(batch.start_date)}
                          </span>
                          <span className="flex items-center gap-1 text-slate-400 text-xs">
                            <Clock className="w-3 h-3" />
                            {formatTime(batch.start_time)} IST
                          </span>
                          <span className="flex items-center gap-1 text-xs"
                            style={{ color: almostFull ? '#fb923c' : '#4ade80' }}>
                            <Users className="w-3 h-3" />
                            {isFull ? 'Full' : `${seatsLeft} seats left`}
                          </span>
                        </div>
                        {batch.notes && (
                          <p className="text-slate-500 text-xs mt-1.5">{batch.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Popularity badge */}
                    {batch.seats_filled > batch.max_seats * 0.5 && !isFull && (
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
                        Popular
                      </span>
                    )}
                    {isFull && (
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }}>
                        Full
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center mb-4 bg-red-500/10 rounded-xl px-4 py-2">{error}</p>
          )}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={!selected || saving}
            className="w-full py-4 rounded-2xl text-base font-bold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            style={{ background: selected ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(255,255,255,0.08)' }}
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
