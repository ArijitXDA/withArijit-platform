'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { PaymentModal } from './PaymentModal'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

interface PaymentModalTriggerProps {
  courseId?: string
  courseName?: string
  price?: number
  discountPct?: number      // e.g. 40 for 40% — shows discounted price on CTA button
  partnerName?: string      // e.g. "Ryan Pinto" — shown in gift banner inside modal
  label?: string
  className?: string
  defaultName?: string
  defaultEmail?: string
  defaultMobile?: string
  defaultPartnerCode?: string
  membership?: boolean
}

export function PaymentModalTrigger({
  courseId,
  courseName,
  price,
  discountPct = 0,
  partnerName = '',
  label = 'Enrol Now →',
  className,
  defaultName,
  defaultEmail,
  defaultMobile,
  defaultPartnerCode,
  membership = false,
}: PaymentModalTriggerProps) {
  const [open, setOpen] = useState(false)
  const searchParams    = useSearchParams()

  const urlPartnerCode = searchParams.get('partner') ?? searchParams.get('utm_source') ?? ''
  const urlEmail       = searchParams.get('email')   ?? ''
  const urlName        = searchParams.get('name')    ?? ''
  const urlMobile      = searchParams.get('mobile')  ?? ''

  const resolvedPartnerCode = defaultPartnerCode || urlPartnerCode || ''
  const resolvedEmail       = defaultEmail       || urlEmail       || ''
  const resolvedName        = defaultName        || urlName        || ''
  const resolvedMobile      = defaultMobile      || urlMobile      || ''

  // Auto-open if ?enrol=1 in URL
  useEffect(() => {
    if (searchParams.get('enrol') === '1') setOpen(true)
  }, [searchParams])

  // Compute the discounted price for the CTA button label
  const discountedPrice =
    price && discountPct > 0
      ? Math.round(price * (1 - discountPct / 100))
      : price

  // Build the button label — if discount, show discounted price prominently
  const buttonLabel =
    discountPct > 0 && discountedPrice
      ? `🎓 Enrol Now — ${formatCurrency(discountedPrice)} (${discountPct}% off) →`
      : label

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ size: 'lg' }), className)}
      >
        {buttonLabel}
      </button>
      <PaymentModal
        open={open}
        onClose={() => setOpen(false)}
        courseId={courseId}
        courseName={courseName}
        price={price}
        discountPct={discountPct}
        partnerName={partnerName}
        defaultName={resolvedName}
        defaultEmail={resolvedEmail}
        defaultMobile={resolvedMobile}
        defaultPartnerCode={resolvedPartnerCode}
        membership={membership}
      />
    </>
  )
}
