import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── POST /api/track/click ──────────────────────────────────────────────────────
//
// Fire-and-forget click tracker. Always returns 200 immediately.
// The INSERT runs async after response is sent — never blocks the student.
//
// Called from:
//   • Course page server component     (link_type: enrolment_page)
//   • Certificate page server component (link_type: certificate_view)
//   • Feedback page                     (link_type: feedback_page)
//   • Dashboard layout                  (link_type: dashboard_login)
//
// Body shape (all optional except link_type):
// {
//   link_type:       'registration' | 'enrolment_page' | 'certificate_view' |
//                    'feedback_page' | 'nudge_link' | 'dashboard_login' | 'other'
//   student_email:   string
//   student_name:    string
//   partner_code:    string   (utm_source)
//   utm_medium:      string
//   utm_content:     string   (collateral type: wa_countdown, standee_a3, etc.)
//   utm_campaign:    string
//   course_id:       number
//   course_name:     string
//   registration_id: string   (uuid)
//   source_app:      string   (ostaran | webinar | partner)
// }

export async function POST(request: NextRequest) {
  // Always respond immediately — tracking must never fail visibly or slow page loads
  void trackAsync(request.clone())
  return NextResponse.json({ ok: true })
}

async function trackAsync(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      link_type,
      student_email,
      student_name,
      student_mobile,
      partner_code,
      utm_medium,
      utm_content,
      utm_campaign,
      course_id,
      course_name,
      webinar_date,
      click_subtype,
      registration_id,
      source_app = 'ostaran',
    } = body

    if (!link_type) return

    // Geo/device from Vercel edge headers
    const ua      = request.headers.get('user-agent') || null
    const ip      = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                 || request.headers.get('x-real-ip') || null
    const country = request.headers.get('x-vercel-ip-country') || null
    const city    = request.headers.get('x-vercel-ip-city')
                    ? decodeURIComponent(request.headers.get('x-vercel-ip-city')!) : null
    const referer = request.headers.get('referer') || null

    let device_type: string | null = null
    if (ua) {
      device_type = /mobile|android|iphone/i.test(ua) ? 'mobile'
                  : /tablet|ipad/i.test(ua)           ? 'tablet'
                  : 'desktop'
    }

    const supabase = createServiceClient()
    await supabase.from('student_link_click_log').insert({
      link_type,
      student_email:   student_email?.toLowerCase()?.trim() || null,
      student_name:    student_name?.trim()   || null,
      student_mobile:  student_mobile?.trim() || null,
      registration_id: registration_id        || null,
      partner_code:    partner_code           || null,
      utm_medium:      utm_medium             || null,
      utm_content:     utm_content            || null,
      utm_campaign:    utm_campaign           || null,
      course_id:       course_id              || null,
      course_name:     course_name            || null,
      webinar_date:    webinar_date           || null,
      click_subtype:   click_subtype          || null,
      ip_address:      ip,
      user_agent:      ua,
      device_type,
      country,
      city,
      referer,
      source_app,
      clicked_at:      new Date().toISOString(),
    })
  } catch (e) {
    console.warn('[track/click] insert failed (non-fatal):', e)
  }
}

// ── GET /api/track/click ───────────────────────────────────────────────────────
// Pixel-style tracking for registration link opens from webinar.ostaran.com
// Embed as: <img src="https://www.ostaran.com/api/track/click?t=registration&p=PARTNER&c=wa_blast" />
// Returns 1×1 transparent GIF, logs the hit async
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const link_type   = searchParams.get('t') || 'registration'
  const partner_code = searchParams.get('p') || null
  const utm_content  = searchParams.get('c') || null
  const utm_medium   = searchParams.get('m') || 'partner_share'
  const course_id    = searchParams.get('ci') ? Number(searchParams.get('ci')) : null

  void (async () => {
    try {
      const ua      = request.headers.get('user-agent') || null
      const ip      = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
      const country = request.headers.get('x-vercel-ip-country') || null
      const city    = request.headers.get('x-vercel-ip-city')
                      ? decodeURIComponent(request.headers.get('x-vercel-ip-city')!) : null
      let device_type: string | null = null
      if (ua) device_type = /mobile|android|iphone/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop'

      const supabase = createServiceClient()
      await supabase.from('student_link_click_log').insert({
        link_type: link_type.replace(/[^a-z_]/g, ''),
        partner_code, utm_medium, utm_content, course_id,
        ip_address: ip, user_agent: ua, device_type, country, city,
        source_app: 'webinar',
      })
    } catch (e) { console.warn('[track GET] non-fatal:', e) }
  })()

  // 1×1 transparent GIF
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  return new NextResponse(gif, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store',
    },
  })
}
