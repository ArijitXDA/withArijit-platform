'use client'
import { useState } from 'react'
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  enrolmentId:      string
  balanceDue:       number
  courseName:       string
  paymentType:      string   // second_instalment | monthly_emi | balance_clearance
  instalmentNumber: number
  totalInstalments: number
  studentName:      string
  studentEmail:     string
  studentMobile:    string
}

function formatINR(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function buttonLabel(paymentType: string, instalmentNumber: number, totalInstalments: number, amount: number): string {
  if (paymentType === 'second_instalment')
    return `Pay 2nd Instalment (${formatINR(amount)}) →`
  if (paymentType === 'monthly_emi')
    return `Pay EMI ${instalmentNumber}/${totalInstalments} (${formatINR(amount)}) →`
  return `Pay Remaining Balance (${formatINR(amount)}) →`
}

function badgeLabel(paymentType: string, instalmentNumber: number, totalInstalments: number): string {
  if (paymentType === 'second_instalment')  return `2nd Instalment · ${instalmentNumber}/${totalInstalments}`
  if (paymentType === 'monthly_emi')        return `EMI ${instalmentNumber}/${totalInstalments}`
  return 'Balance Due'
}

const T = {
  amber:       '#d97706',
  amberBg:     '#fffbeb',
  amberBorder: '#fde68a',
  amberDark:   '#b45309',
  green:       '#16a34a',
  greenBg:     '#f0fdf4',
  greenBorder: '#bbf7d0',
  red:         '#dc2626',
  redBg:       '#fef2f2',
  redBorder:   '#fecaca',
  blue:        '#2563eb',
  navy:        '#0f1f3d',
  textSec:     '#475569',
  textMuted:   '#94a3b8',
  border:      '#dce6f5',
}

export function BalancePaymentButton({
  enrolmentId, balanceDue, courseName,
  paymentType, instalmentNumber, totalInstalments,
  studentName, studentEmail, studentMobile,
}: Props) {
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState('')

  async function handlePay() {
    setError('')
    setLoading(true)

    try {
      // 1. Create Razorpay order (amount comes from DB server-side)
      const orderRes = await fetch('/api/payments/create-order-balance', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enrolment_id: enrolmentId }),
      })
      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        setError(orderData.error ?? 'Failed to initiate payment. Please try again.')
        setLoading(false)
        return
      }

      if (typeof (window as any).Razorpay === 'undefined') {
        setError('Payment gateway is loading — please wait a moment and try again.')
        setLoading(false)
        return
      }

      const rzp = new (window as any).Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id:    orderData.orderId,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        'oStaran × AIwithArijit',
        description: `${orderData.courseName} — ${badgeLabel(orderData.paymentType, orderData.instalmentNumber, orderData.totalInstalments)}`,
        prefill:     { name: studentName, email: studentEmail, contact: studentMobile },
        theme:       { color: '#d97706' },   // amber — distinct from enrolment (indigo)

        handler: async (response: any) => {
          try {
            const recordRes = await fetch('/api/enrollment/record-balance', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
                enrolment_id:        enrolmentId,
                payment_type:        orderData.paymentType,
                instalment_number:   orderData.instalmentNumber,
                total_instalments:   orderData.totalInstalments,
                // Currency snapshot (from the order — same currency + rate as the
                // first instalment). INR orders send INR / balance / 1.
                currency:            orderData.chargedCurrency,
                amount_charged:      orderData.chargedAmount,
                fx_rate:             orderData.fxRate,
              }),
            })
            const recordData = await recordRes.json().catch(() => ({}))

            if (!recordRes.ok) {
              setError(
                `Payment of ${formatINR(balanceDue)} received (Ref: ${response.razorpay_payment_id}) ` +
                `but we hit an error recording it. Please WhatsApp us or email ai@ostaran.com ` +
                `with this payment ID — we'll update your record within 1 hour.`
              )
              setLoading(false)
              return
            }

            setSuccess(true)
            setLoading(false)
            // Refresh the page after 2s so the balance card disappears
            setTimeout(() => window.location.reload(), 2000)

          } catch (err: any) {
            setError(`Payment recorded failed. Contact support with ID: ${response.razorpay_payment_id}`)
            setLoading(false)
          }
        },

        modal: { ondismiss: () => setLoading(false) },
      })

      rzp.open()

    } catch (err: any) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}>
        <CheckCircle size={15} />
        Payment successful! Refreshing…
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePay}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: `linear-gradient(135deg, ${T.amber}, ${T.amberDark})` }}>
        {loading
          ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
          : <><CreditCard size={14} /> {buttonLabel(paymentType, instalmentNumber, totalInstalments, balanceDue)}</>
        }
      </button>
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
          style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}` }}>
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}
