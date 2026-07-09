// Pure, dependency-free currency config — safe to import from server OR client.
// The money math everywhere stays in INR (awa_courses.mrp); conversion to the
// visitor's currency happens ONLY at the display boundary (see currency.tsx).

export type CurrencyCode = 'INR' | 'USD' | 'EUR'
export const CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR']
export const CURRENCY_COOKIE = 'ostaran-currency'

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = { INR: '₹', USD: '$', EUR: '€' }
export const CURRENCY_LOCALE: Record<CurrencyCode, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'en-IE' }
export const CURRENCY_LABEL: Record<CurrencyCode, string> = { INR: 'INR ₹', USD: 'USD $', EUR: 'EUR €' }

export type FxRates = { usd_inr: number; eur_inr: number }
export const DEFAULT_FX: FxRates = { usd_inr: 140, eur_inr: 155 }

export function isCurrency(v: unknown): v is CurrencyCode {
  return v === 'INR' || v === 'USD' || v === 'EUR'
}

/** INR value of 1 unit of `currency` (1 for INR). Falls back to defaults if a rate is bad. */
export function inrPerUnit(currency: CurrencyCode, rates: FxRates): number {
  if (currency === 'USD') return rates.usd_inr > 0 ? rates.usd_inr : DEFAULT_FX.usd_inr
  if (currency === 'EUR') return rates.eur_inr > 0 ? rates.eur_inr : DEFAULT_FX.eur_inr
  return 1
}

// Euro-using countries → EUR; India → INR; everything else → USD; unknown → INR (home).
const EU_COUNTRIES = new Set([
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
])
export function geoDefaultCurrency(country: string | null | undefined): CurrencyCode {
  if (!country) return 'INR'
  const c = country.toUpperCase()
  if (c === 'IN') return 'INR'
  if (EU_COUNTRIES.has(c)) return 'EUR'
  return 'USD'
}
