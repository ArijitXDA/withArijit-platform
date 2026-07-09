'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  type CurrencyCode, type FxRates,
  CURRENCY_COOKIE, CURRENCY_LOCALE, CURRENCY_SYMBOL, DEFAULT_FX,
  inrPerUnit, isCurrency,
} from '@/lib/currency-config'

type Ctx = {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
  rates: FxRates
  /** Convert an INR amount to the active currency and format it (with an optional suffix like " / mo"). */
  format: (inr: number, suffix?: string) => string
  /** Convert an INR amount to the active currency as a NUMBER (INR is rounded to whole rupees). */
  convert: (inr: number) => number
  symbol: string
  ready: boolean
}

const CurrencyContext = createContext<Ctx | null>(null)

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

function fmt(inr: number, currency: CurrencyCode, rates: FxRates, suffix?: string): string {
  const val = currency === 'INR' ? Math.round(inr) : inr / inrPerUnit(currency, rates)
  const s = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: 'currency', currency,
    minimumFractionDigits: currency === 'INR' ? 0 : 2,
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(val)
  return suffix ? `${s}${suffix}` : s
}

/**
 * Wraps the public site. `rates` come from the server (admin-set, ISR-baked).
 * The selected currency is resolved on the CLIENT (cookie, else a geo suggestion)
 * so the pages stay static/ISR. Until resolved, everything renders as INR so SSR
 * and first paint match (no hydration mismatch) — non-INR visitors see a one-time
 * INR→their-currency settle after mount.
 */
export function CurrencyProvider({ children, rates }: { children: ReactNode; rates: FxRates }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('INR')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = readCookie(CURRENCY_COOKIE)
    if (isCurrency(saved)) {
      setCurrencyState(saved)
      setReady(true)
      return
    }
    // No choice yet — ask the server for a geo suggestion, then persist it.
    fetch('/api/geo')
      .then((r) => r.json())
      .then((j) => {
        if (isCurrency(j?.currency)) {
          setCurrencyState(j.currency)
          document.cookie = `${CURRENCY_COOKIE}=${j.currency}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
        }
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c)
    document.cookie = `${CURRENCY_COOKIE}=${c}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }, [])

  // Until the cookie/geo is resolved, behave as INR so SSR == first client render.
  const effective: CurrencyCode = ready ? currency : 'INR'

  const convert = useCallback(
    (inr: number) => (effective === 'INR' ? Math.round(inr) : inr / inrPerUnit(effective, rates)),
    [effective, rates],
  )
  const format = useCallback(
    (inr: number, suffix?: string) => fmt(inr, effective, rates, suffix),
    [effective, rates],
  )

  return (
    <CurrencyContext.Provider
      value={{ currency: effective, setCurrency, rates, format, convert, symbol: CURRENCY_SYMBOL[effective], ready }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

// Safe INR fallback for any <Price> rendered outside a provider (e.g. the excluded
// student dashboard) — always renders INR.
const INR_FALLBACK: Ctx = {
  currency: 'INR',
  setCurrency: () => {},
  rates: DEFAULT_FX,
  format: (inr, suffix) => fmt(inr, 'INR', DEFAULT_FX, suffix),
  convert: (inr) => Math.round(inr),
  symbol: '₹',
  ready: true,
}

export function useCurrency(): Ctx {
  return useContext(CurrencyContext) ?? INR_FALLBACK
}

/** Render an INR amount in the visitor's selected currency. Usable from server or client parents. */
export function Price({ inr, className, suffix }: { inr: number; className?: string; suffix?: string }) {
  const { format } = useCurrency()
  return <span className={className}>{format(inr, suffix)}</span>
}
