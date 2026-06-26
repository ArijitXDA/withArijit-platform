import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// Unsubscribe a broadcast recipient: flags the contact, writes the GLOBAL
// lifecycle_suppression + consent log (so all comms honour it), records the event.
async function doUnsub(token: string) {
  const svc = createServiceClient()
  const { data: s } = await svc.from('broadcast_sends')
    .select('id, campaign_id, contact_id, email').eq('send_token', token).maybeSingle()
  if (!s) return false
  const email = String(s.email || '').toLowerCase()
  const now = new Date().toISOString()

  if (s.contact_id) {
    await svc.from('broadcast_contacts').update({ unsub_email: true, unsubscribed_at: now, consent_email: 'opted_out' }).eq('id', s.contact_id)
  }
  if (email) {
    const { data: ex } = await svc.from('lifecycle_suppression').select('id, channels').eq('email', email).maybeSingle()
    const channels = Array.from(new Set([...((ex?.channels as string[]) || []), 'email']))
    if (ex) await svc.from('lifecycle_suppression').update({ channels, reason: 'broadcast_unsubscribe' }).eq('id', ex.id)
    else await svc.from('lifecycle_suppression').insert({ email, channels, reason: 'broadcast_unsubscribe' })
    await svc.from('lifecycle_consent_log').insert({ email, channel: 'email', state: 'opted_out', source: 'broadcast_unsubscribe', metadata: { send_token: token } })
  }
  await svc.from('broadcast_events').insert({ send_id: s.id, campaign_id: s.campaign_id, contact_id: s.contact_id, type: 'unsubscribed' })
  return true
}

function page(ok: boolean): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unsubscribe — oStaran</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;margin:0;padding:48px 16px;color:#1a1a1a;">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 16px rgba(0,0,0,0.06);text-align:center;">
<img src="https://www.ostaran.com/ostaran-logo.png" alt="oStaran" style="height:30px;background:#000;padding:5px 10px;border-radius:6px;margin-bottom:20px;">
<h2 style="margin:0 0 8px;">${ok ? 'You’ve been unsubscribed' : 'Request received'}</h2>
<p style="color:#555;font-size:14px;line-height:1.6;">${ok
    ? 'You won’t receive further marketing emails from oStaran. We’re sorry to see you go.'
    : 'If this address was on our list, it has been removed.'}</p>
</div></body></html>`
}

// GET — human unsubscribe (renders a confirmation page).
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('s') || ''
  let ok = false
  if (token) { try { ok = await doUnsub(token) } catch { /* */ } }
  return new NextResponse(page(ok), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

// POST — RFC 8058 one-click unsubscribe (mailbox providers).
export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('s') || ''
  if (token) { try { await doUnsub(token) } catch { /* */ } }
  return new NextResponse('OK', { status: 200 })
}
