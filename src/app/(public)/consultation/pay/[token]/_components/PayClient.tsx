'use client'

import { useEffect, useState } from 'react'
import { ConsultationCheckout } from '@/app/(public)/expert-consultation/_components/ConsultationCheckout'

export function PayClient({
  payToken,
  rateUsd,
  freeAttendees,
  surchargePerPersonPerHour,
  gstRate,
  gstMode,
  fxUsdInr,
}: {
  payToken: string
  rateUsd: number
  freeAttendees: number
  surchargePerPersonPerHour: number
  gstRate: number
  gstMode: 'exclusive' | 'inclusive'
  fxUsdInr: number
}) {
  const [open, setOpen] = useState(true)
  const [tz, setTz] = useState<string | null>(null)

  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || null)
    } catch {
      setTz(null)
    }
  }, [])

  return (
    <div className="mt-8">
      {open ? (
        <ConsultationCheckout
          type={{ code: 'type4', label: 'Your custom project', rateUsd, minChargeUsd: 0 }}
          freeAttendees={freeAttendees}
          surchargePerPersonPerHour={surchargePerPersonPerHour}
          gstRate={gstRate}
          gstMode={gstMode}
          fxUsdInr={fxUsdInr}
          buyerTimezone={tz}
          payToken={payToken}
          onClose={() => setOpen(false)}
        />
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center px-7 py-4 rounded-xl bg-indigo-600 text-white text-base font-bold hover:bg-indigo-700"
        >
          Review &amp; pay
        </button>
      )}
    </div>
  )
}
