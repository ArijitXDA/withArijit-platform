'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  courseId?: string
  courseName?: string
  price?: number
  discountPct?: number    // partner-referred auto-discount, e.g. 40
  partnerName?: string    // partner's full name for gift banner
  defaultName?: string
  defaultEmail?: string
  defaultMobile?: string
  defaultPartnerCode?: string
}

// ── oStaran Logo SVG (inline, no external dependency) ────────────────────────
function OStaranLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#1e1b4b" />
      <text x="16" y="23" textAnchor="middle" fill="white"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="14" fontWeight="800" letterSpacing="-0.5">
        AI
      </text>
    </svg>
  )
}

export function PaymentModal({
  open,
  onClose,
  courseId,
  courseName,
  price,
  discountPct = 0,
  partnerName = '',
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
  const [discountApplied, setDiscountApplied] = useState(0)
  const [discountLabel, setDiscountLabel]     = useState('')
  const [finalAmount, setFinalAmount]         = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    // Apply props defaults first
    if (defaultName)   setName(defaultName)
    if (defaultEmail)  setEmail(defaultEmail)
    if (defaultMobile) setMobile(defaultMobile)
    setError('')
    setSuccess(false)
    setDiscountApplied(0)
    setDiscountLabel('')
    setFinalAmount(null)

    // Auto-fill from signed-in user's existing profile/enrolment
    // so returning students don't have to retype name/email/mobile
    const sb = createClient()
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      // Fill email from auth
      if (!defaultEmail && user.email) setEmail(user.email)
      // Try student_profiles for name + mobile
      const { data: profile } = await sb
        .from('student_profiles')
        .select('full_name, mobile')
        .eq('email', user.email!)
        .maybeSingle()
      if (profile?.full_name && !defaultName)   setName(profile.full_name)
      if (profile?.mobile    && !defaultMobile) setMobile(profile.mobile)
      // Fallback: most recent enrolment for name + mobile
      if (!profile?.mobile || !profile?.full_name) {
        const { data: enrolment } = await sb
          .from('student_enrolments')
          .select('student_name, student_mobile')
          .eq('student_email', user.email!)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (enrolment?.student_name   && !defaultName)   setName(enrolment.student_name)
        if (enrolment?.student_mobile && !defaultMobile) setMobile(enrolment.student_mobile)
      }
    })
  }, [open, defaultName, defaultEmail, defaultMobile])

  // ── Price calculations ────────────────────────────────────────────────────
  const mrp = price ?? 0

  // Apply partner auto-discount upfront (shown before hitting Pay)
  const autoDiscountAmt  = discountPct > 0 ? Math.round(mrp * discountPct / 100) : 0
  const priceAfterAuto   = mrp - autoDiscountAmt

  // Apply frequency
  const basePrice  = frequency === 'half' ? priceAfterAuto / 2 : priceAfterAuto
  const mrpForPlan = frequency === 'half' ? mrp / 2 : mrp

  // After create-order confirms, finalAmount overrides
  const displayPrice = finalAmount !== null ? finalAmount : basePrice

  async function handlePay() {
    setError('')
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      setError('Please fill in your name, email, and mobile number.')
      return
    }
    const mobileDigits = mobile.replace(/\D/g, '')
    if (mobileDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    if (mode === 'gift' && !friendEmail.trim()) {
      setError("Please enter your friend's email address.")
      return
    }

    setLoading(true)
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id:         courseId,
          payment_frequency: frequency,
          discount_code:     discountCode.trim().toUpperCase() || undefined,
          partner_code:      defaultPartnerCode || undefined,
          name, email, mobile, mode,
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

      if (disc && disc > 0) {
        setDiscountApplied(disc)
        setDiscountLabel(discLbl ?? (partnerDiscountApplied ? `Partner discount (${autoDiscountPct}% off)` : discountCode))
        setFinalAmount(displayAmount)
      }

      if (typeof (window as any).Razorpay === 'undefined') {
        setError('Payment gateway is still loading. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      const rzp = new (window as any).Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id:    orderId,
        amount, currency,
        name:        'oStaran × AIwithArijit',
        description: courseName,
        prefill:     { name, email, contact: mobile },
        theme:       { color: '#4f46e5' },
        handler: async (response: any) => {
          try {
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

            const enrolRes = await fetch('/api/enrollment/self', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                payment_id:     response.razorpay_payment_id,
                order_id:       response.razorpay_order_id,
                course_id:      courseId,
                name, email, mobile,
                amount:         displayAmount ?? basePrice,
                discount_code:  discountCode.trim().toUpperCase() || undefined,
                partner_code:   defaultPartnerCode || undefined,
                enrolment_type: frequency === 'full' ? 'full_course' : 'monthly',
              }),
            })
            const enrolJson = await enrolRes.json().catch(() => ({}))

            // ── CRITICAL: enrolment failure must NOT be silent ────────────
            // Payment succeeded but enrolment write failed — show a clear
            // error with the payment ID so the student can contact support
            // and we can manually recover. Do NOT call setSuccess(true).
            if (!enrolRes.ok) {
              setError(
                `Your payment of ${formatCurrency(displayAmount ?? basePrice)} was received (Ref: ${response.razorpay_payment_id}) ` +
                `but we hit an error activating your course. Please WhatsApp us on +91-XXXXXXXXXX or email ai@ostaran.com ` +
                `with this payment ID and we will activate your course within 1 hour.`
              )
              setLoading(false)
              return  // ← stops here — no success state, no redirect
            }

            setSuccess(true)
            setLoading(false)
            const enrolmentId = enrolJson.enrolment_id ?? ''
            const batchParams = new URLSearchParams()
            if (courseId)    batchParams.set('course_id', courseId)
            if (enrolmentId) batchParams.set('enrolment_id', enrolmentId)
            const selectBatchUrl = `/select-batch?${batchParams.toString()}`
            // Redirect immediately — don't wait for getUser() which can be slow
            // The select-batch page itself handles auth gating correctly
            setTimeout(() => {
              onClose()
              window.location.href = selectBatchUrl
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

  // ── Shared input style ────────────────────────────────────────────────────
  const inputCls = 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 bg-transparent shadow-2xl w-[calc(100%-2rem)] mx-4 sm:mx-auto">

        {/* ── oStaran branded header ──────────────────────────────────────── */}
        <div className="relative px-5 pt-4 pb-3"
          style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)' }}>
          {/* Logo + brand */}
          <div className="flex items-center gap-2 mb-2">
            <OStaranLogo size={26} />
            <div>
              <p className="text-white font-extrabold text-sm leading-none">oStaran</p>
              <p className="text-indigo-300 text-[11px] mt-0.5">Premium AI Education</p>
            </div>
          </div>
          {/* Course name */}
          <h2 className="text-white font-bold text-sm leading-snug">{courseName ?? 'Course Enrolment'}</h2>

          {/* Partner gift banner */}
          {defaultPartnerCode && discountPct > 0 && (
            <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2"
              style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)' }}>
              <span className="text-sm shrink-0">🎁</span>
              <div>
                <p className="text-amber-300 text-xs font-semibold leading-snug">
                  {partnerName ? `Gift from ${partnerName}` : 'Partner Gift'}
                </p>
                <p className="text-amber-200/80 text-xs mt-0.5">
                  {discountPct}% discount has been applied to your enrolment
                </p>
              </div>
            </div>
          )}

          {/* Partner code only (no discount) */}
          {defaultPartnerCode && !discountPct && (
            <div className="mt-2 flex items-center gap-2 rounded-xl px-3 py-1.5"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <span className="text-indigo-300 text-xs">
                🤝 Referred by{partnerName ? ` ${partnerName}` : ''}{' '}
                <span className="font-mono font-semibold text-indigo-200">{defaultPartnerCode}</span>
              </span>
            </div>
          )}
        </div>

        {/* ── Modal body ─────────────────────────────────────────────────── */}
        <div className="px-5 py-3 overflow-y-auto" style={{ background: '#0f172a', maxHeight: 'calc(90vh - 130px)' }}>
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="text-green-400 font-bold text-lg">Payment Successful!</p>
              <p className="text-slate-400 text-sm">Redirecting to batch selection…</p>
              <p className="text-slate-500 text-xs mt-1">
                Not redirected?{' '}
                <a
                  href={courseId && `/select-batch?course_id=${courseId}`}
                  className="text-indigo-400 underline"
                >
                  Click here to choose your batch
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-3">

              {/* Self / Gift */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('self')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'self'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}>
                  For Myself
                </button>
                <button
                  onClick={() => setMode('gift')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'gift'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}>
                  Gift to Someone
                </button>
              </div>

              {/* Fields */}
              <div className="space-y-2">
                <div>
                  <Label className="text-slate-300 text-[11px] mb-0.5 block">Full Name *</Label>
                  <Input className={inputCls + ' h-8 text-sm py-1.5'} value={name}
                    onChange={e => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div>
                  <Label className="text-slate-300 text-[11px] mb-0.5 block">Email *</Label>
                  <Input className={inputCls + ' h-8 text-sm py-1.5'} type="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <Label className="text-slate-300 text-[11px] mb-0.5 block">Mobile *</Label>
                  <Input className={inputCls + ' h-8 text-sm py-1.5'} value={mobile}
                    onChange={e => setMobile(e.target.value)} placeholder="+91 98765 43210" />
                </div>
              </div>

              {mode === 'gift' && (
                <div>
                  <Label className="text-slate-300 text-[11px] mb-0.5 block">Friend&apos;s Email *</Label>
                  <Input className={inputCls + ' h-8 text-sm py-1.5'} type="email" value={friendEmail}
                    onChange={e => setFriendEmail(e.target.value)} placeholder="friend@example.com" />
                </div>
              )}

              {/* Payment plan */}
              <div>
                <Label className="text-slate-300 text-[11px] mb-0.5 block">Payment Plan</Label>
                <Select value={frequency} onValueChange={v => { if (v === 'full' || v === 'half') setFrequency(v) }}>
                  <SelectTrigger className={inputCls + ' h-8 text-sm'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="full">
                      Full Payment — {price ? formatCurrency(priceAfterAuto) : '—'}
                      {discountPct > 0 && price && (
                        <span className="text-slate-400 line-through ml-2 text-xs">{formatCurrency(mrp)}</span>
                      )}
                    </SelectItem>
                    <SelectItem value="half">
                      50-50 Plan — {price ? formatCurrency(priceAfterAuto / 2) : '—'} now
                      {discountPct > 0 && price && (
                        <span className="text-slate-400 line-through ml-2 text-xs">{formatCurrency(mrp / 2)}</span>
                      )}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discount code */}
              <div>
                <Label className="text-slate-300 text-[11px] mb-0.5 block">Discount Code (optional)</Label>
                <Input
                  className={inputCls + ' h-8 text-sm py-1.5 uppercase tracking-wider'}
                  value={discountCode}
                  onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountApplied(0); setFinalAmount(null) }}
                  placeholder="e.g. ADMINAX"
                />
              </div>

              {/* Price breakdown — visible immediately when partner discount exists */}
              {(discountPct > 0 || discountApplied > 0) && price && (
                <div className="rounded-xl p-2.5 space-y-1"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">MRP</span>
                    <span className="text-slate-400 line-through">{formatCurrency(mrpForPlan)}</span>
                  </div>
                  {discountPct > 0 && discountApplied === 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">
                        Partner discount ({discountPct}% off)
                        {partnerName && <span className="text-green-400/70 ml-1">· Gift from {partnerName}</span>}
                      </span>
                      <span className="text-green-400 font-semibold text-xs">
                        −{formatCurrency(Math.round(mrpForPlan * discountPct / 100))}
                      </span>
                    </div>
                  )}
                  {discountApplied > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">🎉 {discountLabel}</span>
                      <span className="text-green-400 font-semibold">−{formatCurrency(discountApplied)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs border-t pt-1"
                    style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                    <span className="text-white">You pay{frequency === 'half' ? ' now' : ''}</span>
                    <span className="text-indigo-300 text-sm">{formatCurrency(displayPrice)}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-400 text-sm rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  {error}
                </div>
              )}

              {/* CTA button */}
              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                style={{ background: loading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {loading
                  ? 'Processing…'
                  : `Pay ${formatCurrency(displayPrice)} →`}
              </button>

              <p className="text-xs text-slate-600 text-center">
                Secured by Razorpay · 256-bit SSL · GST invoice issued automatically
              </p>
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}
