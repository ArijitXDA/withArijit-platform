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
  // Pre-fill from webinar deep link
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
  const [mode, setMode]               = useState<'self' | 'gift'>('self')
  const [name, setName]               = useState(defaultName)
  const [email, setEmail]             = useState(defaultEmail)
  const [mobile, setMobile]           = useState(defaultMobile)
  const [friendEmail, setFriendEmail] = useState('')
  const [frequency, setFrequency]     = useState<'full' | 'half'>('full')
  const [discountCode, setDiscountCode] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // Sync pre-fill when modal opens
  useEffect(() => {
    if (open) {
      if (defaultName)   setName(defaultName)
      if (defaultEmail)  setEmail(defaultEmail)
      if (defaultMobile) setMobile(defaultMobile)
    }
  }, [open, defaultName, defaultEmail, defaultMobile])

  const displayPrice = frequency === 'half' ? (price ?? 0) / 2 : (price ?? 0)

  async function handlePay() {
    setError('')
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    if (mode === 'gift' && !friendEmail.trim()) {
      setError("Please enter your friend's email address.")
      return
    }

    setLoading(true)
    try {
      // Step 1: Create Razorpay order
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id:         courseId,
          payment_frequency: frequency,
          discount_code:     discountCode || undefined,
          name,
          email,
          mobile,
          mode,
          friend_email:      mode === 'gift' ? friendEmail : undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to create order.')
        setLoading(false)
        return
      }

      const { orderId, amount, currency } = data
      if (typeof (window as any).Razorpay === 'undefined') {
        setError('Payment system is still loading. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      // Step 2: Open Razorpay checkout
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
            // Step 3: Verify signature
            const verifyRes = await fetch('/api/payments/verify-payment', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify(response),
            })
            if (!verifyRes.ok) {
              setError('Payment verification failed. Please contact support.')
              setLoading(false)
              return
            }

            // Step 4: Create enrolment + commission + invite auth
            await fetch('/api/enrollment/self', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                payment_id:      response.razorpay_payment_id,
                order_id:        response.razorpay_order_id,
                course_id:       courseId,
                name,
                email,
                mobile,
                amount:          displayPrice,
                discount_code:   discountCode || undefined,
                partner_code:    defaultPartnerCode || undefined,
                enrolment_type:  frequency === 'full' ? 'full_payment' : 'half_payment',
              }),
            })

            onClose()
            window.location.href = '/dashboard'
          } catch {
            setError('Enrolment recording failed. Please contact support with your payment ID: ' + response.razorpay_payment_id)
            setLoading(false)
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
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
          <DialogTitle>Enrol in {courseName ?? 'Course'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button variant={mode === 'self' ? 'default' : 'outline'} size="sm" onClick={() => setMode('self')}>
              For Myself
            </Button>
            <Button variant={mode === 'gift' ? 'default' : 'outline'} size="sm" onClick={() => setMode('gift')}>
              Gift to Someone
            </Button>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Payment — {price ? formatCurrency(price) : '—'}</SelectItem>
                <SelectItem value="half">50-50 Plan — {price ? formatCurrency(price / 2) : '—'} now</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pm-discount">Discount Code (optional)</Label>
            <Input id="pm-discount" value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="EARLY20" />
          </div>

          {defaultPartnerCode && (
            <p className="text-xs text-indigo-500">
              🤝 Partner referral: <span className="font-mono">{defaultPartnerCode}</span>
            </p>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button className="w-full" onClick={handlePay} disabled={loading}>
            {loading ? 'Processing…' : `Pay ${price ? formatCurrency(displayPrice) : ''} →`}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Secured by Razorpay · GST invoice issued automatically
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
