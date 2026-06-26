import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Verify a Svix-signed Resend webhook (active only when RESEND_WEBHOOK_SECRET is set).
function verifySvix(secret: string, headers: Headers, payload: string): boolean {
  try {
    const id = headers.get('svix-id'), ts = headers.get('svix-timestamp'), sig = headers.get('svix-signature')
    if (!id || !ts || !sig) return false
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
    const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${payload}`).digest('base64')
    return sig.split(' ').some((p) => p.split(',')[1] === expected)
  } catch { return false }
}

async function suppress(svc: any, email: string | null | undefined, source: string) {
  const e = String(email || '').toLowerCase()
  if (!e) return
  const { data: ex } = await svc.from('lifecycle_suppression').select('id, channels').eq('email', e).maybeSingle()
  const channels = Array.from(new Set([...((ex?.channels as string[]) || []), 'email']))
  if (ex) await svc.from('lifecycle_suppression').update({ channels, reason: source }).eq('id', ex.id)
  else await svc.from('lifecycle_suppression').insert({ email: e, channels, reason: source })
  await svc.from('lifecycle_consent_log').insert({ email: e, channel: 'email', state: 'opted_out', source })
}

// Resend event webhook for broadcast sends. Acts only on events whose email_id
// matches a known broadcast_sends.provider_message_id. If RESEND_WEBHOOK_SECRET is
// configured, the Svix signature is also verified.
export async function POST(req: NextRequest) {
  const raw = await req.text()
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (secret && !verifySvix(secret, req.headers, raw)) return NextResponse.json({ error: 'bad signature' }, { status: 401 })

  let body: any = null
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ ok: true }) }
  const type: string = body?.type || ''
  const emailId: string = body?.data?.email_id || body?.data?.id || ''
  if (!type || !emailId) return NextResponse.json({ ok: true })

  const svc = createServiceClient()
  const { data: s } = await svc.from('broadcast_sends')
    .select('id, campaign_id, contact_id, email').eq('provider_message_id', emailId).maybeSingle()
  if (!s) return NextResponse.json({ ok: true })

  const now = new Date().toISOString()
  const ev = (t: string, meta?: any) => svc.from('broadcast_events').insert({ send_id: s.id, campaign_id: s.campaign_id, contact_id: s.contact_id, type: t, meta: meta || {} })

  if (type === 'email.delivered') {
    await svc.from('broadcast_sends').update({ status: 'delivered', delivered_at: now }).eq('id', s.id)
    await ev('delivered')
  } else if (type === 'email.bounced') {
    await svc.from('broadcast_sends').update({ status: 'bounced' }).eq('id', s.id)
    await ev('bounced', body?.data?.bounce || {})
    if (s.contact_id) await svc.from('broadcast_contacts').update({ hard_bounced: true }).eq('id', s.contact_id)
    await suppress(svc, s.email, 'broadcast_bounce')
  } else if (type === 'email.complained') {
    await ev('complained')
    if (s.contact_id) await svc.from('broadcast_contacts').update({ complained: true, unsub_email: true, consent_email: 'opted_out' }).eq('id', s.contact_id)
    await suppress(svc, s.email, 'broadcast_complaint')
  }
  return NextResponse.json({ ok: true })
}
