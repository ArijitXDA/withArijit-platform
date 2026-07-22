'use client'

import { Check, ArrowRight } from 'lucide-react'
import { formatUsd } from '@/lib/consultationUsd'
import type { ConsultationType, ConsultationConfig } from '../page'

// Short human subtitle per project type (the DB label is the full scope line).
const SUBTITLE: Record<string, string> = {
  type1: 'Build & govern agentic AI systems',
  type2: 'Frontier & infrastructure-grade AI',
  type3: 'Decisions from your data',
  type4: 'Something else? Tell us about it',
}

export function ConsultationProjectTypes({
  types,
  config,
  selectedType,
  onEnquire,
  checkoutEnabled = false,
  onBookAndPay,
}: {
  types: ConsultationType[]
  config: ConsultationConfig
  selectedType: string | null
  onEnquire: (code: string) => void
  checkoutEnabled?: boolean
  onBookAndPay?: (code: string) => void
}) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 mb-4">
          Choose your project area
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          Transparent, project-based USD pricing
        </h2>
        <p className="text-gray-600 mt-4">
          Pick the area closest to your work. Every rate is per hour, with a minimum engagement, and
          includes up to {config.free_attendees} attendees.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {types.map((t) => {
          const active = selectedType === t.code
          return (
            <div
              key={t.code}
              className={`flex flex-col rounded-2xl border-2 p-6 transition-all ${
                active
                  ? 'border-indigo-600 shadow-lg shadow-indigo-100'
                  : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1">
                  {SUBTITLE[t.code] ?? 'Consultation'}
                </p>
                <h3 className="text-lg font-bold text-gray-900 leading-snug">{t.label}</h3>
              </div>

              {/* Pricing */}
              <div className="mb-5">
                {t.is_dynamic ? (
                  <>
                    {t.floor_usd != null && t.ceiling_usd != null ? (
                      <p className="text-3xl font-black text-gray-900">
                        {`${formatUsd(t.floor_usd)}–${formatUsd(t.ceiling_usd)}`}
                        <span className="text-base font-bold text-gray-500">/hour</span>
                      </p>
                    ) : (
                      <p className="text-3xl font-black text-gray-900">Custom quote</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Custom quote — describe your project and we&apos;ll propose a fair rate.
                    </p>
                  </>
                ) : (
                  <>
                    {t.price_per_hour_usd != null ? (
                      <p className="text-3xl font-black text-gray-900">
                        {formatUsd(t.price_per_hour_usd)}
                        <span className="text-base font-bold text-gray-500">/hour</span>
                      </p>
                    ) : (
                      <p className="text-3xl font-black text-gray-900">Custom quote</p>
                    )}
                    {t.min_charge_usd != null && t.min_charge_usd > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        Minimum engagement {formatUsd(t.min_charge_usd)}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Services */}
              {t.services.length > 0 && (
                <ul className="space-y-2 mb-6 flex-1">
                  {t.services.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}

              {checkoutEnabled && !t.is_dynamic && onBookAndPay ? (
                <div className="mt-auto space-y-2">
                  <button
                    type="button"
                    onClick={() => onBookAndPay(t.code)}
                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Book &amp; pay <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEnquire(t.code)}
                    className="w-full px-5 py-2 rounded-xl text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
                  >
                    Or enquire first
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onEnquire(t.code)}
                  className={`mt-auto inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-sm font-bold transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  Enquire about this <ArrowRight size={16} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
