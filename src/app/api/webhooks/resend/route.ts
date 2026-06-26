import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// Resend event webhook for broadcast sends. Acts ONLY on events whose email_id
// matches a known broadcast_sends.provider_message_id (not externally guessable),
// so the endpoint is safe without signature verification. (Add RESEND_WEBHOOK_SECRET
// + Svix verification later for defence-in-depth.)
async function suppress(svc: any, email?: string | null) {
  const e = String(email || '').toLowerCase()
  if (!e) return
  const { data: ex } = await svc.from('lifecycle_suppression').select('id, channels').eq('email', e).maybeSingle()
  const channels = Array.from(new Set([...((ex?.channels as string[]) || []), 'email']))
  if (ex) await svc.from('lifecycle_suppression').update({ channels, reason: 'broadcast_bounce_complaint' }).eq('id', ex.id)
  else await svc.from('lifecycle_suppression').insert({ email: e, channels, reason: 'broadcast_bounce_complaint' })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const type: string = body?.type || ''
  const emailId: string = body?.data?.email_id || body?.data?.id || ''
  if (!type || !emailId) return NextResponse.json({ ok: true })

  const svc = createServiceClient()
  const { data: s } = await svc.from('broadcast_sends')
    .select('id, campaign_id, contact_id, email').eq('provider_message_id', emailId).maybeSingle()
  if (!s) return NextResponse.json({ ok: true }) // not one of ours

  const now = new Date().toISOString()
  const ev = (t: string, meta?: any) => svc.from('broadcast_events').insert({ send_id: s.id, campaign_id: s.campaign_id, contact_id: s.contact_id, type: t, meta: meta || {} })

  if (type === 'email.delivered') {
    await svc.from('broadcast_sends').update({ status: 'delivered', delivered_at: now }).eq('id', s.id)
    await ev('delivered')
  } else if (type === 'email.bounced') {
    await svc.from('broadcast_sends').update({ status: 'bounced' }).eq('id', s.id)
    await ev('bounced', body?.data?.bounce || {})
    if (s.contact_id) await svc.from('broadcast_contacts').update({ hard_bounced: true }).eq('id', s.contact_id)
    await suppress(svc, s.email)
  } else if (type === 'email.complained') {
    await ev('complained')
    if (s.contact_id) await svc.from('broadcast_contacts').update({ complained: true, unsub_email: true, consent_email: 'opted_out' }).eq('id', s.contact_id)
    await suppress(svc, s.email)
  }
  return NextResponse.json({ ok: true })
}
