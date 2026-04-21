import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// ────────────────────────────────────────────────────────────────────────
// GET /api/student/library/stream/[id]
//
// Secure proxy for library content. The browser only ever sees this URL —
// the underlying SharePoint / OneDrive / third-party source URL never
// reaches client-side HTML or network devtools.
//
// Flow:
//   1. Auth: must be a signed-in student
//   2. Look up the library row by id (verified items only)
//   3. Transform SharePoint / OneDrive share URLs to direct-download form
//   4. Server-side fetch the bytes (follow redirects)
//   5. Stream them back with inline content-disposition + cache-private
//   6. Log the view to library_views (fire-and-forget)
//
// IMPORTANT: this endpoint does NOT force `attachment` disposition —
// content is inline so the reader modal works. Download protection is a
// UX-layer concern (handled by the client modal: disabled ctrl-s / ctrl-p,
// watermark overlay). Determined users can still screenshot; the goal is
// to hide the source URL and deter casual redistribution, which we do.
// ────────────────────────────────────────────────────────────────────────

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

const STREAM_TIMEOUT_MS = 45_000
const MAX_BYTES         = 100 * 1024 * 1024 // 100 MB hard ceiling

// SharePoint / OneDrive share URLs serve a preview HTML page by default;
// appending `download=1` makes them return the raw file. Works for most
// `:b:` (bookmark), `:x:` (xlsx), `:w:` (docx) share URL shapes.
function normalizeSourceUrl(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()

    const isSharePoint = host.endsWith('sharepoint.com')
    const isOneDrive   = host === '1drv.ms' || host.endsWith('onedrive.live.com')

    if (isSharePoint || isOneDrive) {
      // Add download=1 only if not already present
      if (!u.searchParams.has('download')) {
        u.searchParams.set('download', '1')
      }
      return u.toString()
    }
    return url
  } catch {
    return url
  }
}

function safeFilename(title: string, ext = 'pdf'): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'document'
  return `${slug}.${ext}`
}

function extensionFromContentType(ct: string | null): string {
  if (!ct) return 'pdf'
  const low = ct.toLowerCase()
  if (low.includes('pdf'))                                 return 'pdf'
  if (low.includes('word') || low.includes('officedocument.wordprocessingml')) return 'docx'
  if (low.includes('spreadsheetml') || low.includes('excel'))                   return 'xlsx'
  if (low.includes('presentationml') || low.includes('powerpoint'))             return 'pptx'
  if (low.includes('text/plain'))                                               return 'txt'
  if (low.includes('text/html'))                                                return 'html'
  return 'pdf'
}

