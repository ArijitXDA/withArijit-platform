'use client'
import { useState } from 'react'
import { CheckCircle2, Clock, Mail, RotateCcw, Send, Loader2, AlertTriangle, Users, GraduationCap, Plus, Trash2 } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  unfilled:      { label: 'Unfilled',      color: '#94a3b8', bg: '#f1f5f9', icon: Clock         },
  invited:       { label: 'Invited',       color: '#3b82f6', bg: '#eff6ff', icon: Mail           },
  opened:        { label: 'Link Opened',   color: '#f59e0b', bg: '#fffbeb', icon: Clock          },
  signed_up:     { label: 'Signed Up',     color: '#8b5cf6', bg: '#f5f3ff', icon: Clock          },
  batch_selected:{ label: 'Batch Selected',color: '#10b981', bg: '#ecfdf5', icon: Clock          },
  enrolled:      { label: 'Enrolled ✓',   color: '#16a34a', bg: '#dcfce7', icon: CheckCircle2   },
  expired:       { label: 'Expired',       color: '#ef4444', bg: '#fef2f2', icon: AlertTriangle  },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n)

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface SeatRow {
  id: string; seat_number: number; invitee_name?: string; invitee_email?: string
  invitee_mobile?: string; invite_sent_at?: string; invite_claimed_at?: string
  status: string; resend_count: number
}

interface NewSeat { name: string; email: string; mobile: string }

