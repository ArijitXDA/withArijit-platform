'use client'

import { Globe2, Clock } from 'lucide-react'
import { SLOT_WINDOWS, localizeSlot, istWindowLabel, tzCityLabel } from '@/lib/consultationSlots'
import { isHomeZone } from '@/lib/timezone-config'

export function ConsultationSlots({
  mounted,
  buyerTz,
  checkoutEnabled = false,
}: {
  mounted: boolean
  buyerTz: string
  checkoutEnabled?: boolean
}) {
  const isIST = !mounted || isHomeZone(buyerTz)
  // `now` is only read on the client after mount, so there is no SSR/UTC exposure.
  const now = mounted ? new Date() : null

  return (
    <section className="max-w-4xl mx-auto px-4 py-16 md:py-20">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <p className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 mb-4">
          Availability
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          Sessions in your timezone
        </h2>
        <p className="text-gray-600 mt-4 inline-flex items-center gap-2 justify-center flex-wrap">
          <Globe2 size={16} className="text-indigo-600" />
          {isIST ? (
            <span>Typical weekly availability, shown in India Standard Time.</span>
          ) : (
            <span>
              Typical weekly availability, converted to{' '}
              <span className="font-semibold text-gray-900">{tzCityLabel(buyerTz)}</span> time.
            </span>
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          <div className="col-span-4">Day</div>
          <div className="col-span-8">{isIST ? 'India time' : 'Your local time'}</div>
        </div>

        {SLOT_WINDOWS.map((win, i) => {
          if (isIST || !now) {
            const { day, range } = istWindowLabel(win)
            return (
              <div
                key={i}
                className="grid grid-cols-12 items-center px-5 py-4 border-b border-gray-100 last:border-0"
              >
                <div className="col-span-4 font-semibold text-gray-900">{day}</div>
                <div className="col-span-8 text-gray-700 inline-flex items-center gap-2">
                  <Clock size={14} className="text-indigo-500 shrink-0" />
                  {range}
                </div>
              </div>
            )
          }
          const slot = localizeSlot(win, buyerTz, now)
          return (
            <div
              key={i}
              className="grid grid-cols-12 items-center px-5 py-4 border-b border-gray-100 last:border-0"
            >
              <div className="col-span-4">
                <span className="font-semibold text-gray-900">{slot.localWeekday}</span>
                <span className="text-gray-400 text-sm ml-1.5">{slot.localDate}</span>
              </div>
              <div className="col-span-8">
                <div className="text-gray-900 inline-flex items-center gap-2">
                  <Clock size={14} className="text-indigo-500 shrink-0" />
                  {slot.localRange}
                </div>
                <div className="text-xs text-gray-400 ml-6">
                  {slot.istDayLabel} · {slot.istRange}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-sm text-gray-500 mt-5">
        {checkoutEnabled
          ? 'These are typical windows — you’ll pick your exact slot right after payment.'
          : 'These are typical windows — your exact slot is confirmed after your enquiry.'}
      </p>
    </section>
  )
}
