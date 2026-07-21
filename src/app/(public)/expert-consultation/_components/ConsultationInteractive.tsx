'use client'

import { useEffect, useState, useCallback } from 'react'
import { tzForCountry, HOME_TZ } from '@/lib/timezone-config'
import { ConsultationProjectTypes } from './ConsultationProjectTypes'
import { ConsultationSlots } from './ConsultationSlots'
import { ConsultationEnquiryForm } from './ConsultationEnquiryForm'
import type { ConsultationType, ConsultationConfig } from '../page'

export function ConsultationInteractive({
  types,
  config,
}: {
  types: ConsultationType[]
  config: ConsultationConfig
}) {
  // SSR + first paint default to IST so server and client HTML match; the real
  // buyer zone is resolved after mount (see below), which is also when the slot
  // times switch from IST to local.
  const [mounted, setMounted] = useState(false)
  const [buyerTz, setBuyerTz] = useState<string>(HOME_TZ)
  const [buyerCountry, setBuyerCountry] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)

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
      <ConsultationProjectTypes
        types={types}
        config={config}
        selectedType={selectedType}
        onEnquire={handleEnquireAbout}
      />

      <ConsultationSlots mounted={mounted} buyerTz={buyerTz} />

      <section id="enquiry" className="scroll-mt-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20">
          <ConsultationEnquiryForm
            types={types}
            selectedType={selectedType}
            onSelectType={setSelectedType}
            buyerCountry={buyerCountry}
            buyerTimezone={mounted ? buyerTz : null}
          />
        </div>
      </section>
    </>
  )
}
