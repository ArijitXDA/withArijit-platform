import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const FALLBACK = 'https://www.ostaran.com/videos'

// Non-ostaran hosts we deliberately send students to. Live classes run on Teams, so a class
// reminder's CTA is by definition off-site — without this the host check below rejected every
// join link and silently dropped the student on FALLBACK (/videos) instead of their class.
//
// Safe to allowlist here, unlike /api/bx/c: that route takes its destination from a query
// param a stranger can craft, whereas this one resolves it from a comms_link row we minted
// ourselves under an unguessable token. Anything not matched still falls back, so this can
// never become a general-purpose open redirector.
const ALLOWED_EXTERNAL_HOSTS = [
  /^teams\.microsoft\.com$/i,
  /^[a-z0-9-]+\.teams\.microsoft\.com$/i,
  /^teams\.live\.com$/i,
]

// GET /l/<token> — tokenised comms CTA redirect (mirrors /api/bx/c for warm comms).
// Looks up the per-send comms_link, logs the click, and 302s to the resolved destination —
// *.ostaran.com, or one of ALLOWED_EXTERNAL_HOSTS above. Unknown tokens — including Meta's
// sample value at template-approval time — fall back to /videos so links never 404.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let dest = FALLBACK

  if (token) {
    try {
      const svc = createServiceClient()
      const { data: link } = await svc.from('comms_link')
        .select('token, target_url, contact_email, enrolment_id, channel, template_key, click_count, first_clicked_at')
        .eq('token', token).maybeSingle()
      if (link?.target_url) {
        try {
          const u = new URL(link.target_url)
          if (/^https?:$/.test(u.protocol)) {
            if (/(^|\.)ostaran\.com$/i.test(u.hostname)) {
              u.searchParams.set('s', token) // carry token so downstream watch beacons attribute
              dest = u.toString()
            } else if (ALLOWED_EXTERNAL_HOSTS.some(re => re.test(u.hostname))) {
              // Pass the stored URL through byte-for-byte. A Teams join link carries its
              // meeting id and context as percent-encoded values, and re-serialising via
              // URL/searchParams can rewrite that encoding and break the deep link. Our
              // ?s= tracking param is meaningless off-site anyway.
              dest = link.target_url
            }
          }
        } catch { /* bad target → safe fallback */ }
        await recordClick(svc, link, req) // await so the click logs before the serverless response ends
      }
    } catch { /* keep fallback */ }
  }

  const res = NextResponse.redirect(dest, 302)
  if (token) res.cookies.set('ost_bk', token, { domain: '.ostaran.com', path: '/', maxAge: 60 * 60 * 24 * 14, httpOnly: true, sameSite: 'lax', secure: true })
  return res
}

async function recordClick(svc: ReturnType<typeof createServiceClient>, link: any, req: NextRequest) {
  const now = new Date().toISOString()
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
  try {
    await svc.from('comms_link').update({
      click_count: (link.click_count || 0) + 1,
      last_clicked_at: now,
      first_clicked_at: link.first_clicked_at ?? now,
    }).eq('token', link.token)
  } catch { /* ignore */ }
  try {
    await svc.from('comms_click_event').insert({
      token: link.token,
      target_url: (link.target_url as string | null)?.slice(0, 1000) ?? null,
      contact_email: link.contact_email ?? null,
      enrolment_id: link.enrolment_id ?? null,
      channel: link.channel ?? null,
      template_key: link.template_key ?? null,
      ip,
      ua: req.headers.get('user-agent') || null,
      referer: req.headers.get('referer') || null,
    })
  } catch { /* ignore */ }
}
