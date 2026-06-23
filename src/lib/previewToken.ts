import crypto from 'crypto'

// Verifies a short-lived course-preview token signed by the partner app (mentor
// authoring / dev-admin review), so a NOT-yet-public course page can be previewed.
// Shares the impersonation secret so both apps agree without extra config.
const SECRET = process.env.IMPERSONATION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-insecure'

function b64url(input: Buffer | string): string { return Buffer.from(input).toString('base64url') }

/** Returns the course id if the token is valid + not expired, else null. */
export function verifyPreviewToken(token: string | null | undefined): string | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest())
  try {
    if (sig.length !== expected.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch { return null }
  try {
    const { c, x } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof c !== 'string' || typeof x !== 'number' || Date.now() > x) return null
    return c
  } catch { return null }
}
