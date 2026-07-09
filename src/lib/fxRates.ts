import { createServiceClient } from '@/lib/supabase/service'
import { DEFAULT_FX, type FxRates } from '@/lib/currency-config'

/**
 * Read the admin-set FX rates from app_config.fx_rates (service-role, RLS-bypass).
 * Falls back to sane defaults if the row is missing or malformed so pricing never
 * breaks. Runs server-side; safe in ISR pages (no dynamic APIs).
 */
export async function getFxRates(): Promise<FxRates> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'fx_rates')
      .maybeSingle()
    const v = (data?.value ?? {}) as Partial<FxRates>
    const usd = Number(v.usd_inr)
    const eur = Number(v.eur_inr)
    return {
      usd_inr: usd > 0 ? usd : DEFAULT_FX.usd_inr,
      eur_inr: eur > 0 ? eur : DEFAULT_FX.eur_inr,
    }
  } catch {
    return DEFAULT_FX
  }
}