export default function ManageClient({
  ge, seats: initialSeats, batchInfo, manageToken,
}: {
  ge: any; seats: SeatRow[]; batchInfo: any; manageToken: string
}) {
  const [seats,       setSeats]       = useState<SeatRow[]>(initialSeats)
  const [newSeats,    setNewSeats]    = useState<NewSeat[]>([{ name: '', email: '', mobile: '' }])
  const [showAdd,     setShowAdd]     = useState(initialSeats.length === 0)
  const [submitting,  setSubmitting]  = useState(false)
  const [resending,   setResending]   = useState<string | null>(null)
  const [toast,       setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [error,       setError]       = useState('')

  const filled    = seats.length
  const remaining = ge.quantity - filled
  const enrolled  = seats.filter(s => s.status === 'enrolled').length

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function updateNew(i: number, k: keyof NewSeat, v: string) {
    setNewSeats(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s))
  }

  function addRow() {
    if (newSeats.length < remaining) setNewSeats(p => [...p, { name: '', email: '', mobile: '' }])
  }

  function removeRow(i: number) {
    if (newSeats.length > 1) setNewSeats(p => p.filter((_, idx) => idx !== i))
  }

  async function submitSeats() {
    const filled = newSeats.filter(s => s.name.trim() && s.email.trim() && s.mobile.trim())
    if (filled.length === 0) { setError('Please fill at least one complete row'); return }
    setSubmitting(true); setError('')
    try {
      const res  = await fetch('/api/group-enrol/submit-seats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manage_token: manageToken, seats: filled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')
      showToast(`${data.processed} invite${data.processed !== 1 ? 's' : ''} sent!`)
      // Refresh page to show new seats
      window.location.reload()
    } catch (e: any) {
      setError(e.message); setSubmitting(false)
    }
  }

  async function resendInvite(seatId: string) {
    setResending(seatId)
    try {
      const res  = await fetch('/api/group-enrol/resend-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manage_token: manageToken, seat_id: seatId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`Invite resent! ${data.remaining_resends} resend${data.remaining_resends !== 1 ? 's' : ''} remaining.`)
      setSeats(prev => prev.map(s => s.id === seatId
        ? { ...s, resend_count: s.resend_count + 1 }
        : s
      ))
    } catch (e: any) {
      showToast(e.message, 'err')
    } finally {
      setResending(null)
    }
  }

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all
          ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="bg-black px-3 py-1.5 rounded-lg inline-block mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ostaran-logo.png" alt="oStaran" className="h-5 w-auto" />
            </div>
            <h1 className="text-lg font-extrabold text-gray-900">Group Enrolment Management</h1>
            <p className="text-sm text-gray-500">{ge.course_name} · {ge.purchaser_name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-indigo-700">{enrolled}/{ge.quantity}</p>
            <p className="text-xs text-gray-500">seats activated</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Seats',   value: ge.quantity,              color: '#64748b' },
            { label: 'Seats Filled',  value: filled,                   color: '#3b82f6' },
            { label: 'Activated',     value: enrolled,                 color: '#16a34a' },
            { label: 'Remaining',     value: remaining,                color: remaining > 0 ? '#f59e0b' : '#16a34a' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Course + payment info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Course</p>
              <p className="font-semibold text-gray-900">{ge.course_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Amount Paid</p>
              <p className="font-semibold text-gray-900">{fmt(Number(ge.total_payable))}</p>
              {Number(ge.total_discount) > 0 && (
                <p className="text-xs text-green-600">Saved {fmt(Number(ge.total_discount))}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Batch</p>
              <p className="font-semibold text-gray-900">
                {batchInfo ? `${batchInfo.label} · ${batchInfo.day_of_week} ${batchInfo.start_time?.slice(0,5)} IST` : 'Students choose their own'}
              </p>
            </div>
          </div>
        </div>

        {/* Existing seats */}
        {seats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Invited Students</h2>
              <span className="text-xs text-gray-400">{seats.length} of {ge.quantity} seats filled</span>
            </div>
            <div className="divide-y divide-gray-50">
              {seats.map(seat => {
                const cfg      = STATUS_CONFIG[seat.status] ?? STATUS_CONFIG.invited
                const canResend = !['enrolled','expired'].includes(seat.status) && seat.resend_count < 3
                return (
                  <div key={seat.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: '#eef2ff', color: '#4f46e5' }}>
                      {seat.seat_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{seat.invitee_name}</p>
                      <p className="text-xs text-gray-500 truncate">{seat.invitee_email}</p>
                    </div>
                    {seat.invite_sent_at && (
                      <p className="text-xs text-gray-400 shrink-0 hidden sm:block">
                        Sent {fmtDate(seat.invite_sent_at)}
                      </p>
                    )}
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
                      style={{ color: cfg.color, background: cfg.bg }}>
                      {cfg.label}
                    </span>
                    {canResend && (
                      <button onClick={() => resendInvite(seat.id)} disabled={resending === seat.id}
                        className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50"
                        title={`Resend invite (${3 - seat.resend_count} remaining)`}>
                        {resending === seat.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <RotateCcw size={14} />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add more seats */}
        {remaining > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">
                {seats.length === 0 ? 'Add Your Students' : `Add More Students`}
                <span className="ml-2 text-xs text-gray-400 font-normal">{remaining} seat{remaining !== 1 ? 's' : ''} remaining</span>
              </h2>
              {!showAdd && (
                <button onClick={() => setShowAdd(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <Plus size={13} /> Add
                </button>
              )}
            </div>

            {showAdd && (
              <div className="p-5 space-y-3">
                <p className="text-xs text-gray-500">
                  Fill in the details for each student. Each student will receive a personal invitation link via email.
                </p>

                {/* Header row */}
                <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 text-xs font-semibold text-gray-400 px-1">
                  <span>Full Name *</span>
                  <span>Email *</span>
                  <span>Mobile *</span>
                  <span />
                </div>

                {newSeats.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 items-center">
                    <input type="text" value={s.name} onChange={e => updateNew(i, 'name', e.target.value)}
                      placeholder="Full name" className={inp} />
                    <input type="email" value={s.email} onChange={e => updateNew(i, 'email', e.target.value)}
                      placeholder="email@example.com" className={inp} />
                    <input type="tel" value={s.mobile} onChange={e => updateNew(i, 'mobile', e.target.value)}
                      placeholder="9876543210" className={inp} maxLength={10} />
                    <button onClick={() => removeRow(i)} disabled={newSeats.length === 1}
                      className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-0 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {newSeats.length < remaining && (
                  <button onClick={addRow}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold py-1">
                    <Plus size={13} /> Add another student
                  </button>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    <AlertTriangle size={13} /> {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={submitSeats} disabled={submitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    {submitting
                      ? <><Loader2 size={15} className="animate-spin" /> Sending invites…</>
                      : <><Send size={15} /> Send Invitations</>}
                  </button>
                  {seats.length > 0 && (
                    <button onClick={() => setShowAdd(false)}
                      className="px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All seats activated */}
        {remaining === 0 && enrolled === ge.quantity && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
            <p className="font-bold text-green-900">All {ge.quantity} seats have been activated! 🎉</p>
            <p className="text-sm text-green-700 mt-1">Every student is now enrolled in {ge.course_name}.</p>
          </div>
        )}

        <p className="text-xs text-center text-gray-400">
          Bookmark this page — it's your management link. No login required.
          For support: <a href="mailto:ai@ostaran.com" className="text-indigo-500 hover:underline">ai@ostaran.com</a>
        </p>
      </div>
    </div>
  )
}
