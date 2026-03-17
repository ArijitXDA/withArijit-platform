'use client'
import { useState } from 'react'
import { PaymentModal } from './PaymentModal'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaymentModalTriggerProps {
  courseId?: string
  courseName?: string
  price?: number
  label?: string
  className?: string
}

export function PaymentModalTrigger({
  courseId,
  courseName,
  price,
  label = 'Enrol Now →',
  className,
}: PaymentModalTriggerProps) {
  const [open, setOpen] = useState(false)

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
      />
    </>
  )
}
