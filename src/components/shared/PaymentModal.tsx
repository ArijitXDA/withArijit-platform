'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  courseId?: string
  courseName?: string
  price?: number
  defaultName?: string
  defaultEmail?: string
  defaultMobile?: string
  defaultPartnerCode?: string
}

export function PaymentModal({
  open,
  onClose,
  courseId,
  courseName,
  price,
  defaultName = '',
  defaultEmail = '',
  defaultMobile = '',
  defaultPartnerCode = '',
}: PaymentModalProps) {
  const [mode, setMode]                   = useState<'self' | 'gift'>('self')
  const [name, setName]                   = useState(defaultName)
  const [email, setEmail]                 = useState(defaultEmail)
  const [mobile, setMobile]               = useState(defaultMobile)
  const [friendEmail, setFriendEmail]     = useState('')
  const [frequency, setFrequency]         = useState<'full' | 'half'>('full')
  const [discountCode, setDiscountCode]   = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState(false)
  // Discount preview — populated after create-order responds
  const [discountApplied, setDiscountApplied] = useState(0)
  const [discountLabel, setDiscountLabel]     = useState('')
  const [finalAmount, setFinalAmount]         = useState<number | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      if (defaultName)   setName(defaultName)
      if (defaultEmail)  setEmail(defaultEmail)
      if (defaultMobile) setMobile(defaultMobile)
      setError('')
      setSuccess(false)
      setDiscountApplied(0)
      setDiscountLabel('')
      setFinalAmount(null)
    }
  }, [open, defaultName, defaultEmail, defaultMobile])

  const basePrice = frequency === 'half' ? (price ?? 0) / 2 : (price ?? 0)
  const displayPrice = finalAmount !== null ? finalAmount : basePrice

  async function handlePay() {
    setError('')
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      setError('Please fill in your name, email, and mobile number.')
      return
    }
    if (mode === 'gift' && !friendEmail.trim()) {
      setError("Please enter your friend's email address.")
      return
    }

    setLoading(true)
    try {
      // ── Step 1: Create Razorpay order ──────────────────────────────────────
      const orderRes = await fetch('/api/payments/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id:         courseId,
          payment_frequency: frequency,
          discount_code:     discountCode.trim().toUpperCase() || undefined,
          partner_code:      defaultPartnerCode || undefined,  // passed for notes
          name,
          email,
          mobile,
          mode,
          friend_email: mode === 'gift' ? friendEmail : undefined,
        }),
      })
      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        setError(orderData.error ?? 'Failed to create order. Please try again.')
        setLoading(false)
        return
      }

      const {
        orderId, amount, currency,
        discountApplied: disc,
        discountLabel: discLbl,
        displayAmount,
        partnerDiscountApplied,
        autoDiscountPct,
      } = orderData

      // Show discount feedback in UI
      if (disc && disc > 0) {
        setDiscountApplied(disc)
        setDiscountLabel(discLbl ?? (partnerDiscountApplied ? `Partner discount (${autoDiscountPct}% off)` : discountCode))
        setFinalAmount(displayAmount)
      }

      // ── Step 2: Razorpay loaded? ────────────────────────────────────────────
      if (typeof (window as any).Razorpay === 'undefined') {
        setError('Payment gateway is still loading. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      // ── Step 3: Open Razorpay checkout ─────────────────────────────────────
      const rzp = new (window as any).Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id:    orderId,
        amount,
        currency,
        name:        'withArijit',
        description: courseName,
        prefill:     { name, email, contact: mobile },
        theme:       { color: '#4f46e5' },

        handler: async (response: any) => {
          try {
            // ── Step 4: Verify signature ──────────────────────────────────────
            const verifyRes = await fetch('/api/payments/verify-payment', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify(response),
            })
            if (!verifyRes.ok) {
              setError('Payment verification failed. Contact support with payment ID: ' + response.razorpay_payment_id)
              setLoading(false)
              return
            }

            // ── Step 5: Record enrolment + commission cascade ─────────────────
            const enrolRes = await fetch('/api/enrollment/self', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                payment_id:     response.razorpay_payment_id,
                order_id:       response.razorpay_order_id,
                course_id:      courseId,
                name,
                email,
                mobile,
                amount:         displayAmount ?? basePrice,
                discount_code:  discountCode.trim().toUpperCase() || undefined,
                partner_code:   defaultPartnerCode || undefined,
                enrolment_type: frequency === 'full' ? 'full_course' : 'monthly',
              }),
            })

            // Parse once — used for error logging and for the redirect
            const enrolJson = await enrolRes.json().catch(() => ({}))
            if (!enrolRes.ok) {
              console.error('Enrolment recording failed (non-fatal):', enrolJson.error)
            }

            setSuccess(true)
            setLoading(false)
            // Redirect to batch selection page
            const enrolmentId = enrolJson.enrolment_id ?? ''
            setTimeout(() => {
              onClose()
              const batchParams = new URLSearchParams()
              if (courseId)    batchParams.set('course_id', courseId)
              if (enrolmentId) batchParams.set('enrolment_id', enrolmentId)
              const selectBatchUrl = `/select-batch?${batchParams.toString()}`

              // Check if user is already signed in
              import('@/lib/supabase/client').then(({ createClient }) => {
                const sb = createClient()
                sb.auth.getUser().then(({ data }) => {
                  if (data?.user) {
                    // Already signed in — go straight to batch selection
                    window.location.href = selectBatchUrl
                  } else {
                    // Not signed in — go to signin with next=select-batch and email pre-filled
                    const signinParams = new URLSearchParams()
                    signinParams.set('next', selectBatchUrl)
                    if (email) signinParams.set('email', email)
                    window.location.href = `/signin?${signinParams.toString()}`
                  }
                })
              })
            }, 2000)

          } catch (err: any) {
            setError('Enrolment recording failed. Payment was successful. Contact support with payment ID: ' + response.razorpay_payment_id)
            setLoading(false)
          }
        },

        modal: { ondismiss: () => setLoading(false) },
      })

      rzp.open()

    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enrol — {courseName ?? 'Course'}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="text-5xl">🎉</div>
            <p className="text-green-600 font-bold text-lg">Payment Successful!</p>
            <p className="text-gray-500 text-sm">Redirecting to your dashboard…</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">

            {/* Self / Gift */}
            <div className="flex gap-2">
              <Button variant={mode === 'self' ? 'default' : 'outline'} size="sm" onClick={() => setMode('self')}>For Myself</Button>
              <Button variant={mode === 'gift' ? 'default' : 'outline'} size="sm" onClick={() => setMode('gift')}>Gift to Someone</Button>
            </div>

            <div>
              <Label htmlFor="pm-name">Full Name *</Label>
              <Input id="pm-name" value={name} onChange={e => setName(e.target.value)} placeholder="Arijit Das" />
            </div>
            <div>
              <Label htmlFor="pm-email">Email *</Label>
              <Input id="pm-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="pm-mobile">Mobile *</Label>
              <Input id="pm-mobile" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91 98765 43210" />
            </div>

            {mode === 'gift' && (
              <div>
                <Label htmlFor="pm-friend-email">Friend&apos;s Email *</Label>
                <Input id="pm-friend-email" type="email" value={friendEmail} onChange={e => setFriendEmail(e.target.value)} placeholder="friend@example.com" />
              </div>
            )}

            <div>
              <Label>Payment Plan</Label>
              <Select value={frequency} onValueChange={v => { if (v === 'full' || v === 'half') setFrequency(v) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Payment — {price ? formatCurrency(price) : '—'}</SelectItem>
                  <SelectItem value="half">50-50 Plan — {price ? formatCurrency(price / 2) : '—'} now</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pm-discount">Discount Code (optional)</Label>
              <Input
                id="pm-discount"
                value={discountCode}
                onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountApplied(0); setFinalAmount(null) }}
                placeholder="e.g. ADMINAX"
                className="uppercase"
              />
            </div>

            {/* Discount applied confirmation */}
            {discountApplied > 0 && (
              <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                <span className="text-green-700">🎉 Discount applied: <strong>{discountLabel}</strong></span>
                <span className="text-green-700 font-bold">−{formatCurrency(discountApplied)}</span>
              </div>
            )}

            {/* Partner referral badge */}
            {defaultPartnerCode && (
              <p className="text-xs text-indigo-500">
                🤝 Referred by: <span className="font-mono font-semibold">{defaultPartnerCode}</span>
              </p>
            )}

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {/* Price summary */}
            {discountApplied > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Original</span>
                  <span className="line-through">{formatCurrency(basePrice)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>−{formatCurrency(discountApplied)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(displayPrice)}</span>
                </div>
              </div>
            ) : null}

            <Button className="w-full" size="lg" onClick={handlePay} disabled={loading}>
              {loading ? 'Processing…' : `Pay ${formatCurrency(displayPrice)} →`}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Secured by Razorpay · 256-bit SSL · GST invoice issued automatically
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
