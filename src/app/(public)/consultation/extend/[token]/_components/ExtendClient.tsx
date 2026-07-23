'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { formatUsd } from '@/lib/consultationUsd'
import { computeConsultationCharge, isIndia, type GstMode } from '@/lib/consultationTax'

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
const fmtInr = (n: number) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')

export function ExtendClient({
  token,
  rateUsd,
  perSessionHours,
  attendees,
  freeAttendees,
  surcharge,
  billingCountry,
  billingState,
  gstRate,
  gstMode,
  fxUsdInr,
}: {
  token: string
  rateUsd: number
  perSessionHours: number
  attendees: number
  freeAttendees: number
  surcharge: number
  billingCountry: string | null
  billingState: string | null
  gstRate: number
  gstMode: GstMode
  fxUsdInr: number
}) {
  const [extra, setExtra] = useState(1)
  const [discountCode, setDiscountCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const india = isIndia(billingCountry)

  const charge = useMemo(() => {
    const addHours = round2(extra * perSessionHours)
    const base = round2(rateUsd * addHours)
    const extraAtt = Math.max(0, attendees - freeAttendees)
    const surch = round2(surcharge * extraAtt * addHours)
    const total = round2(base + surch)
    return computeConsultationCharge({
      usd: { hours: addHours, sessions: extra, rateUsd, baseUsd: base, surchargeUsd: surch, discountUsd: 0, totalUsd: total, amountCents: Math.round(total * 100) },
      billingCountry: billingCountry || 'OT',
      billingState,
      fxRate: fxUsdInr,
      gstRate,
      gstMode,
    })
  }, [extra, perSessionHours, rateUsd, attendees, freeAttendees, surcharge, billingCountry, billingState, fxUsdInr, gstRate, gstMode])

  const inrUnavailable = india && !(charge.totalInr && charge.totalInr > 0)
  const payLabel = inrUnavailable
    ? 'Pay & add'
    : india
      ? `Pay ${fmtInr(charge.totalInr!)} & add`
      : `Pay ${formatUsd(charge.totalUsd)} & add`

  async function pay() {
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/consultation/extend/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_token: token, extra_sessions: extra, discount_code: discountCode || undefined }),
      })
      const order = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(order.error ?? 'Could not start checkout.')
        setBusy(false)
        return
      }
      const RZP = (window as any).Razorpay
      if (!RZP) {
        setError('Payment library failed to load. Please refresh and try again.')
        setBusy(false)
        return
      }
      const rzp = new RZP({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'oStaran — Expert Consultation',
        description: `Add ${extra} session${extra === 1 ? '' : 's'}`,
        theme: { color: '#4f46e5' },
        handler: async (resp: any) => {
          try {
            const verify = await fetch('/api/consultation/extend/confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            })
            await verify.json().catch(() => ({}))
          } catch {
            /* the webhook backstop will apply it */
          }
          window.location.href = '/dashboard/courses'
        },
        modal: { ondismiss: () => setBusy(false) },
      })
      rzp.open()
    } catch {
      setError('Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  const inputCls = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
      <label className="block text-sm">
        <span className="font-medium text-gray-700">How many more sessions?</span>
        <input
          type="number"
          min={1}
          max={52}
          className={inputCls}
          value={extra}
          onChange={(e) => setExtra(Math.max(1, Math.min(52, Math.floor(Number(e.target.value) || 1))))}
        />
        <span className="mt-1 block text-xs text-gray-500">
          At your locked rate of {formatUsd(rateUsd)}/hr · {perSessionHours === 0.5 ? '30' : '60'} min each.
        </span>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-gray-700">Discount code (optional)</span>
        <input
          className={`${inputCls} uppercase`}
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
          placeholder="CODE"
        />
      </label>

      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm">
        {india && !inrUnavailable ? (
          <>
            <div className="flex justify-between text-gray-600">
              <span>Taxable value (INR)</span>
              <span className="text-gray-900">{fmtInr(charge.taxableInr!)}</span>
            </div>
            {charge.igstInr ? (
              <div className="flex justify-between text-gray-600 mt-1">
                <span>IGST @ {charge.gstRate}%</span>
                <span className="text-gray-900">{fmtInr(charge.igstInr)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-gray-600 mt-1">
                  <span>CGST @ {(charge.gstRate ?? 18) / 2}%</span>
                  <span className="text-gray-900">{fmtInr(charge.cgstInr ?? 0)}</span>
                </div>
                <div className="flex justify-between text-gray-600 mt-1">
                  <span>SGST @ {(charge.gstRate ?? 18) / 2}%</span>
                  <span className="text-gray-900">{fmtInr(charge.sgstInr ?? 0)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-gray-900 mt-2 pt-2 border-t border-gray-200">
              <span>Total payable{discountCode ? ' (before code)' : ''}</span>
              <span>{fmtInr(charge.totalInr!)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between font-bold text-gray-900">
            <span>Total payable{discountCode ? ' (before code)' : ''}</span>
            <span>{formatUsd(charge.totalUsd)}</span>
          </div>
        )}
      </div>

      {discountCode && <p className="text-xs text-gray-500 -mt-2">Any valid code is applied at payment.</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={pay}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Starting checkout…
          </>
        ) : (
          <>{payLabel}</>
        )}
      </button>
      <p className="text-center text-xs text-gray-400">
        The new sessions are added to your existing engagement immediately after payment.
      </p>
    </div>
  )
}
