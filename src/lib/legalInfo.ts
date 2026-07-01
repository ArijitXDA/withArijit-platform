// Single source of truth for the platform's legal identity + grievance contact.
// Referenced by every policy page, the footer, checkout microcopy, and emails so
// the Data Fiduciary is identified consistently (DPDP s.5 / IT Rules 2021 r.3(2)).
//
// TODO (founder): fill grievanceOfficerName, grievancePhone, gstin, cin below.
// Blank fields are intentionally NOT rendered (we never show a placeholder/fake
// statutory number on a live legal page). Create the grievance@ostaran.com inbox.

export const LEGAL = {
  // The legal entity that operates the oStaran / withArijit / AIwithArijit brands
  // and is the merchant-of-record + Data Fiduciary.
  entityName: 'Star Analytix Pvt Ltd',
  brand: 'oStaran',
  brandsLong: 'oStaran, withArijit and AIwithArijit',
  domains: 'www.ostaran.com, www.witharijit.com and www.aiwitharijit.com',
  registeredOffice: 'Mira Road East, Mumbai, Maharashtra, India — 401107',

  // Statutory identifiers — render only when provided.
  gstin: '' as string,
  cin: '' as string,

  // Grievance / Data-Protection Officer (DPDP s.13, IT Rules 2021 r.3(2),
  // IT SPDI Rules 2011 r.5(9), Consumer Protection (E-Commerce) Rules 2020).
  grievanceOfficerName: '' as string,          // TODO: name the officer, e.g. 'Arijit Chowdhury'
  grievanceEmail: 'grievance@ostaran.com',     // TODO: create this inbox
  grievancePhone: '+91 99300 51053',           // the published support line
  grievanceResponse: 'acknowledge within 48 hours and resolve within 30 days',

  // General support / privacy queries.
  supportEmail: 'ai@ostaran.com',
} as const

// Convenience: the registered-address / identity line used across policy pages.
export function entityIdentityLine() {
  const bits: string[] = [LEGAL.entityName]
  if (LEGAL.cin) bits.push(`CIN: ${LEGAL.cin}`)
  if (LEGAL.gstin) bits.push(`GSTIN: ${LEGAL.gstin}`)
  bits.push(LEGAL.registeredOffice)
  return bits.join(' · ')
}
