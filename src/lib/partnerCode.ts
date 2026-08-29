/**
 * src/lib/partnerCode.ts — the opaque partner code (www side).
 *
 * ─── WHY ─────────────────────────────────────────────────────────────────────
 * partner_code used to BE the partner's name (first 10 chars of full_name + '-YYMM').
 * Partners hand that code to strangers — it is in every QR, referral link and poster —
 * so it leaked their identity to every student they pitched. Every partner now has an
 * opaque `partners.partner_code_v2`, shape ^OS[0-9]{7}$, and that is the ONLY code
 * emitted anywhere.
 *
 * ─── THE RULE ON THIS SIDE ───────────────────────────────────────────────────
 * www is almost entirely an INBOUND surface: ?partner= / ?ref= / utm_source land here
 * and turn into attribution and, eventually, commission. So:
 *
 *   NEVER `.eq('partner_code', code)`.  The old codes are still printed on collateral
 *   and embedded in QRs already posted, and the new ones are what every fresh link
 *   carries — a single-column match silently drops one of the two. On the enrolment
 *   path that means the partner is not resolved and the commission is never booked.
 *
 *   Use resolvePartnerIdByCode() / resolvePartnerByCode(), which read
 *   partner_code_aliases (every code a partner has ever held → their id).
 *
 * Stored free-text values (qr_landing_registrations.utm_source,
 * student_profiles.referred_by_partner_code, …) are NOT rewritten. They keep whatever
 * code was current when the row was written; resolution goes through the alias table
 * forever.
 */

/** Trim + uppercase. Codes are stored uppercase; the resolver upper()s its input too. */
export function normalizePartnerCode(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase()
}

/** The code a partner may be shown / that goes into any link. */
export function publicPartnerCode(partner: any): string {
  const v2 = String(partner?.partner_code_v2 ?? '').trim()
  if (v2) return v2.toUpperCase()
  return String(partner?.partner_code ?? '').trim().toUpperCase()
}

/** partner_id for ANY code the partner has ever held, or null. */
export async function resolvePartnerIdByCode(client: any, code: unknown): Promise<string | null> {
  const c = normalizePartnerCode(code)
  if (!c) return null
  const { data, error } = await client.rpc('resolve_partner_code', { p_code: c })
  if (error) return null
  return (data as string | null) ?? null
}

/** The partners row behind ANY of the partner's codes. Replaces .eq('partner_code', …). */
export async function resolvePartnerByCode(
  client: any,
  code: unknown,
  columns = 'id, partner_code, partner_code_v2, full_name, status',
): Promise<any | null> {
  const id = await resolvePartnerIdByCode(client, code)
  if (!id) return null
  const { data } = await client.from('partners').select(columns).eq('id', id).maybeSingle()
  return data ?? null
}

/** EVERY code this partner has ever held — for matching historical free-text rows. */
export async function partnerCodesFor(client: any, code: unknown): Promise<string[]> {
  const c = normalizePartnerCode(code)
  if (!c) return []
  const { data, error } = await client.rpc('partner_codes_for', { p_code: c })
  if (error || !Array.isArray(data) || data.length === 0) return [c]
  return data as string[]
}
