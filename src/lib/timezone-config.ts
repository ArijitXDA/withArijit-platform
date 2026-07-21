// Pure, dependency-free timezone config — safe to import from server OR client.
// Used by the Expert Consultation page to show IST availability windows in the
// visitor's own timezone. The visitor's IANA zone is normally read directly from
// the browser (Intl.DateTimeFormat().resolvedOptions().timeZone); this country map
// is only the FALLBACK when the browser can't provide one, driven by the country
// that /api/geo derives from the Vercel edge header. Structurally mirrors
// currency-config.ts / geoDefaultCurrency.

export const HOME_TZ = 'Asia/Kolkata'

// V8/Chrome report India's zone as the legacy alias 'Asia/Calcutta' on many builds,
// so a real Indian visitor's browser often does NOT return 'Asia/Kolkata'. Treat both
// as home so we show the clean "India Standard Time" framing rather than a redundant
// "GMT+5:30 + also-IST" double line and the outdated city name "Calcutta".
const HOME_TZ_ALIASES = new Set(['Asia/Kolkata', 'Asia/Calcutta'])

/** True if the zone is India Standard Time under any of its IANA IDs. */
export function isHomeZone(tz: string | null | undefined): boolean {
  return !!tz && HOME_TZ_ALIASES.has(tz)
}

// One representative IANA zone per country. Multi-zone countries (US, AU, RU, …)
// pick the most populous business zone; the browser zone (preferred source) is
// exact, so this coarse map only ever bites when the browser zone is unavailable.
const COUNTRY_TZ: Record<string, string> = {
  IN: 'Asia/Kolkata',
  US: 'America/New_York',
  CA: 'America/Toronto',
  GB: 'Europe/London',
  IE: 'Europe/Dublin',
  DE: 'Europe/Berlin',
  FR: 'Europe/Paris',
  NL: 'Europe/Amsterdam',
  ES: 'Europe/Madrid',
  IT: 'Europe/Rome',
  PT: 'Europe/Lisbon',
  CH: 'Europe/Zurich',
  SE: 'Europe/Stockholm',
  PL: 'Europe/Warsaw',
  AE: 'Asia/Dubai',
  SA: 'Asia/Riyadh',
  QA: 'Asia/Qatar',
  KW: 'Asia/Kuwait',
  BH: 'Asia/Bahrain',
  OM: 'Asia/Muscat',
  IL: 'Asia/Jerusalem',
  SG: 'Asia/Singapore',
  MY: 'Asia/Kuala_Lumpur',
  ID: 'Asia/Jakarta',
  TH: 'Asia/Bangkok',
  PH: 'Asia/Manila',
  VN: 'Asia/Ho_Chi_Minh',
  HK: 'Asia/Hong_Kong',
  CN: 'Asia/Shanghai',
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  TW: 'Asia/Taipei',
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
  ZA: 'Africa/Johannesburg',
  NG: 'Africa/Lagos',
  KE: 'Africa/Nairobi',
  EG: 'Africa/Cairo',
  BR: 'America/Sao_Paulo',
  MX: 'America/Mexico_City',
  AR: 'America/Argentina/Buenos_Aires',
  CL: 'America/Santiago',
  CO: 'America/Bogota',
  LK: 'Asia/Colombo',
  BD: 'Asia/Dhaka',
  PK: 'Asia/Karachi',
  NP: 'Asia/Kathmandu',
}

/** Best-guess IANA zone for a 2-letter country code; falls back to the home zone (IST). */
export function tzForCountry(country: string | null | undefined): string {
  if (!country) return HOME_TZ
  return COUNTRY_TZ[country.toUpperCase()] ?? HOME_TZ
}
