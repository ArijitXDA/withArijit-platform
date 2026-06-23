import crypto from 'crypto'

// Verifies the cross-app (partner admin → www) impersonation handoff token.
// Must use the SAME secret as the partner app's signer (SUPABASE_SERVICE_ROLE_KEY
// by default — both apps share the same Supabase project — or IMPERSONATION_SECRET).
const SECRET = process.env.IMPERSONATION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-insecure'

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

export interface ImpersonationClaim { studentEmail: string; adminEmail: string }

export function verifyImpersonationToken(token: string | null | undefined): ImpersonationClaim | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest())
  try {
    if (sig.length !== expected.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch { return null }
  try {
    const { e, a, x } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof e !== 'string' || typeof a !== 'string' || typeof x !== 'number') return null
    if (Date.now() > x) return null   // expired
    return { studentEmail: e, adminEmail: a }
  } catch { return null }
}
