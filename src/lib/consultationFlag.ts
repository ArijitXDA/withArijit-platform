import { createServiceClient } from '@/lib/supabase/service'

// Master switch for the Expert Consultation USD checkout (Phase 4). The entire charge path
// is dormant until this is flipped true (after Razorpay International + GST/CA gates clear).
// Fail-closed: any error → treated as disabled, so a config read failure can never expose
// a live charge path.
export async function isConsultationCheckoutEnabled(): Promise<boolean> {
  try {
    const svc = createServiceClient()
    const { data } = await svc
      .from('app_config')
      .select('value')
      .eq('key', 'consultation_checkout_enabled')
      .maybeSingle()
    return data?.value === true
  } catch {
    return false
  }
}
