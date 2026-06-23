'use client'
import { useState } from 'react'

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  }) + ' IST'
}

const inp = 'w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-indigo-500'

export default function WebinarRegisterClient({ slug, webinar, course, mentor, partnerCode }: { slug: string; webinar: any; course: any; mentor: any; partnerCode: string | null }) {
  const [f, setF] = useState({ full_name: '', email: '', mobile: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')
  const [done, setDone] = useState<{ meeting_link: string | null } | null>(null)
  const set = (k: keyof typeof f) => (e: any) => setF(p => ({ ...p, [k]: e.target.value }))

  async function register() {
    setErr('')
    if (!f.full_name.trim() || !f.email.trim()) { setErr('Please enter your name and email.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/webinar/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, ...f, partner_code: partnerCode }),
      })
      const j = await res.json(); if (!res.ok) throw new Error(j.error || 'Failed')
      setDone({ meeting_link: j.meeting_link ?? null })
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg,#05051a,#0d0b2b 55%,#0a1628)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
            🔴 Free Live Webinar
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">{webinar.title}</h1>
          {mentor?.full_name && (
            <p className="text-slate-300 text-sm mt-2">with <b>{mentor.full_name}</b>{mentor.trainer_title ? ` · ${mentor.trainer_title}` : ''}</p>
          )}
          <p className="text-indigo-300 font-semibold text-sm mt-3">📅 {fmtWhen(webinar.scheduled_at)}</p>
          {course?.name && <p className="text-slate-500 text-xs mt-1">A preview of: {course.name}</p>}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          {done ? (
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-lg font-bold text-gray-900">You&apos;re registered!</h2>
              <p className="text-gray-500 text-sm mt-1">See you on {fmtWhen(webinar.scheduled_at)}. You&apos;ll get a reminder with the join link.</p>
              {done.meeting_link && (
                <a href={done.meeting_link} target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-block w-full px-5 py-3 rounded-xl text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                  Join the webinar →
                </a>
              )}
              <p className="text-gray-400 text-[11px] mt-3">Save this link — the session opens at the scheduled time.</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Register free</h2>
              <p className="text-gray-500 text-sm mb-4">Save your seat — it&apos;s live, not recorded slides.</p>
              <div className="space-y-3">
                <input value={f.full_name} onChange={set('full_name')} placeholder="Full name" className={inp} />
                <input type="email" value={f.email} onChange={set('email')} placeholder="Email" className={inp} />
                <input value={f.mobile} onChange={set('mobile')} placeholder="WhatsApp number (optional)" className={inp} />
                {err && <p className="text-red-600 text-sm">{err}</p>}
                <button onClick={register} disabled={busy}
                  className="w-full px-5 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                  {busy ? 'Registering…' : 'Reserve my free seat'}
                </button>
              </div>
            </>
          )}
        </div>
        <p className="text-center text-slate-600 text-[11px] mt-4">Powered by oStaran · www.ostaran.com</p>
      </div>
    </div>
  )
}
