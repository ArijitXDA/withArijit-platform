'use client'
import { useState } from 'react'
import { X, Loader2, Bot } from 'lucide-react'

interface Member { id: string; tier: string; expires_at: string | null; display_name: string }
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), whatsapp: whatsapp.trim() || undefined, display_name: name.trim() || undefined }),
    })
    const data = await res.json()

    if (data.expired) {
      window.location.href = 'https://www.ostaran.com/masterclass'
      return
    }
    if (!res.ok || data.error) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    onJoin(data.member)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl">
              <Bot size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">Join the Community</h2>
              <p className="text-xs text-gray-400">Ask Ari & 1,000+ learners are here</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tier info strip */}
        <div className="mx-6 mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <strong>Free access:</strong> 60 days as guest · 30 days if you attended a webinar · Lifetime if you're enrolled
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
            <input
              type="email" required autoFocus
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
            />
            <p className="text-[10px] text-gray-400 mt-1">We check this against our learner records to set your access tier.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Display name (optional)</label>
            <input
              type="text"
              value={name} onChange={e => setName(e.target.value)}
              placeholder="How should others see you?"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
              maxLength={40}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">WhatsApp (optional)</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-600 font-medium shrink-0">+91</span>
              <input
                type="tel"
                value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="9876543210"
                className="flex-1 border border-gray-200 rounded-xl px-3.5 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                maxLength={10}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit" disabled={loading || !email.trim()}
            className="w-full py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : 'Enter Community →'}
          </button>

          <p className="text-[11px] text-center text-gray-400">
            Community access expired?{' '}
            <a href="https://www.ostaran.com/masterclass" className="text-indigo-600 font-semibold hover:underline">
              Register for the AI Masterclass
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
