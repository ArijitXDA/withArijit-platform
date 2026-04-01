import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── POST /api/track/click ──────────────────────────────────────────────────────
// Fire-and-forget click tracker. Always returns 200 immediately.
// Reads all data from request synchronously first, then INSERTs async.
export async function POST(request: NextRequest) {
  // Extract everything synchronously before any async work
  const ua      = request.headers.get('user-agent')      || null
  const ip      = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
               || request.headers.get('x-real-ip')       || null
  const country = request.headers.get('x-vercel-ip-country') || null
  const city    = request.headers.get('x-vercel-ip-city')
                  ? decodeURIComponent(request.headers.get('x-vercel-ip-city')!) : null
  const referer = request.headers.get('referer') || null

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch { /* empty body is fine */ }

  // Respond immediately — never block the caller
  void insertClick({ ...body, ua, ip, country, city, referer, source_app: body.source_app ?? 'ostaran' })
  return NextResponse.json({ ok: true })
}

// ── GET /api/track/click ───────────────────────────────────────────────────────
// Pixel endpoint for webinar.ostaran.com registration page.
// Returns 1×1 transparent GIF, logs the hit async.
// Usage: fetch('https://www.ostaran.com/api/track/click?t=registration&p=PARTNER&c=wa_blast')

// CORS headers — allow cross-origin calls from webinar.ostaran.com
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const ua      = request.headers.get('user-agent') || null
  const ip      = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const country = request.headers.get('x-vercel-ip-country') || null
  const city    = request.headers.get('x-vercel-ip-city')
                  ? decodeURIComponent(request.headers.get('x-vercel-ip-city')!) : null

  void insertClick({
    link_type:    (searchParams.get('t') || 'registration').replace(/[^a-z_]/g, ''),
    partner_code: searchParams.get('p') || null,
    utm_content:  searchParams.get('c') || null,
    utm_medium:   searchParams.get('m') || 'partner_share',
    course_id:    searchParams.get('ci') ? Number(searchParams.get('ci')) : null,
    source_app:   'webinar',
    ua, ip, country, city,
  })

  // 1×1 transparent GIF
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  return new NextResponse(gif, {
    status: 200,
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
    },
  })
}

// ── Shared async insert ────────────────────────────────────────────────────────
async function insertClick(data: Record<string, unknown>) {
  try {
    const { ua, ip, country, city, referer, source_app, ...rest } = data

    // Infer device type from user agent
    let device_type: string | null = null
    if (ua && typeof ua === 'string') {
      device_type = /mobile|android|iphone/i.test(ua) ? 'mobile'
                  : /tablet|ipad/i.test(ua)           ? 'tablet'
                  : 'desktop'
    }

    const supabase = createServiceClient()
    await supabase.from('student_link_click_log').insert({
      link_type:       rest.link_type       || null,
      student_email:   typeof rest.student_email === 'string'
                         ? rest.student_email.toLowerCase().trim() : null,
      student_name:    rest.student_name    || null,
      student_mobile:  rest.student_mobile  || null,
      registration_id: rest.registration_id || null,
      partner_code:    rest.partner_code    || null,
      utm_medium:      rest.utm_medium      || null,
      utm_content:     rest.utm_content     || null,
      utm_campaign:    rest.utm_campaign    || null,
      course_id:       rest.course_id       || null,
      course_name:     rest.course_name     || null,
      webinar_date:    rest.webinar_date    || null,
      click_subtype:   rest.click_subtype   || null,
      is_conversion:   rest.is_conversion   || false,
      ip_address:      ip   || null,
      user_agent:      ua   || null,
      device_type,
      country:         country || null,
      city:            city    || null,
      referer:         referer || null,
      source_app:      source_app || 'ostaran',
      clicked_at:      new Date().toISOString(),
    })
  } catch (e) {
    // Silently swallow — tracking failure must never break anything
    console.warn('[track/click] insert failed (non-fatal):', e)
  }
}
