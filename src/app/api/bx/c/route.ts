import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// GET /api/bx/c?s=<send_token>&u=<encoded dest> — broadcast click tracker.
// Only redirects to *.ostaran.com (no open-redirect); appends ?bk for attribution
// and drops a first-party ost_bk cookie so register/enrol can attribute conversions.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const token = sp.get('s') || ''
  const u = sp.get('u') || ''

  let dest = 'https://www.ostaran.com'
  try {
    const url = new URL(u)
    if (/(^|\.)ostaran\.com$/i.test(url.hostname) && /^https?:$/.test(url.protocol)) {
      if (token) url.searchParams.set('bk', token)
      dest = url.toString()
    }
  } catch { /* bad url → safe fallback */ }

  if (token) { try { await recordClick(token, u, req) } catch { /* never block the redirect */ } }

  const res = NextResponse.redirect(dest, 302)
  if (token) res.cookies.set('ost_bk', token, { domain: '.ostaran.com', path: '/', maxAge: 60 * 60 * 24 * 14, httpOnly: true, sameSite: 'lax', secure: true })
  return res
}

async function recordClick(token: string, url: string, req: NextRequest) {
  const svc = createServiceClient()
  const { data: s } = await svc.from('broadcast_sends')
    .select('id, campaign_id, contact_id, clicked_at, click_count').eq('send_token', token).maybeSingle()
  if (!s) return
  const now = new Date().toISOString()
  await svc.from('broadcast_sends').update({ clicked_at: s.clicked_at ?? now, click_count: (s.click_count || 0) + 1 }).eq('id', s.id)
  await svc.from('broadcast_events').insert({ send_id: s.id, campaign_id: s.campaign_id, contact_id: s.contact_id, type: 'clicked', url: url.slice(0, 1000), ua: req.headers.get('user-agent') || null })
  if (s.contact_id) {
    const { data: c } = await svc.from('broadcast_contacts').select('click_count').eq('id', s.contact_id).maybeSingle()
    await svc.from('broadcast_contacts').update({ click_count: ((c?.click_count) || 0) + 1, last_clicked_at: now }).eq('id', s.contact_id)
  }
}
