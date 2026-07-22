// Pure USD price calculator for the Expert Consultation checkout (Phase 4). Native USD
// throughout — NEVER route through the INR pipeline. Used both client-side (live display)
// and server-side (the authoritative re-computation the charge is built from). No I/O.

export type DurationSku = 'min30' | 'min60' | 'wk4x60' | 'm2' | 'm3' | 'm6' | 'm12'

export const SKU_ORDER: DurationSku[] = ['min30', 'min60', 'wk4x60', 'm2', 'm3', 'm6', 'm12']

// hours = billable hours for the whole engagement; sessions = how many meetings (→ slots to pick).
export const SKU_HOURS: Record<DurationSku, number> = {
  min30: 0.5,
  min60: 1,
  wk4x60: 4,
  m2: 8,
  m3: 12,
  m6: 24,
  m12: 48,
}
export const SKU_SESSIONS: Record<DurationSku, number> = {
  min30: 1,
  min60: 1,
  wk4x60: 4,
  m2: 8,
  m3: 12,
  m6: 24,
  m12: 48,
}
export const SKU_LABEL: Record<DurationSku, string> = {
  min30: '30-minute session',
  min60: '60-minute session',
  wk4x60: '60 min × 4 (weekly, 1 month)',
  m2: '60 min weekly · 2 months',
  m3: '60 min weekly · 3 months',
  m6: '60 min weekly · 6 months',
  m12: '60 min weekly · 12 months',
}

export function isDurationSku(v: unknown): v is DurationSku {
  return typeof v === 'string' && (SKU_ORDER as string[]).includes(v)
}

export type DiscountSpec = { kind: 'percentage' | 'flat'; value: number }

export type PriceInputs = {
  rateUsd: number // price_per_hour_usd (type1-3) or the approved quote.final_rate_usd (type4)
  minChargeUsd: number // per-engagement floor; 0 for type4 (no floor — the rate is bespoke)
  sku: DurationSku
  attendees: number
  freeAttendees: number
  surchargePerPersonPerHour: number
  discount?: DiscountSpec | null
}

export type PriceBreakdown = {
  hours: number
  sessions: number
  rateUsd: number
  baseUsd: number // rate × hours, floored at the per-engagement minimum
  surchargeUsd: number // group surcharge (non-discountable)
  discountUsd: number
  totalUsd: number
  amountCents: number // exact Razorpay amount in cents
}

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100

/**
 * Order of operations is load-bearing (founder-confirmed):
 *   base      = max(rate × hours, minCharge)     ← per-ENGAGEMENT floor, before surcharge
 *   surcharge = perPersonPerHour × extraAttendees × hours   ← added after, NOT discountable
 *   discount  = applies to base only
 *   total     = (base − discount) + surcharge
 */
export function computeConsultationPrice(i: PriceInputs): PriceBreakdown {
  const hours = SKU_HOURS[i.sku]
  const sessions = SKU_SESSIONS[i.sku]
  const rateUsd = Math.max(0, Number(i.rateUsd) || 0)
  const minCharge = Math.max(0, Number(i.minChargeUsd) || 0)

  const baseUsd = round2(Math.max(rateUsd * hours, minCharge))

  const extra = Math.max(0, Math.floor(Number(i.attendees) || 0) - Math.max(0, Math.floor(Number(i.freeAttendees) || 0)))
  const surchargeUsd = round2(Math.max(0, Number(i.surchargePerPersonPerHour) || 0) * extra * hours)

  let discountUsd = 0
  if (i.discount && i.discount.value > 0) {
    discountUsd =
      i.discount.kind === 'percentage'
        ? round2(baseUsd * Math.min(100, i.discount.value) / 100)
        : Math.min(round2(i.discount.value), baseUsd)
  }

  const totalUsd = round2(Math.max(0, baseUsd - discountUsd) + surchargeUsd)
  return {
    hours,
    sessions,
    rateUsd,
    baseUsd,
    surchargeUsd,
    discountUsd,
    totalUsd,
    amountCents: Math.round(totalUsd * 100),
  }
}
