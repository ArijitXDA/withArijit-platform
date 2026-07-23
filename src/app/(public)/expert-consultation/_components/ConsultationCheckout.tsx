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
import { computeConsultationCharge, isIndia, type GstMode } from '@/lib/consultationTax'
import { COUNTRIES, INDIAN_STATES } from '@/lib/consultationGeo'

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

const fmtInr = (n: number) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')

export function ConsultationCheckout({
  type,
  freeAttendees,
  surchargePerPersonPerHour,
  gstRate,
  gstMode,
  fxUsdInr,
  defaultCountry,
  buyerTimezone,
  payToken,
  onClose,
}: {
  type: CheckoutType
  freeAttendees: number
  surchargePerPersonPerHour: number
  gstRate: number
  gstMode: GstMode
  fxUsdInr: number
  defaultCountry?: string | null
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
  const [country, setCountry] = useState(() => {
    const c = String(defaultCountry ?? '').toUpperCase()
    return COUNTRIES.some((x) => x.code === c) ? c : ''
  })
  const [stateName, setStateName] = useState('')
  const [gstin, setGstin] = useState('')
  const [address, setAddress] = useState('')
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

  const indiaSel = isIndia(country)
  const charge = useMemo(
    () =>
      computeConsultationCharge({
        usd: price,
        billingCountry: country || 'OT',
        billingState: stateName,
        fxRate: fxUsdInr,
        gstRate,
        gstMode,
      }),
    [price, country, stateName, fxUsdInr, gstRate, gstMode],
  )

  const inrUnavailable = indiaSel && !(charge.totalInr && charge.totalInr > 0)
  const gstTotalInr = (charge.cgstInr ?? 0) + (charge.sgstInr ?? 0) + (charge.igstInr ?? 0)

  async function bookAndPay() {
    setError('')
    if (!name.trim() || !email.trim()) {
      setError('Please add your name and work email.')
      return
    }
    if (!country) {
      setError('Please select your billing country.')
      return
    }
    if (indiaSel && !stateName) {
      setError('Please select your state (needed for the GST invoice).')
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
          billing_country: country,
          billing_state: indiaSel ? stateName : undefined,
          billing_gstin: indiaSel ? gstin || undefined : undefined,
          billing_address: address || undefined,
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
        currency: order.currency, // 'INR' (domestic) or 'USD' (export) — set by the server
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

  const payLabel = inrUnavailable
    ? 'Book & pay'
    : indiaSel
      ? `Book & pay ${fmtInr(charge.totalInr!)}`
      : `Book & pay ${formatUsd(price.totalUsd)}`

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

          {/* Billing — drives the invoice + tax (India → INR + GST, else USD export). */}
          <div className="rounded-xl border border-gray-200 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Billing (for your invoice)</p>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Country *</span>
              <select className={`${inputCls} bg-white`} value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Select your country…</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {indiaSel && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">State *</span>
                  <select className={`${inputCls} bg-white`} value={stateName} onChange={(e) => setStateName(e.target.value)}>
                    <option value="">Select…</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">GSTIN (optional)</span>
                  <input
                    className={`${inputCls} uppercase`}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="For input credit"
                  />
                </label>
              </div>
            )}
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Billing address {indiaSel ? '' : '(optional)'}</span>
              <textarea
                className={`${inputCls} resize-y min-h-[52px]`}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Company address as it should appear on the invoice"
              />
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

          {/* Price summary — currency + tax follow the billing country. */}
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

            {indiaSel && !inrUnavailable ? (
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Taxable value (INR)</span>
                  <span className="text-gray-900">{fmtInr(charge.taxableInr!)}</span>
                </div>
                {charge.igstInr ? (
                  <div className="flex justify-between text-gray-600">
                    <span>IGST @ {charge.gstRate}%</span>
                    <span className="text-gray-900">{fmtInr(charge.igstInr)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>CGST @ {(charge.gstRate ?? 18) / 2}%</span>
                      <span className="text-gray-900">{fmtInr(charge.cgstInr ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>SGST @ {(charge.gstRate ?? 18) / 2}%</span>
                      <span className="text-gray-900">{fmtInr(charge.sgstInr ?? 0)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-gray-900 pt-1">
                  <span>Total payable{discountCode ? ' (before code)' : ''}</span>
                  <span>{fmtInr(charge.totalInr!)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  Charged in INR (domestic supply). ≈ {formatUsd(price.totalUsd)} + {charge.gstRate}% GST.
                </p>
              </div>
            ) : (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total{discountCode ? ' (before code)' : ''}</span>
                  <span>{formatUsd(price.totalUsd)}</span>
                </div>
                {country && !indiaSel && (
                  <p className="text-xs text-gray-500 mt-1">Charged in USD · no GST (export of services).</p>
                )}
              </div>
            )}
            {discountCode && <p className="text-xs text-gray-500 mt-1">Any valid code is applied at payment.</p>}
            {inrUnavailable && (
              <p className="text-xs text-amber-700 mt-1">INR pricing is being calculated — the final amount shows at payment.</p>
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
              <>{payLabel}</>
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
