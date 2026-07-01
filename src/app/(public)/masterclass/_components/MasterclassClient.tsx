'use client'
import { useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

declare global {
  interface Window { Razorpay: any }
}

interface Props {
  basePrice:        number
  finalPrice:       number
  discountAmt:      number
  discountLabel:    string
  campaignId:       string | null
  utmSource:        string | null
  utmMedium:        string | null
  utmCampaign:      string | null
  utmContent:       string | null
  professionOptions: { value: string; label: string }[]
}

type Status = 'idle' | 'submitting' | 'paying' | 'success' | 'error'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n)

export function MasterclassClient({
  basePrice, finalPrice, discountAmt, discountLabel,
  campaignId, utmSource, utmMedium, utmCampaign, utmContent,
  professionOptions,
}: Props) {
  const [form, setForm] = useState({ name: '', email: '', mobile: '', profession: '' })
  const [status, setStatus]   = useState<Status>('idle')
  const [error,  setError]    = useState('')
  const [paymentId, setPaymentId] = useState('')

  function f(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  const inp = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.mobile || !form.profession) return
    setStatus('submitting')
    setError('')

    try {
      // 1. Create Razorpay order via API (discount validated server-side)
      const orderRes = await fetch('/api/masterclass/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name,
          email:       form.email,
          mobile:      form.mobile,
          profession:  form.profession,
          campaign_id: campaignId,
          utm_source:  utmSource,
          utm_medium:  utmMedium,
          utm_campaign: utmCampaign,
          utm_content: utmContent,
        }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok) throw new Error(order.error || 'Order creation failed')

      setStatus('paying')

      // 2. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id:    order.razorpayOrderId,
          amount:      order.amountPaise,
          currency:    'INR',
          name:        'oStaran — AI Masterclass',
          description: 'AI Masterclass Programme',
          image:       '/ostaran-logo.png',
          prefill: { name: form.name, email: form.email, contact: form.mobile },
          theme: { color: '#4f46e5' },
          handler: async (response: any) => {
            // 3. Verify payment server-side
            const verifyRes = await fetch('/api/masterclass/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                registration_id:     order.registrationId,
              }),
            })
            const verified = await verifyRes.json()
            if (!verifyRes.ok) { reject(new Error(verified.error || 'Payment verification failed')); return }
            setPaymentId(response.razorpay_payment_id)
            setStatus('success')
            resolve()
          },
          modal: { ondismiss: () => { setStatus('idle'); resolve() } },
        })
        rzp.on('payment.failed', (resp: any) => {
          reject(new Error(resp.error?.description || 'Payment failed'))
        })
        rzp.open()
      })

    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={28} className="text-green-600" />
        </div>
        <h3 className="font-bold text-gray-900">Payment Successful!</h3>
        <p className="text-xs text-gray-500">
          Welcome to the AI Masterclass, {form.name.split(' ')[0]}!<br />
          Confirmation details sent to <strong>{form.email}</strong>
        </p>
        {paymentId && <p className="text-[10px] text-gray-400">Payment ID: {paymentId}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
        <input type="text" required value={form.name} onChange={e => f('name', e.target.value)}
          placeholder="Your full name" className={inp} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
        <input type="email" required value={form.email} onChange={e => f('email', e.target.value)}
          placeholder="you@example.com" className={inp} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile *</label>
        <div className="flex gap-2">
          <span className="flex items-center px-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-600 font-medium shrink-0">+91</span>
          <input type="tel" required value={form.mobile} onChange={e => f('mobile', e.target.value)}
            placeholder="9876543210" className={inp} maxLength={10} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">I am a *</label>
        <select required value={form.profession} onChange={e => f('profession', e.target.value)} className={inp + ' appearance-none'}>
          <option value="">Select your profile…</option>
          {professionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Price summary */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1.5 text-xs">
        <div className="flex justify-between text-gray-500">
          <span>Session Fee (MRP)</span>
          <span className={discountAmt > 0 ? 'line-through text-gray-400' : 'font-semibold text-gray-700'}>{fmt(basePrice)}</span>
        </div>
        {discountAmt > 0 && (
          <div className="flex justify-between text-green-600 font-semibold">
            <span>{discountLabel}</span>
            <span>− {fmt(discountAmt)}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-600">You Pay Today</span>
          <span className="text-2xl font-black" style={{ color: '#4f46e5' }}>{fmt(finalPrice)}</span>
        </div>
        {discountAmt > 0 && (
          <div className="flex justify-center">
            <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              You save {fmt(discountAmt)}!
            </span>
          </div>
        )}
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      <button type="submit"
        disabled={status === 'submitting' || status === 'paying'}
        className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
        {status === 'submitting' && <><Loader2 size={15} className="animate-spin" /> Creating order…</>}
        {status === 'paying'     && <><Loader2 size={15} className="animate-spin" /> Opening payment…</>}
        {(status === 'idle' || status === 'error') && <>Pay {fmt(finalPrice)} — Enrol Now</>}
      </button>

      <p className="text-[10px] text-center text-gray-400">
        By proceeding you agree to our <a href="/terms" className="underline">Terms</a>, <a href="/refund-policy" className="underline">Refund Policy</a> &amp; <a href="/privacy" className="underline">Privacy Policy</a>
      </p>
    </form>
  )
}
