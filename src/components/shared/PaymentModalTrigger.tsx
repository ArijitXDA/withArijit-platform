'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { PaymentModal } from './PaymentModal'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'

interface PaymentModalTriggerProps {
  courseId?: string
  courseName?: string
  price?: number
  label?: string
  className?: string
  // Pre-fill overrides (e.g. from server-side deep link page)
  defaultName?: string
  defaultEmail?: string
  defaultMobile?: string
  defaultPartnerCode?: string
}

export function PaymentModalTrigger({
  courseId,
  courseName,
  price,
  label = 'Enrol Now →',
  className,
  defaultName,
  defaultEmail,
  defaultMobile,
  defaultPartnerCode,
}: PaymentModalTriggerProps) {
  const [open, setOpen] = useState(false)
  const searchParams    = useSearchParams()

  // Also read partner_code / email from URL query params (webinar deep link)
  const urlPartnerCode = searchParams.get('partner') ?? searchParams.get('utm_source') ?? ''
  const urlEmail       = searchParams.get('email') ?? ''
  const urlName        = searchParams.get('name') ?? ''
  const urlMobile      = searchParams.get('mobile') ?? ''

  // Props win over URL params
  const resolvedPartnerCode = defaultPartnerCode || urlPartnerCode || ''
  const resolvedEmail       = defaultEmail || urlEmail || ''
  const resolvedName        = defaultName  || urlName  || ''
  const resolvedMobile      = defaultMobile || urlMobile || ''

  // Auto-open if ?enrol=1 is in the URL
  useEffect(() => {
    if (searchParams.get('enrol') === '1') setOpen(true)
  }, [searchParams])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ size: 'lg' }), className)}
      >
        {label}
      </button>
      <PaymentModal
        open={open}
        onClose={() => setOpen(false)}
        courseId={courseId}
        courseName={courseName}
        price={price}
        defaultName={resolvedName}
        defaultEmail={resolvedEmail}
        defaultMobile={resolvedMobile}
        defaultPartnerCode={resolvedPartnerCode}
      />
    </>
  )
}
