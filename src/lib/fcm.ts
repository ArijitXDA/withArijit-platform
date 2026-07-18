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
  const raw = (process.env.FCM_SERVICE_ACCOUNT_B64 ?? '').trim()
  if (!raw) throw new Error('FCM_SERVICE_ACCOUNT_B64 is not set')

  // Accept EITHER the raw service-account JSON or its base64 encoding. Pasting the wrong
  // one is the classic setup mistake, and base64-decoding raw JSON yields binary garbage
  // with a useless "Unexpected token '�'" error. Whitespace/newlines are stripped so a
  // line-wrapped base64 also works.
  const text = raw.startsWith('{')
    ? raw
    : Buffer.from(raw.replace(/\s+/g, ''), 'base64').toString('utf8')

  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    // Diagnostic (safe: reveals only length + the first few chars, never the private key).
    throw new Error(
      `FCM_SERVICE_ACCOUNT_B64 is neither valid JSON nor base64-encoded JSON ` +
      `(length ${raw.length}, starts with "${raw.slice(0, 8)}"). Set it to the service-account ` +
      `JSON itself, or to the output of: base64 -i <service-account>.json`,
    )
  }
  if (!json.project_id || !json.client_email || !json.private_key) {
    throw new Error('FCM service account is missing project_id/client_email/private_key')
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
  link?: string                 // where a tap goes; internal path or absolute URL
  data?: Record<string, string> // FCM data values must be strings
}
export interface PushResult {
  sent:          number
  failed:        number
  invalidTokens: string[]       // unregistered/invalid — caller should delete these
}

// DATA-ONLY on purpose — do not add a `notification` block back.
//
// These pushes are delivered to a web service worker (the Android app is a TWA). When the message
// carries a `notification` block, the Firebase SW SDK takes over: it displays the notification
// ITSELF (tagging it FCM_MSG) and then ALSO invokes onBackgroundMessage, so the user got two
// notifications for one push. Worse, the SDK's own notificationclick listener runs first, calls
// stopImmediatePropagation() so our handler never sees the event, and then looks for
// fcmOptions.link / click_action to decide where to go — and drops any destination whose host
// differs from ours. Net effect: tapping "your class is live" did nothing at all, because the
// Teams join link is neither of those fields and is cross-host anyway.
//
// With data-only, the SDK does not display or intercept anything: onBackgroundMessage fires once,
// our SW renders the notification, and our own notificationclick handler owns the destination and
// can open an off-site join link. Verified against firebase-messaging-compat 10.14.1.
async function sendOne(projectId: string, bearer: string, token: string, p: PushPayload): Promise<'ok' | 'invalid' | 'error'> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        // FCM data values must all be strings.
        data: { ...(p.data ?? {}), title: p.title, body: p.body, link: p.link || '/dashboard' },
        android: { priority: 'HIGH' },
        webpush: { headers: { Urgency: 'high', TTL: '3600' } },
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
