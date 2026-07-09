'use client'
import { useState, useEffect } from 'react'
import { PaymentModalTrigger } from '@/components/shared/PaymentModalTrigger'
import { Price } from '@/lib/currency'

export function CourseStickyBar({
  course,
  mrp,
  enrolProps,
}: {
  course: any
  mrp: number
  enrolProps: any
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 500)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        background: '#0d0d1f',
        borderTop: '1px solid rgba(139,92,246,0.3)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Course name + price */}
        <div className="min-w-0 hidden sm:block">
          <p className="text-white font-bold text-sm truncate">{course.name}</p>
          <p className="text-slate-400 text-xs">Enrol in the upcoming batch · AI Kit couriered</p>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-auto">
          <div className="text-right hidden sm:block">
            <p className="text-indigo-300 text-xs">Fee increases monthly</p>
            <Price inr={mrp} className="text-white font-black text-xl block" />
          </div>
          <PaymentModalTrigger
            {...enrolProps}
            label="🎓 Enrol Now →"
            className="text-sm px-5 py-3 font-bold whitespace-nowrap bg-pink-500 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border border-pink-300/50 shadow-[0_0_16px_rgba(236,72,153,0.7),0_0_34px_rgba(236,72,153,0.4)] hover:shadow-[0_0_26px_rgba(236,72,153,0.95),0_0_52px_rgba(236,72,153,0.55)] hover:brightness-110"
          />
        </div>
      </div>
    </div>
  )
}
