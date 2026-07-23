import type { DiscountSpec } from '@/lib/consultationCheckoutPricing'

// Validates a discount code for the Expert Consultation. Percentage codes are currency-agnostic;
// a FLAT code only applies if it is explicitly scoped to the consultation course (its value is then
// treated as USD). Returns a DiscountSpec (applied to the base only) or a user-facing error message.
export type DiscountResult = { discount: DiscountSpec | null; error?: string }

export async function resolveConsultationDiscount(
  supabase: { from: (t: string) => any },
  rawCode: string,
  nowIso: string,
): Promise<DiscountResult> {
  const code = String(rawCode ?? '').trim().toUpperCase()
  if (!code) return { discount: null }

  const { data: consultCourse } = await supabase
    .from('awa_courses')
    .select('id')
    .eq('slug', 'expert-consultation')
    .maybeSingle()

  const { data: coupon } = await supabase
    .from('discount_codes')
    .select('id, type, discount_value, max_uses, uses_count, valid_from, valid_to, course_id, status')
    .eq('code', code)
    .eq('status', 'active')
    .maybeSingle()

  if (!coupon) return { discount: null, error: 'Invalid or expired coupon code.' }
  if (coupon.valid_from && nowIso < coupon.valid_from) return { discount: null, error: 'This coupon is not yet active.' }
  if (coupon.valid_to && nowIso > coupon.valid_to) return { discount: null, error: 'This coupon has expired.' }
  if (coupon.max_uses && (coupon.uses_count ?? 0) >= coupon.max_uses)
    return { discount: null, error: 'This coupon has reached its usage limit.' }
  if (coupon.course_id && coupon.course_id !== consultCourse?.id)
    return { discount: null, error: 'This coupon is not valid for consultations.' }

  if (coupon.type === 'percentage') return { discount: { kind: 'percentage', value: Number(coupon.discount_value) } }
  if (coupon.course_id && coupon.course_id === consultCourse?.id)
    return { discount: { kind: 'flat', value: Number(coupon.discount_value) } }
  return { discount: null, error: 'This coupon type is not supported for consultations.' }
}
