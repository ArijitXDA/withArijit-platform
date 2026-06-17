import crypto from 'crypto'

// ────────────────────────────────────────────────────────────────────────────
// Dependency-free Firebase Cloud Messaging (HTTP v1) sender.
//
// Reads the service-account JSON from FCM_SERVICE_ACCOUNT_B64 (base64 of the
// Firebase service-account key). Signs a short-lived JWT with the SA private
// key, exchanges it for an OAuth access token (cached ~1h), and POSTs one
// message per device token. No firebase-admin / google-auth-library needed.
// ────────────────────────────────────────────────────────────────────────────

interface ServiceAccount { project_id: string; client_email: string; private_key: string }

let saCache: ServiceAccount | null = null
function serviceAccount(): ServiceAccount {
  if (saCache) return saCache
  const b64 = process.env.FCM_SERVICE_ACCOUNT_B64
  if (!b64) throw new Error('FCM_SERVICE_ACCOUNT_B64 is not set')
  const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
  if (!json.project_id || !json.client_email || !json.private_key) {
    throw new Error('FCM_SERVICE_ACCOUNT_B64 is malformed (missing project_id/client_email/private_key)')
  }
  saCache = json
  return json
}

let tokenCache: { token: string; exp: number } | null = null
async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache && tokenCache.exp - 60 > now) return tokenCache.token

  const sa = serviceAccount()
  const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  })}`
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  `${unsigned}.${signature}`,
    }),
  })
  if (!res.ok) throw new Error(`FCM token exchange failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  tokenCache = { token: data.access_token as string, exp: now + (data.expires_in ?? 3600) }
  return tokenCache.token
}

export interface PushPayload {
  title: string
  body:  string
  data?: Record<string, string> // FCM data values must be strings
}
export interface PushResult {
  sent:          number
  failed:        number
  invalidTokens: string[]       // unregistered/invalid — caller should delete these
}

async function sendOne(projectId: string, bearer: string, token: string, p: PushPayload): Promise<'ok' | 'invalid' | 'error'> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: p.title, body: p.body },
        data: p.data ?? {},
        android: { priority: 'HIGH', notification: { sound: 'default' } },
        apns:    { payload: { aps: { sound: 'default' } } },
      },
    }),
  })
  if (res.ok) return 'ok'
  if (res.status === 404) return 'invalid'
  const text = await res.text()
  if (res.status === 400 && /registration-token|INVALID_ARGUMENT|not a valid FCM/i.test(text)) return 'invalid'
  console.error('[fcm] send failed', res.status, text)
  return 'error'
}

/** Send one notification to many device tokens (bounded concurrency). */
export async function sendPushToTokens(tokens: string[], payload: PushPayload): Promise<PushResult> {
  const unique = [...new Set(tokens.filter(Boolean))]
  if (!unique.length) return { sent: 0, failed: 0, invalidTokens: [] }

  const projectId = serviceAccount().project_id
  const bearer    = await accessToken()
  const result: PushResult = { sent: 0, failed: 0, invalidTokens: [] }

  const CONCURRENCY = 10
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch    = unique.slice(i, i + CONCURRENCY)
    const outcomes = await Promise.all(batch.map(t => sendOne(projectId, bearer, t, payload).then(o => ({ t, o }))))
    for (const { t, o } of outcomes) {
      if (o === 'ok') result.sent++
      else { result.failed++; if (o === 'invalid') result.invalidTokens.push(t) }
    }
  }
  return result
}
