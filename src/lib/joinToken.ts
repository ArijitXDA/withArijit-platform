import crypto from 'crypto'

// HMAC-signed, per-(student, session) join token. The token identifies WHO is
// joining WHICH session without a DB lookup, so the same link works from the
// dashboard or a reminder email, and every click is attributable. Signed with a
// server-only secret (never exposed to the client).
const SECRET = process.env.JOIN_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-insecure-secret'

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

export function signJoinToken(email: string, batchId: string, sessionNumber: number): string {
  const payload = b64url(JSON.stringify({ e: email.toLowerCase().trim(), b: batchId, n: sessionNumber }))
  const sig     = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest())
  return `${payload}.${sig}`
}

export interface JoinClaim { email: string; batchId: string; sessionNumber: number }

export function verifyJoinToken(token: string | null | undefined): JoinClaim | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest())
  if (sig.length !== expected.length) return null
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch { return null }
  try {
    const { e, b, n } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof e !== 'string' || typeof b !== 'string' || typeof n !== 'number') return null
    return { email: e, batchId: b, sessionNumber: n }
  } catch { return null }
}

/** The dashboard/email link a student clicks to join (and be tracked). */
export function joinUrl(email: string, batchId: string, sessionNumber: number): string {
  return `/api/session/join?t=${encodeURIComponent(signJoinToken(email, batchId, sessionNumber))}`
}
