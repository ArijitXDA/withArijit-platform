'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import type { ConsultationType } from '../page'

export function ConsultationEnquiryForm({
  types,
  selectedType,
  onSelectType,
  buyerCountry,
  buyerTimezone,
}: {
  types: ConsultationType[]
  selectedType: string | null
  onSelectType: (code: string | null) => void
  buyerCountry: string | null
  buyerTimezone: string | null
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [detail, setDetail] = useState('')
  const [message, setMessage] = useState('')
  const [honey, setHoney] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorText, setErrorText] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setErrorText('Please add your name and work email.')
      setStatus('error')
      return
    }
    setStatus('sending')
    setErrorText('')
    try {
      const res = await fetch('/api/consultation/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          work_email: email,
          company,
          project_type_code: selectedType,
          project_detail: detail,
          message,
          buyer_country: buyerCountry,
          buyer_timezone: buyerTimezone,
          _honey: honey,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorText(j.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }
      setStatus('done')
    } catch {
      setErrorText('Network error. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="text-center rounded-2xl border border-green-200 bg-white p-10">
        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Request received</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Thanks, {name.trim().split(' ')[0] || 'there'} — our expert will review your project and
          get back to you within <strong>1 business day</strong> to confirm a slot in your timezone.
          A confirmation is on its way to your inbox.
        </p>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition'

  return (
    <div>
      <div className="text-center max-w-xl mx-auto mb-8">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          Request your consultation
        </h2>
        <p className="text-gray-600 mt-3">
          Tell us about your project and we&apos;ll get back to you within one business day to
          confirm your expert, scope and a slot in your local time.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 space-y-5">
        {/* Honeypot — hidden from humans, catches bots. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honey}
          onChange={(e) => setHoney(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />

        <div className="grid sm:grid-cols-2 gap-5">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Your name *</span>
            <input
              className={`mt-1.5 ${inputCls}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Work email *</span>
            <input
              type="email"
              className={`mt-1.5 ${inputCls}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              required
            />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Company / organisation</span>
            <input
              className={`mt-1.5 ${inputCls}`}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Project area</span>
            <select
              className={`mt-1.5 ${inputCls} bg-white`}
              value={selectedType ?? ''}
              onChange={(e) => onSelectType(e.target.value || null)}
            >
              <option value="">Not sure yet</option>
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            What are you trying to build or decide?
          </span>
          <textarea
            className={`mt-1.5 ${inputCls} resize-y min-h-[96px]`}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="A few lines on your project, goals and where you are today."
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Anything else? (optional)</span>
          <textarea
            className={`mt-1.5 ${inputCls} resize-y min-h-[64px]`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Preferred timing, team size, deadlines…"
          />
        </label>

        {status === 'error' && <p className="text-sm text-red-600">{errorText}</p>}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {status === 'sending' ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Sending…
            </>
          ) : (
            'Request consultation'
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          No payment required to enquire. We&apos;ll confirm scope, pricing and your slot by email.
        </p>
      </form>
    </div>
  )
}
