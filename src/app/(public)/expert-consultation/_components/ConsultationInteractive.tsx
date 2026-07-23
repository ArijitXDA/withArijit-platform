'use client'

import { useEffect, useState, useCallback } from 'react'
import { tzForCountry, HOME_TZ } from '@/lib/timezone-config'
import { ConsultationProjectTypes } from './ConsultationProjectTypes'
import { ConsultationSlots } from './ConsultationSlots'
import { ConsultationEnquiryForm } from './ConsultationEnquiryForm'
import { ConsultationCheckout, type CheckoutType } from './ConsultationCheckout'
import type { ConsultationType, ConsultationConfig } from '../page'

export function ConsultationInteractive({
  types,
  config,
  checkoutEnabled,
}: {
  types: ConsultationType[]
  config: ConsultationConfig
  checkoutEnabled: boolean
}) {
  // SSR + first paint default to IST so server and client HTML match; the real
  // buyer zone is resolved after mount (see below), which is also when the slot
  // times switch from IST to local.
  const [mounted, setMounted] = useState(false)
  const [buyerTz, setBuyerTz] = useState<string>(HOME_TZ)
  const [buyerCountry, setBuyerCountry] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [checkoutType, setCheckoutType] = useState<CheckoutType | null>(null)

  const handleBookAndPay = useCallback(
    (code: string) => {
      const t = types.find((x) => x.code === code)
      if (!t || t.is_dynamic || t.price_per_hour_usd == null) return
      setCheckoutType({
        code: t.code,
        label: t.label,
        rateUsd: t.price_per_hour_usd,
        minChargeUsd: t.min_charge_usd ?? 0,
      })
    },
    [types],
  )

  useEffect(() => {
    // Primary source: the browser's own IANA zone (exact, DST-correct, multi-zone aware).
    let tz = ''
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    } catch {
      tz = ''
    }
    if (tz) setBuyerTz(tz)
    setMounted(true)

    // Best-effort country (for the enquiry record + a tz fallback when the browser
    // gave us nothing). Never blocks the UI.
    fetch('/api/geo')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return
        if (j.country) setBuyerCountry(j.country)
        if (!tz && j.country) setBuyerTz(tzForCountry(j.country))
      })
      .catch(() => {})
  }, [])

  const handleEnquireAbout = useCallback((code: string) => {
    setSelectedType(code)
    if (typeof document !== 'undefined') {
      document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <>
      <div id="book" className="scroll-mt-20">
        <ConsultationProjectTypes
          types={types}
          config={config}
          selectedType={selectedType}
          onEnquire={handleEnquireAbout}
          checkoutEnabled={checkoutEnabled}
          onBookAndPay={handleBookAndPay}
        />
      </div>

      {checkoutType && (
        <ConsultationCheckout
          type={checkoutType}
          freeAttendees={config.free_attendees}
          surchargePerPersonPerHour={config.group_surcharge_per_person_per_hour_usd}
          gstRate={config.gst_rate}
          gstMode={config.gst_mode}
          fxUsdInr={config.fx_usd_inr}
          defaultCountry={buyerCountry}
          buyerTimezone={mounted ? buyerTz : null}
          onClose={() => setCheckoutType(null)}
        />
      )}

      <ConsultationSlots mounted={mounted} buyerTz={buyerTz} checkoutEnabled={checkoutEnabled} />

      <section id="enquiry" className="scroll-mt-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20">
          <ConsultationEnquiryForm
            types={types}
            selectedType={selectedType}
            onSelectType={setSelectedType}
            buyerCountry={buyerCountry}
            buyerTimezone={mounted ? buyerTz : null}
            checkoutEnabled={checkoutEnabled}
          />
        </div>
      </section>
    </>
  )
}
