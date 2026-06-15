import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyJoinToken } from '@/lib/joinToken'

// GET /api/session/join?t=<join-token>
// Logs WHO clicked WHICH session and WHEN (student_link_click_log), then 302s to
// the live Teams join link. Tracking never blocks the redirect.
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('t')
  const claim = verifyJoinToken(token)
  if (!claim) return NextResponse.redirect(new URL('/dashboard/sessions?join=invalid', req.url))

  const service = createServiceClient()

  // Resolve the join link: per-session first, then the batch-level standing link.
  const { data: link } = await service
    .from('awa_session_links')
    .select('meeting_link, session_title')
    .eq('batch_id', claim.batchId)
    .eq('session_number', claim.sessionNumber)
    .maybeSingle()

  let meeting = link?.meeting_link ?? null
  if (!meeting) {
    const { data: batch } = await service
      .from('awa_batches')
      .select('meeting_link')
      .eq('id', claim.batchId)
      .maybeSingle()
    meeting = batch?.meeting_link ?? null
  }

  // Log the click (who + when) — fire-and-forget, must never block the join.
  const ua = req.headers.get('user-agent') || null
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip') || null
  void service.from('student_link_click_log').insert({
    link_type:     'session_join',
    student_email: claim.email,
    click_subtype: `${claim.batchId}#${claim.sessionNumber}`,
    course_name:   link?.session_title ?? null,
    user_agent:    ua,
    ip_address:    ip,
    device_type:   ua ? (/mobile|android|iphone/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop') : null,
    source_app:    'ostaran',
    is_conversion: false,
    clicked_at:    new Date().toISOString(),
  })

  if (!meeting) return NextResponse.redirect(new URL('/dashboard/sessions?join=nolink', req.url))
  return NextResponse.redirect(meeting) // external Teams URL
}
