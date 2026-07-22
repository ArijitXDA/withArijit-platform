import { inrPerUnit, type CurrencyCode, type FxRates } from '@/lib/currency-config'

export interface OrderAmount {
  /** Razorpay order amount in the currency's SMALLEST unit (paise for INR, cents for USD/EUR). */
  amount: number
  currency: CurrencyCode
  /** Amount actually charged in major units (whole ₹, or e.g. 36.13 USD). */
  chargedAmount: number
  /** INR per 1 unit of `currency` at purchase (snapshot; 1 for INR). */
  fxRate: number
  /** INR-equivalent in whole rupees — used for all internal accounting. */
  inrAmount: number
}

/**
 * Convert an INR amount into a Razorpay order in the buyer's currency, snapshotting
 * the FX rate. INR is charged in whole rupees (unchanged behaviour); USD/EUR are
 * charged in 2-decimal units at the admin-set rate. The INR-equivalent is preserved
 * for internal accounting (amount_paid / commissions / balance), so only the *charge*
 * and the *invoice* are in the foreign currency.
 */
export function toOrderAmount(inrAmount: number, currency: CurrencyCode, rates: FxRates): OrderAmount {
  const inr = Math.round(inrAmount)
  if (currency === 'INR') {
    return { amount: inr * 100, currency: 'INR', chargedAmount: inr, fxRate: 1, inrAmount: inr }
  }
  const fxRate = inrPerUnit(currency, rates)
  const major = Math.round((inr / fxRate) * 100) / 100 // 2-decimal foreign amount
  return { amount: Math.round(major * 100), currency, chargedAmount: major, fxRate, inrAmount: inr }
}

/**
 * NATIVE-currency order: the price is already denominated in `currency` (e.g. the Expert
 * Consultation module is priced natively in USD). Charge that exact amount — do NOT run the
 * lossy USD→INR→USD round-trip toOrderAmount() would, which would drift the buyer-facing
 * figure and make the charge a function of a mutable INR base × mutable FX rate. The INR
 * equivalent is DERIVED once (at the snapshot rate) purely for internal books/reporting.
 */
export function toNativeOrderAmount(majorAmount: number, currency: CurrencyCode, rates: FxRates): OrderAmount {
  if (currency === 'INR') {
    const inr = Math.round(majorAmount)
    return { amount: inr * 100, currency: 'INR', chargedAmount: inr, fxRate: 1, inrAmount: inr }
  }
  const fxRate = inrPerUnit(currency, rates)
  const major = Math.round(majorAmount * 100) / 100 // exact 2-decimal native charge
  return {
    amount: Math.round(major * 100), // EXACT cents — e.g. 17500 for $175.00
    currency,
    chargedAmount: major, // exactly what the buyer approved
    fxRate, // snapshot INR per unit (books only)
    inrAmount: Math.round(major * fxRate), // derived INR-equivalent for internal accounting
  }
}
