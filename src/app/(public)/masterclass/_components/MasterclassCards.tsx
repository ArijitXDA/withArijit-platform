'use client'
import { useState } from 'react'
import { Clock, Calendar, Users, Shield, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

declare global { interface Window { Razorpay: any } }

interface Session {
  course_id:    number
  course_name:  string
  webinar_date: string
  webinar_time: string
}
interface SessionMeta {
  emoji: string; label: string; ageRange: string
  profession: string; badge: string | null; color: string
}
interface Props {
  sessions:     Session[]
  sessionMeta:  Record<number, SessionMeta>
  basePrice:    number
  finalPrice:   number
  discountAmt:  number
  discountLabel: string
  campaignId:   string | null
  utmSource:    string | null
  utmMedium:    string | null
  utmCampaign:  string | null
  utmContent:   string | null
}

type PayStatus = 'idle' | 'form' | 'submitting' | 'paying' | 'success' | 'error'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n)

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'} IST`
}

export function MasterclassCards({
  sessions, sessionMeta, basePrice, finalPrice, discountAmt, discountLabel,
  campaignId, utmSource, utmMedium, utmCampaign, utmContent,
}: Props) {
  const [selected, setSelected]     = useState<Session | null>(null)
  const [payStatus, setPayStatus]   = useState<PayStatus>('idle')
  const [form, setForm]             = useState({ name: '', email: '', mobile: '' })
  const [error, setError]           = useState('')
  const [paymentId, setPaymentId]   = useState('')
  const hasCampaign = discountAmt > 0

  function f(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function selectSession(s: Session) {
    setSelected(s); setPayStatus('form'); setError('')
    // Scroll to form
    setTimeout(() => document.getElementById('mc-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !form.name || !form.email || !form.mobile) return
    setPayStatus('submitting'); setError('')
    try {
      const meta = sessionMeta[selected.course_id]
      const orderRes = await fetch('/api/masterclass/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         form.name,
          email:        form.email,
          mobile:       form.mobile,
          profession:   meta.profession,
          campaign_id:  campaignId,
          utm_source:   utmSource,
          utm_medium:   utmMedium,
          utm_campaign: utmCampaign,
          utm_content:  utmContent,
          course_name:  selected.course_name,
          webinar_date: selected.webinar_date,
          webinar_time: selected.webinar_time,
        }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok) throw new Error(order.error || 'Order creation failed')

      setPayStatus('paying')
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id:    order.razorpayOrderId,
          amount:      order.amountPaise,
          currency:    'INR',
          name:        'oStaran — AI Certification',
          description: selected.course_name,
          image:       '/ostaran-logo.png',
          prefill:     { name: form.name, email: form.email, contact: form.mobile },
          theme:       { color: '#4f46e5' },
          handler: async (response: any) => {
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
            if (!verifyRes.ok) { reject(new Error(verified.error || 'Verification failed')); return }
            setPaymentId(response.razorpay_payment_id)
            setPayStatus('success'); resolve()
          },
          modal: { ondismiss: () => { setPayStatus('form'); resolve() } },
        })
        rzp.on('payment.failed', (r: any) => reject(new Error(r.error?.description || 'Payment failed')))
        rzp.open()
      })
    } catch (err: any) {
      setError(err.message); setPayStatus('error')
    }
  }

  const inp = "w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Choose Your Session</h2>
          <p className="text-gray-500">Select the session that matches your profile. Each is personalised for its audience.</p>
        </div>

        {/* Session cards */}
        <div className="space-y-4 mb-10">
          {sessions.map(s => {
            const meta = sessionMeta[s.course_id]
            if (!meta) return null
            const isSelected = selected?.course_id === s.course_id

            return (
              <div
                key={s.course_id}
                className={`rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden ${isSelected ? 'shadow-xl' : 'border-gray-100 bg-white hover:shadow-md hover:border-gray-200'}`}
                style={isSelected ? { borderColor: meta.color, background: `${meta.color}08` } : {}}
                onClick={() => selectSession(s)}
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Left — session info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 border"
                      style={{ background: `${meta.color}12`, borderColor: `${meta.color}30` }}>
                      {meta.emoji}
                    </div>
                    <div className="min-w-0">
                      {meta.badge && (
                        <p className="text-xs font-bold mb-1" style={{ color: meta.color }}>{meta.badge}</p>
                      )}
                      <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{meta.label}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={11} /> 90 min</span>
                        <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(s.webinar_date)}</span>
                        <span>{fmtTime(s.webinar_time)}</span>
                        <span className="flex items-center gap-1"><Users size={11} /> {meta.ageRange}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right — price + CTA */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      {hasCampaign && (
                        <p className="text-xs text-gray-400 line-through">{fmt(basePrice)}</p>
                      )}
                      <p className="text-xl font-black" style={{ color: meta.color }}>{fmt(finalPrice)}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); selectSession(s) }}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-md whitespace-nowrap"
                      style={{ background: meta.color }}>
                      Register &amp; Pay
                    </button>
                  </div>
                </div>

                {/* Savings strip */}
                {hasCampaign && (
                  <div className="px-5 py-2 border-t text-xs font-semibold"
                    style={{ borderColor: `${meta.color}20`, color: meta.color, background: `${meta.color}06` }}>
                    🎉 {discountLabel} — You save {fmt(discountAmt)}!
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Registration form — appears when card selected */}
        {selected && payStatus !== 'idle' && (
          <div id="mc-form" className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden max-w-lg mx-auto">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${sessionMeta[selected.course_id]?.color}, #7c3aed)` }} />
            <div className="p-7">
              {payStatus === 'success' ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Payment Successful! 🎉</h3>
                  <p className="text-sm text-gray-600">
                    Welcome! Your joining link for <strong>{sessionMeta[selected.course_id]?.label}</strong> has been sent to <strong>{form.email}</strong>.
                  </p>
                  {paymentId && <p className="text-xs text-gray-400">Payment ID: {paymentId}</p>}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-2xl">{sessionMeta[selected.course_id]?.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{sessionMeta[selected.course_id]?.label}</p>
                      <p className="text-xs text-gray-500">{fmtDate(selected.webinar_date)} · {fmtTime(selected.webinar_time)}</p>
                    </div>
                  </div>
                  <form onSubmit={handlePay} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                      <input type="text" required value={form.name} onChange={e => f('name', e.target.value)} placeholder="Your full name" className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                      <input type="email" required value={form.email} onChange={e => f('email', e.target.value)} placeholder="you@example.com" className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile *</label>
                      <div className="flex gap-2">
                        <span className="flex items-center px-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-600 font-medium shrink-0">+91</span>
                        <input type="tel" required value={form.mobile} onChange={e => f('mobile', e.target.value)} placeholder="9876543210" className={inp} maxLength={10} />
                      </div>
                    </div>

                    {/* Price summary */}
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-500">
                        <span>Session Fee (MRP)</span>
                        <span className={hasCampaign ? 'line-through text-gray-400' : 'font-semibold text-gray-700'}>{fmt(basePrice)}</span>
                      </div>
                      {hasCampaign && (
                        <div className="flex justify-between text-green-600 font-semibold">
                          <span>{discountLabel}</span>
                          <span>− {fmt(discountAmt)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                        <span className="font-semibold text-gray-700">You Pay Today</span>
                        <span className="text-2xl font-black" style={{ color: sessionMeta[selected.course_id]?.color }}>{fmt(finalPrice)}</span>
                      </div>
                      {hasCampaign && (
                        <div className="flex justify-center pt-0.5">
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                            You save {fmt(discountAmt)}!
                          </span>
                        </div>
                      )}
                    </div>

                    {payStatus === 'error' && (
                      <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <AlertTriangle size={13} /> {error}
                      </div>
                    )}

                    <button type="submit"
                      disabled={payStatus === 'submitting' || payStatus === 'paying'}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${sessionMeta[selected.course_id]?.color}, #7c3aed)` }}>
                      {payStatus === 'submitting' && <><Loader2 size={15} className="animate-spin" /> Creating order…</>}
                      {payStatus === 'paying'     && <><Loader2 size={15} className="animate-spin" /> Opening payment…</>}
                      {(payStatus === 'form' || payStatus === 'error') && <>Pay {fmt(finalPrice)} — Confirm Seat</>}
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                      <Shield size={11} className="text-green-500" />
                      Razorpay · GST Invoice · 7-day Refund
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
