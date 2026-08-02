'use client'
import { useState } from 'react'

const SKY = '#0ea5e9'
const NAVY = '#0f1f3d'

interface Cert { cert_id: string; certificate_url: string; course_name: string }

// One-tap "Add to LinkedIn certifications", pre-filled with Star Analytix as the issuer.
function linkedInAddUrl(cert: Cert): string {
  const p = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: `${cert.course_name} — Participation Certificate`,
    organizationName: 'Star Analytix',
    certUrl: cert.certificate_url,
    certId: cert.cert_id,
  })
  return `https://www.linkedin.com/profile/add?${p.toString()}`
}

function CertReady({ firstName, cert }: { firstName: string; cert: Cert }) {
  const courseName = cert.course_name
  return (
    <div className="text-center">
      <div className="text-4xl mb-2">🎉</div>
      <h1 className="text-2xl font-extrabold" style={{ color: NAVY }}>Your certificate is ready{firstName ? `, ${firstName}` : ''}!</h1>
      <p className="text-sm mt-2 text-slate-600">Your <b>{courseName}</b> participation certificate is live. Put it to work 👇</p>

      <div className="mt-6 rounded-2xl overflow-hidden border" style={{ borderColor: '#dce6f5' }}>
        <div className="aspect-[1.4/1] bg-slate-50 flex items-center justify-center">
          <iframe src={cert.certificate_url} title="Your certificate" className="w-full h-full" style={{ border: 0 }} />
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: `linear-gradient(135deg, ${SKY}, #2563eb)` }}>
          📄 View &amp; download your certificate
        </a>
        <a href={linkedInAddUrl(cert)} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: '#0a66c2' }}>
          in  Add to LinkedIn (tag Star Analytix)
        </a>
      </div>

      <div className="mt-5 rounded-xl p-3.5 text-left" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <p className="text-xs font-bold" style={{ color: '#0369a1' }}>Make it count 💡</p>
        <ul className="text-xs mt-1.5 space-y-1 text-slate-600 list-disc pl-4">
          <li>Post it on LinkedIn tagging <b>Star Analytix</b> — recruiters are actively screening for AI skills.</li>
          <li>Add it to your résumé under <b>Certifications</b>.</li>
        </ul>
      </div>

      <p className="text-[11px] text-slate-400 mt-5">Certificate ID: {cert.cert_id} · verifiable at oStaran.com</p>
    </div>
  )
}

export default function RateClient({ token, firstName, fullName, courseName, alreadyCert }:
  { token: string; firstName: string; fullName: string; courseName: string; alreadyCert: Cert | null }) {
  const [rating, setRating]   = useState(0)
  const [hover, setHover]     = useState(0)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState('')
  const [cert, setCert]       = useState<Cert | null>(alreadyCert)

  async function submit() {
    if (!rating) { setErr('Please tap a star to rate the session.'); return }
    setBusy(true); setErr('')
    try {
      const res  = await fetch('/api/webinar/rate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, rating, feedback }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.certificate_url) setCert({ cert_id: data.cert_id, certificate_url: data.certificate_url, course_name: data.course_name || courseName })
      else setErr(data.error || 'Something went wrong — please try again.')
    } catch { setErr('Network error — please try again.') }
    finally { setBusy(false) }
  }

  const active = hover || rating

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(160deg, #eff6ff, #ffffff 40%)` }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-xl" style={{ border: '1px solid #dce6f5' }}>
        {cert ? (
          <CertReady firstName={firstName} cert={cert} />
        ) : (
          <div>
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-3"
                style={{ background: '#e0f2fe', color: '#0369a1' }}>🎓 oStaran AI Webinar</div>
              <h1 className="text-xl font-extrabold" style={{ color: NAVY }}>How was the session{firstName ? `, ${firstName}` : ''}?</h1>
              <p className="text-sm mt-1.5 text-slate-600">
                Rate it in 10 seconds and your <b>LinkedIn-ready participation certificate</b> unlocks instantly.
              </p>
            </div>

            <div className="flex justify-center gap-1.5 mt-6">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} type="button"
                  onClick={() => { setRating(s); setErr('') }}
                  onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                  className="text-4xl leading-none transition-transform hover:scale-110"
                  style={{ filter: s <= active ? 'none' : 'grayscale(1) opacity(0.35)' }}
                  aria-label={`${s} star${s > 1 ? 's' : ''}`}>⭐</button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-xs mt-2 font-semibold" style={{ color: SKY }}>
                {['', 'Thanks for the honesty', 'Noted — we’ll do better', 'Good', 'Great!', 'Awesome — thank you!'][rating]}
              </p>
            )}

            <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="Anything you'd like to share? (optional)"
              rows={3} maxLength={2000}
              className="w-full mt-5 px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: NAVY }} />

            {err && <p className="text-sm mt-3 text-red-600">{err}</p>}

            <button onClick={submit} disabled={busy}
              className="w-full mt-5 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${SKY}, #2563eb)` }}>
              {busy ? 'Unlocking your certificate…' : 'Submit & get my certificate 🎓'}
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-3">Powered by oStaran · Star Analytix Pvt. Ltd.</p>
          </div>
        )}
      </div>
    </div>
  )
}