async function logView(params: {
  libraryId:  string
  userId:     string | null
  email:      string
  status:     'served' | 'error' | 'blocked'
  bytes?:     number | null
  errorMsg?:  string | null
  ip?:        string | null
  userAgent?: string | null
  referer?:   string | null
}): Promise<void> {
  try {
    const service = createServiceClient()
    await service.from('library_views').insert({
      library_id:    params.libraryId,
      user_id:       params.userId,
      email:         params.email,
      ip_address:    params.ip ?? null,
      user_agent:    params.userAgent ?? null,
      referer:       params.referer ?? null,
      bytes_served:  params.bytes ?? null,
      status:        params.status,
      error_message: params.errorMsg ?? null,
    })
  } catch (e) {
    // Best-effort logging only — never fail the main request
    console.warn('[library/stream] view log failed:', e)
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params

  // ── 1. Auth ─────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent') ?? null
  const referer   = req.headers.get('referer')    ?? null

  // ── 2. Look up the library row ──────────────────────────────────────
  const service = createServiceClient()
  const { data: item, error: itemErr } = await service
    .from('library')
    .select('id, title, url, publication_type, verified, access')
    .eq('id', id)
    .maybeSingle()

  if (itemErr || !item) {
    await logView({ libraryId: id, userId: user.id, email: user.email,
                    status: 'error', errorMsg: 'Item not found', ip, userAgent, referer })
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!item.verified) {
    await logView({ libraryId: id, userId: user.id, email: user.email,
                    status: 'blocked', errorMsg: 'Item not verified', ip, userAgent, referer })
    return NextResponse.json({ error: 'Not available' }, { status: 403 })
  }

  if (!item.url) {
    await logView({ libraryId: id, userId: user.id, email: user.email,
                    status: 'error', errorMsg: 'Missing source URL', ip, userAgent, referer })
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  // Access gate: today all items are "Signed Up User" = any authenticated user.
  // Future: if access='Paid' or similar, check enrolment here.
  // (Falls through OK if access is null or the known value.)

  // ── 3. Transform source URL for SharePoint/OneDrive direct download ─
  const sourceUrl = normalizeSourceUrl(item.url)

  // ── 4. Fetch server-side with timeout ───────────────────────────────
  const abort = new AbortController()
  const timeoutId = setTimeout(() => abort.abort(), STREAM_TIMEOUT_MS)

  let upstream: Response
  try {
    upstream = await fetch(sourceUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: abort.signal,
      headers: {
        // Pretend to be a regular browser so SharePoint doesn't bounce us
        // to a sign-in page for anonymous share links.
        'User-Agent':      'Mozilla/5.0 (compatible; oStaranLibraryProxy/1.0)',
        'Accept':          'application/pdf,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
    })
  } catch (e: any) {
    clearTimeout(timeoutId)
    const msg = e?.name === 'AbortError' ? 'Upstream timed out' : (e?.message ?? 'Fetch failed')
    console.error('[library/stream] fetch failed:', msg, 'for', sourceUrl)
    await logView({ libraryId: id, userId: user.id, email: user.email,
                    status: 'error', errorMsg: msg, ip, userAgent, referer })
    return NextResponse.json({ error: 'Upstream unreachable' }, { status: 502 })
  }
  clearTimeout(timeoutId)

  if (!upstream.ok || !upstream.body) {
    const msg = `Upstream ${upstream.status} ${upstream.statusText}`
    console.error('[library/stream]', msg, 'for', sourceUrl)
    await logView({ libraryId: id, userId: user.id, email: user.email,
                    status: 'error', errorMsg: msg, ip, userAgent, referer })
    return NextResponse.json(
      { error: 'Content temporarily unavailable' },
      { status: upstream.status === 404 ? 404 : 502 },
    )
  }

  // ── 5. Prepare response headers ─────────────────────────────────────
  const upstreamCT   = upstream.headers.get('content-type')
  const contentType  = upstreamCT ?? 'application/pdf'
  const contentLen   = upstream.headers.get('content-length')
  const contentLenN  = contentLen ? parseInt(contentLen, 10) : null

  // Guard against unexpectedly huge payloads
  if (contentLenN && contentLenN > MAX_BYTES) {
    await logView({ libraryId: id, userId: user.id, email: user.email,
                    status: 'blocked', errorMsg: `File too large: ${contentLenN} bytes`,
                    ip, userAgent, referer })
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const ext      = extensionFromContentType(contentType)
  const filename = safeFilename(item.title, ext)

  const headers = new Headers({
    'Content-Type':         contentType,
    // `inline` = render in iframe; not `attachment` = don't force a download
    'Content-Disposition':  `inline; filename="${filename}"`,
    'Cache-Control':        'private, no-store, max-age=0, must-revalidate',
    'Pragma':               'no-cache',
    // Prevent third-party framing of the stream URL
    'X-Frame-Options':      'SAMEORIGIN',
    'Content-Security-Policy': "frame-ancestors 'self'",
    'X-Content-Type-Options':  'nosniff',
    'Referrer-Policy':         'no-referrer',
  })
  if (contentLenN) headers.set('Content-Length', String(contentLenN))

  // ── 6. Log view (fire-and-forget) ───────────────────────────────────
  void logView({
    libraryId: id, userId: user.id, email: user.email,
    status: 'served', bytes: contentLenN, ip, userAgent, referer,
  })

  // ── 7. Stream body back to the client ───────────────────────────────
  return new NextResponse(upstream.body, { status: 200, headers })
}
