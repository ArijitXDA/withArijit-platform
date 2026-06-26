import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// 1x1 transparent GIF
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

// GET /api/bx/o?s=<send_token> — broadcast email open pixel.
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('s') || ''
  if (token) { try { await recordOpen(token, req) } catch { /* never block the pixel */ } }
  return new NextResponse(GIF, {
    status: 200,
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', Pragma: 'no-cache' },
  })
}

async function recordOpen(token: string, req: NextRequest) {
  const svc = createServiceClient()
  const { data: s } = await svc.from('broadcast_sends')
    .select('id, campaign_id, contact_id, opened_at, open_count').eq('send_token', token).maybeSingle()
  if (!s) return
  const now = new Date().toISOString()
  await svc.from('broadcast_sends').update({ opened_at: s.opened_at ?? now, open_count: (s.open_count || 0) + 1 }).eq('id', s.id)
  await svc.from('broadcast_events').insert({ send_id: s.id, campaign_id: s.campaign_id, contact_id: s.contact_id, type: 'opened', ua: req.headers.get('user-agent') || null })
  if (s.contact_id) {
    const { data: c } = await svc.from('broadcast_contacts').select('open_count').eq('id', s.contact_id).maybeSingle()
    await svc.from('broadcast_contacts').update({ open_count: ((c?.open_count) || 0) + 1, last_opened_at: now }).eq('id', s.contact_id)
  }
}
