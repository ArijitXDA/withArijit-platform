'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface Member { id: string; tier: string; expires_at: string | null; display_name: string; points?: number; rank?: string; badges?: string[] }
interface Props  { onJoin: (m: Member) => void; onClose: () => void }

export function GuestModal({ onJoin, onClose }: Props) {
  const [email,    setEmail]    = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required'); return }
    setLoading(true); setError('')
    const res  = await fetch('/api/community/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), whatsapp: whatsapp.trim() || undefined, display_name: name.trim() || undefined }),
    })
    const data = await res.json()
    if (data.expired) { window.location.href = 'https://www.ostaran.com/masterclass'; return }
    if (!res.ok || data.error) { setError(data.error || 'Something went wrong'); setLoading(false); return }
    onJoin(data.member)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(135deg,#0d0b2b,#130d3d)', border: '1px solid rgba(139,92,246,0.25)' }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b"
          style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              📈
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Join the Community</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
                Ask Ari + 1,000+ AI learners are here
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors"
            style={{ color: '#475569', background: 'rgba(255,255,255,0.04)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Points teaser */}
        <div className="mx-6 mt-4 mb-2 rounded-xl px-3 py-2.5 text-xs"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
          <strong>Earn points for every contribution:</strong> Ask (15 pts) · Answer (10 pts) · Best Answer (50 pts) · Reach 3,000 pts → FREE course!
        </div>

        <div className="mx-6 mb-4 rounded-xl px-3 py-2 text-xs"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', color: '#a78bfa' }}>
          <strong>Free access:</strong> 60 days as guest · 30 days post-webinar · Lifetime if enrolled
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          {[
            { label: 'Email *', val: email, set: setEmail, type: 'email', ph: 'you@example.com', required: true,
              hint: 'We check this against our learner records to set your access tier.' },
            { label: 'Display name', val: name, set: setName, type: 'text', ph: 'How should others see you?', maxLength: 40 },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(148,163,184,0.8)' }}>{f.label}</label>
              <input type={f.type} required={f.required} autoFocus={f.type === 'email'}
                value={f.val} onChange={e => f.set(e.target.value)}
                placeholder={f.ph} maxLength={(f as any).maxLength}
                className="w-full rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.25)', color: '#e2e8f0' }}
              />
              {(f as any).hint && <p className="text-[10px] mt-1" style={{ color: 'rgba(100,116,139,0.7)' }}>{(f as any).hint}</p>}
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(148,163,184,0.8)' }}>WhatsApp (optional)</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 rounded-xl text-sm font-medium shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.25)', color: '#94a3b8' }}>
                +91
              </span>
              <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="9876543210" maxLength={10}
                className="flex-1 rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.25)', color: '#e2e8f0' }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading || !email.trim()}
            className="w-full py-3.5 font-bold text-sm rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : 'Enter Community →'}
          </button>

          <p className="text-[11px] text-center" style={{ color: 'rgba(100,116,139,0.7)' }}>
            Access expired?{' '}
            <a href="https://www.ostaran.com/masterclass" className="font-semibold" style={{ color: '#a78bfa' }}>
              Register for the AI Masterclass
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
