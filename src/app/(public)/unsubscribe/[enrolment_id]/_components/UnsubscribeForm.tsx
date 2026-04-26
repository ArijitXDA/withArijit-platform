'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, MessageCircle } from 'lucide-react'

interface UnsubscribeFormProps {
  enrolmentId:    string
  maskedEmail:    string
  hasMobile:      boolean
  sequenceLabel:  string | null
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function UnsubscribeForm({
  enrolmentId, maskedEmail, hasMobile, sequenceLabel,
}: UnsubscribeFormProps) {
  const [alsoWhatsApp, setAlsoWhatsApp] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [unsubbedChannels, setUnsubbedChannels] = useState<string[]>([])

  async function handleUnsubscribe() {
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/unsubscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          enrolment_id:  enrolmentId,
          also_whatsapp: alsoWhatsApp && hasMobile,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not process unsubscribe. Please try again.')
      }
      setUnsubbedChannels(json.channels || ['email'])
      setStatus('success')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMsg(message)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div>
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-5">
          <CheckCircle2 size={26} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re unsubscribed</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-1">
          <strong className="text-gray-900">{maskedEmail}</strong> has been removed from
          {unsubbedChannels.includes('whatsapp')
            ? ' all oStaran lifecycle emails and WhatsApp messages.'
            : ' all oStaran lifecycle emails.'}
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Active sequences for this address have been stopped immediately.
        </p>
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 mb-6">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong className="text-gray-800">Note:</strong> Transactional messages
            (payment receipts, course access for purchases you&apos;ve made, refund confirmations)
            are not affected — these are required for our service relationship with you.
          </p>
        </div>
        <a href="https://www.ostaran.com" className="inline-block text-sm text-indigo-600 hover:underline font-medium">
          ← Back to oStaran
        </a>
      </div>
    )
  }

  return (
    <div>
      <p className="text-gray-600 text-[15px] leading-relaxed mb-1">
        You&apos;re about to unsubscribe <strong className="text-gray-900">{maskedEmail}</strong> from
      </p>
      <p className="text-gray-600 text-[15px] leading-relaxed mb-6">
        {sequenceLabel
          ? <>the <em className="text-indigo-700">{sequenceLabel}</em> sequence and all other oStaran lifecycle emails.</>
          : <>all oStaran lifecycle emails.</>}
      </p>

      {/* WhatsApp opt-out checkbox (only if we have a mobile on file) */}
      {hasMobile && (
        <label className="flex items-start gap-3 p-4 rounded-2xl border border-gray-200 hover:border-green-200 hover:bg-green-50/50 cursor-pointer transition-colors mb-6">
          <input
            type="checkbox"
            checked={alsoWhatsApp}
            onChange={(e) => setAlsoWhatsApp(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-green-600 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle size={14} className="text-green-600" />
              <span className="text-sm font-semibold text-gray-900">Also stop WhatsApp messages</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              We&apos;ll stop sending you all oStaran lifecycle WhatsApp messages too.
              You can also reply STOP to any oStaran WhatsApp at any time.
            </p>
          </div>
        </label>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleUnsubscribe}
          disabled={status === 'submitting'}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-60 transition-colors"
        >
          {status === 'submitting'
            ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
            : 'Confirm unsubscribe'}
        </button>
        <a
          href="https://www.ostaran.com"
          className="flex-1 flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 transition-colors"
        >
          Keep me subscribed
        </a>
      </div>

      <p className="text-xs text-gray-400 mt-6 leading-relaxed">
        We won&apos;t ask twice — clicking <em>Confirm unsubscribe</em> takes effect immediately.
        If you change your mind later, just register for a new oStaran webinar and you&apos;ll be opted back in.
      </p>
    </div>
  )
}
