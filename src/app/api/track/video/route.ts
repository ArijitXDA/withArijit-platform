import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// POST /api/track/video — watch play/progress beacons from /watch/[slug].
// Body: { slug, event, position_pct?, token? }. Fire-and-forget → 204.
// When a comms token is present we resolve the contact so watch events tie to the send.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const slug = String(body?.slug || '').slice(0, 200)
    const event = String(body?.event || '').slice(0, 20)
    if (!slug || !event) return new NextResponse(null, { status: 204 })

    const token = body?.token ? String(body.token).slice(0, 100) : null
    const position_pct = Number.isFinite(body?.position_pct)
      ? Math.max(0, Math.min(100, Math.round(body.position_pct)))
      : null

    const svc = createServiceClient()
    let contact_email: string | null = null
    let enrolment_id: string | null = null
    if (token) {
      const { data: link } = await svc.from('comms_link')
        .select('contact_email, enrolment_id').eq('token', token).maybeSingle()
      if (link) { contact_email = link.contact_email ?? null; enrolment_id = link.enrolment_id ?? null }
    }

    await svc.from('comms_video_event').insert({
      token, slug, event, position_pct, contact_email, enrolment_id,
      ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      ua: req.headers.get('user-agent') || null,
    })
  } catch { /* swallow — analytics must never error the client */ }
  return new NextResponse(null, { status: 204 })
}
