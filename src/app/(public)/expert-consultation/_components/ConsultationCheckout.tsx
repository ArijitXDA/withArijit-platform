'use client'

import { useMemo, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { formatUsd } from '@/lib/consultationUsd'
import {
  SKU_ORDER,
  SKU_LABEL,
  computeConsultationPrice,
  type DurationSku,
} from '@/lib/consultationCheckoutPricing'

declare global {
  interface Window {
    // Must match the other Window.Razorpay augmentations in the repo (required, not optional),
    // or TS2687 "all declarations must have identical modifiers" fails the build.
    Razorpay: any
  }
}

export type CheckoutType = {
  code: string
  label: string
  rateUsd: number
  minChargeUsd: number
}

export function ConsultationCheckout({
  type,
  freeAttendees,
  surchargePerPersonPerHour,
  buyerTimezone,
  payToken,
  onClose,
}: {
  type: CheckoutType
  freeAttendees: number
  surchargePerPersonPerHour: number
  buyerTimezone: string | null
  payToken?: string | null
  onClose: () => void
}) {
  const [sku, setSku] = useState<DurationSku>('min60')
  const [attendees, setAttendees] = useState(1)
  const [discountCode, setDiscountCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [company, setCompany] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const price = useMemo(
    () =>
      computeConsultationPrice({
        rateUsd: type.rateUsd,
        minChargeUsd: type.minChargeUsd,
        sku,
        attendees,
        freeAttendees,
        surchargePerPersonPerHour,
        // Discount is validated + applied server-side; the live figure here excludes it.
        discount: null,
      }),
    [type, sku, attendees, freeAttendees, surchargePerPersonPerHour],
  )

  async function bookAndPay() {
    setError('')
    if (!name.trim() || !email.trim()) {
      setError('Please add your name and work email.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/consultation/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_type_code: type.code,
          duration_sku: sku,
          attendees,
          discount_code: discountCode || undefined,
          pay_token: payToken || undefined,
          name,
          email,
          mobile,
          company,
          timezone: buyerTimezone,
        }),
      })
      const order = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(order.error ?? 'Could not start checkout.')
        setBusy(false)
        return
      }
      if (!window.Razorpay) {
        setError('Payment library failed to load. Please refresh and try again.')
        setBusy(false)
        return
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: 'USD',
        name: 'oStaran — Expert Consultation',
        description: `${type.label} · ${SKU_LABEL[sku]}`,
        prefill: { name, email, contact: mobile },
        theme: { color: '#4f46e5' },
        handler: async (resp: any) => {
          try {
            const verify = await fetch('/api/consultation/confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            })
            const conf = await verify.json().catch(() => ({}))
            if (verify.ok && conf.scheduleToken) {
              window.location.href = `/consultation/schedule/${conf.scheduleToken}`
            } else {
              // Payment captured; the webhook backstop will fulfil it. Reassure the buyer.
              window.location.href = `/consultation/thank-you`
            }
          } catch {
            window.location.href = `/consultation/thank-you`
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      })
      rzp.open()
    } catch {
      setError('Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Book &amp; pay</h3>
            <p className="text-sm text-gray-500">{type.label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Duration</span>
            <select className={`${inputCls} bg-white`} value={sku} onChange={(e) => setSku(e.target.value as DurationSku)}>
              {SKU_ORDER.map((s) => (
                <option key={s} value={s}>
                  {SKU_LABEL[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-gray-700">Attendees (incl. you)</span>
            <input
              type="number" min={1} max={50}
              className={inputCls}
              value={attendees}
              onChange={(e) => setAttendees(Math.max(1, Math.min(50, Math.floor(Number(e.target.value) || 1))))}
            />
            <span className="mt-1 block text-xs text-gray-500">
              Up to {freeAttendees} included · then {formatUsd(surchargePerPersonPerHour)}/person/hour.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Your name *</span>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Work email *</span>
              <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Mobile</span>
              <input className={inputCls} value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Company</span>
              <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} />
            </label>
          </div>

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
            <div className="flex justify-between text-gray-600">
              <span>
                {formatUsd(type.rateUsd)}/hr × {price.hours}h
                {price.baseUsd > Math.round(type.rateUsd * price.hours * 100) / 100 ? ' (minimum)' : ''}
              </span>
              <span className="text-gray-900">{formatUsd(price.baseUsd)}</span>
            </div>
            {price.surchargeUsd > 0 && (
              <div className="flex justify-between text-gray-600 mt-1">
                <span>Group surcharge</span>
                <span className="text-gray-900">{formatUsd(price.surchargeUsd)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 mt-2 pt-2 border-t border-gray-200">
              <span>Total{discountCode ? ' (before code)' : ''}</span>
              <span>{formatUsd(price.totalUsd)}</span>
            </div>
            {discountCode && (
              <p className="text-xs text-gray-500 mt-1">Any valid code is applied at payment.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={bookAndPay}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Starting checkout…
              </>
            ) : (
              <>Book &amp; pay {formatUsd(price.totalUsd)}</>
            )}
          </button>
          <p className="text-center text-xs text-gray-400">
            You&apos;ll choose your session time right after payment.
          </p>
        </div>
      </div>
    </div>
  )
}
