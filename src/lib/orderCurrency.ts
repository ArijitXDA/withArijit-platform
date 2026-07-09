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
