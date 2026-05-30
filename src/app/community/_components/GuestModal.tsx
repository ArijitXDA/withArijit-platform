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

  const inputCls = "w-full rounded-xl px-3.5 py-3 text-sm outline-none transition-all border focus:border-violet-400"
  const inputStyle = { border: '1px solid #e5e7eb', color: '#111827', background: '#f9fafb' }
  const labelStyle = { color: '#374151' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white border" style={{ borderColor: '#e5e7eb' }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b" style={{ borderColor: '#f3f4f6' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              💬
            </div>
            <div>
              <h2 className="text-lg font-extrabold" style={{ color: '#111827' }}>Join the Community</h2>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Ask Ari + 1,000+ AI learners are here</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-gray-100" style={{ color: '#9ca3af' }}>
            <X size={18} />
          </button>
        </div>

        {/* Points teaser */}
        <div className="mx-6 mt-4 mb-2 rounded-xl px-3 py-2.5 text-xs border"
          style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
          <strong>Earn points for every contribution:</strong> Ask (15 pts) · Answer (10 pts) · Best Answer (50 pts) · Reach 3,000 pts → FREE course!
        </div>
        <div className="mx-6 mb-4 rounded-xl px-3 py-2 text-xs border"
          style={{ background: '#f5f3ff', borderColor: '#ddd6fe', color: '#7c3aed' }}>
          <strong>Free access:</strong> 60 days as guest · 30 days post-webinar · Lifetime if enrolled
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={labelStyle}>Email *</label>
            <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" className={inputCls} style={inputStyle} />
            <p className="text-[10px] mt-1" style={{ color: '#9ca3af' }}>We check this against our learner records to set your access tier.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={labelStyle}>Display name (optional)</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="How should others see you?" maxLength={40} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={labelStyle}>WhatsApp (optional)</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 rounded-xl text-sm font-medium shrink-0 border"
                style={{ background: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}>+91</span>
              <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="9876543210" maxLength={10} className={inputCls} style={inputStyle} />
            </div>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-xl border" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading || !email.trim()}
            className="w-full py-3.5 font-bold text-sm rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : 'Enter Community →'}
          </button>

          <p className="text-[11px] text-center" style={{ color: '#6b7280' }}>
            Access expired?{' '}
            <a href="https://www.ostaran.com/masterclass" className="font-semibold" style={{ color: '#7c3aed' }}>
              Register for the AI Masterclass
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
