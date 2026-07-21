// Expert Consultation is priced NATIVELY in USD (the consultation_* tables hold real
// USD figures), unlike the rest of the storefront whose money is INR and converts at
// the display boundary. This helper renders those USD values directly and is pure —
// no client boundary, safe to import from a server OR a client component. NEVER route
// these numbers through <Price inr=.. /> / useCurrency() — that would divide by the FX
// rate and turn $150 into ~$1.07 for a USD/EUR visitor.

const USD_LOCALE = 'en-US'

/** Format a USD amount. Whole dollars show no cents ($150); fractional amounts keep them ($99.50). */
export function formatUsd(usd: number, suffix?: string): string {
  const n = Number.isFinite(usd) ? usd : 0
  const hasCents = Math.round(n * 100) % 100 !== 0
  const s = new Intl.NumberFormat(USD_LOCALE, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n)
  return suffix ? `${s}${suffix}` : s
}
