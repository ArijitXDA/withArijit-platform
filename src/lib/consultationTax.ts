// Expert Consultation — turns the pure USD price into the actual charge + tax breakdown
// based on the buyer's billing country. Pure (no I/O).
//   • Non-India  → EXPORT of services: charged in USD, zero-rated (no GST, under LUT).
//   • India      → DOMESTIC supply: charged in INR + 18% GST. CGST+SGST when the buyer is
//                  in the seller's state (Maharashtra), else IGST.
// The INR figure is the USD list × the admin FX rate; GST is then added on top ('exclusive')
// or backed out of it ('inclusive') per consultation_config.gst_mode.
import type { PriceBreakdown } from './consultationCheckoutPricing'

export type TaxRegime = 'export' | 'domestic_gst'
export type GstMode = 'exclusive' | 'inclusive'

// Seller's registered state (Star Analytix Pvt Ltd, Mumbai). Intra-state → CGST+SGST.
export const SELLER_STATE = 'Maharashtra'

export interface ChargeBreakdown {
  regime: TaxRegime
  currency: 'USD' | 'INR'
  totalUsd: number // charged amount (export) OR the USD list reference (domestic)
  amountCents?: number // USD smallest unit — export only
  taxableInr?: number // taxable value in INR — domestic only
  gstRate?: number
  cgstInr?: number
  sgstInr?: number
  igstInr?: number
  totalInr?: number // charged INR incl GST — domestic only
  amountPaise?: number // INR smallest unit — domestic only
  fxRate: number // INR per 1 USD (snapshot)
  inrEquivalent: number // INR-equivalent for the internal books (both regimes)
}

const rInr = (n: number) => Math.round(Number.isFinite(n) ? n : 0) // whole rupees

export function isIndia(countryCode: string | null | undefined): boolean {
  return String(countryCode ?? '').trim().toUpperCase() === 'IN'
}

export function computeConsultationCharge(opts: {
  usd: PriceBreakdown
  billingCountry: string | null | undefined
  billingState?: string | null
  fxRate: number // INR per 1 USD
  gstRate: number // e.g. 18
  gstMode: GstMode
}): ChargeBreakdown {
  const { usd, billingCountry, billingState, fxRate, gstRate, gstMode } = opts
  const totalUsd = Math.max(0, Number(usd.totalUsd) || 0)
  const fx = Number(fxRate) > 0 ? Number(fxRate) : 1

  if (!isIndia(billingCountry)) {
    return {
      regime: 'export',
      currency: 'USD',
      totalUsd,
      amountCents: Math.round(totalUsd * 100),
      fxRate: fx,
      inrEquivalent: rInr(totalUsd * fx),
    }
  }

  // Domestic India — INR + GST.
  const listInr = rInr(totalUsd * fx) // INR-equivalent of the USD list price
  const rate = Number(gstRate) > 0 ? Number(gstRate) : 18
  let taxableInr: number
  let gstInr: number
  let totalInr: number
  if (gstMode === 'inclusive') {
    totalInr = listInr
    taxableInr = rInr(listInr / (1 + rate / 100))
    gstInr = totalInr - taxableInr
  } else {
    taxableInr = listInr
    gstInr = rInr(listInr * (rate / 100))
    totalInr = taxableInr + gstInr
  }

  const intraState = String(billingState ?? '').trim().toLowerCase() === SELLER_STATE.toLowerCase()
  const cgstInr = intraState ? rInr(gstInr / 2) : 0
  const sgstInr = intraState ? gstInr - cgstInr : 0 // remainder → avoids a 1-rupee split drift
  const igstInr = intraState ? 0 : gstInr

  return {
    regime: 'domestic_gst',
    currency: 'INR',
    totalUsd, // reference (what the international list price was)
    taxableInr,
    gstRate: rate,
    cgstInr,
    sgstInr,
    igstInr,
    totalInr,
    amountPaise: Math.round(totalInr * 100),
    fxRate: fx,
    inrEquivalent: totalInr,
  }
}
