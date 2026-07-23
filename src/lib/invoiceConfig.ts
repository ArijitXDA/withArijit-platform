import type { InvoiceSeller } from '@/components/pdf/GSTInvoice'
import { LEGAL } from '@/lib/legalInfo'

// Loads the seller's statutory identity from app_config (editable in DB — founder swaps the
// GSTIN from 'Applied For' to the real number when issued, no deploy needed). Falls back to
// legalInfo.ts constants.
export async function loadInvoiceSeller(svc: {
  from: (t: string) => any
}): Promise<InvoiceSeller> {
  const m: Record<string, string> = {}
  try {
    const { data } = await svc
      .from('app_config')
      .select('key, value')
      .in('key', [
        'company_legal_name',
        'company_gstin',
        'company_reg_office',
        'company_state',
        'company_state_code',
        'consult_sac_code',
      ])
    for (const r of (data ?? []) as { key: string; value: unknown }[]) {
      m[r.key] = typeof r.value === 'string' ? r.value : String(r.value ?? '')
    }
  } catch {
    /* fall through to defaults */
  }
  return {
    legalName: m.company_legal_name || LEGAL.entityName,
    gstin: m.company_gstin || LEGAL.gstin || 'Applied For',
    regOffice: m.company_reg_office || LEGAL.registeredOffice,
    stateName: m.company_state || 'Maharashtra',
    stateCode: m.company_state_code || '27',
    email: LEGAL.supportEmail,
    sac: m.consult_sac_code || '998314',
  }
}
