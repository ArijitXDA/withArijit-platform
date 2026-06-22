// Microsoft Graph — app-only (client credentials), minimal helper for serving
// session recordings to enrolled students WITHOUT exposing the SharePoint URL.
//
// Env (set on the www Vercel project — same app registration as the partner repo):
//   MS_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET
// Azure app permission needed: Files.Read.All (+ admin consent) to read the
// organizer's OneDrive recordings.

const GRAPH = 'https://graph.microsoft.com/v1.0'

let cachedToken: { value: string; exp: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 120_000) return cachedToken.value
  const tenant   = process.env.MS_TENANT_ID
  const clientId = process.env.MS_GRAPH_CLIENT_ID
  const secret   = process.env.MS_GRAPH_CLIENT_SECRET
  if (!tenant || !clientId || !secret) {
    throw new Error('MS Graph env not configured (MS_TENANT_ID / MS_GRAPH_CLIENT_ID / MS_GRAPH_CLIENT_SECRET)')
  }
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id: clientId, client_secret: secret,
      scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`MS Graph token failed: ${json.error_description?.slice(0, 160) || json.error}`)
  cachedToken = { value: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 }
  return cachedToken.value
}

/**
 * Return a SHORT-LIVED, pre-authenticated direct URL to a OneDrive item's
 * content (Graph @microsoft.graph.downloadUrl, ~1h, supports range/streaming).
 * This is what we hand to the <video> player — it expires and is never the
 * permanent SharePoint URL. Returns null if the item can't be resolved.
 */
export async function getRecordingDownloadUrl(driveId: string, itemId: string): Promise<string | null> {
  const token = await getToken()
  const res = await fetch(
    `${GRAPH}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}?select=id,@microsoft.graph.downloadUrl`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) return null
  const json = await res.json()
  return json['@microsoft.graph.downloadUrl'] ?? null
}
