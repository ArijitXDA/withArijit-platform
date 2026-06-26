import { createServiceClient } from '@/lib/supabase/service'

// Attribute a conversion back to the broadcast send that drove it (via the ost_bk
// click cookie). Non-fatal — never blocks the register/enrol flow.
export async function attributeBroadcast(token: string | undefined | null, kind: 'registered' | 'enrolled', email?: string) {
  if (!token) return
  try {
    const svc = createServiceClient()
    const { data: send } = await svc.from('broadcast_sends')
      .select('id, campaign_id, contact_id').eq('send_token', token).maybeSingle()
    if (!send) return
    // Dedupe: at most one event of this kind per (campaign, contact) — guards against
    // duplicate registrations / payment-webhook replays inflating the funnel.
    const { data: dup } = await svc.from('broadcast_events')
      .select('id').eq('campaign_id', send.campaign_id).eq('contact_id', send.contact_id).eq('type', kind).limit(1).maybeSingle()
    if (!dup) {
      await svc.from('broadcast_events').insert({
        send_id: send.id, campaign_id: send.campaign_id, contact_id: send.contact_id,
        type: kind, meta: email ? { email } : {},
      })
    }
    if (send.contact_id) {
      const { data: c } = await svc.from('broadcast_contacts').select('converted_at, converted_kind').eq('id', send.contact_id).maybeSingle()
      const patch: any = { converted_at: c?.converted_at ?? new Date().toISOString() }
      if (kind === 'enrolled' || !c?.converted_kind) patch.converted_kind = kind // 'enrolled' outranks 'registered'
      await svc.from('broadcast_contacts').update(patch).eq('id', send.contact_id)
    }
  } catch { /* non-fatal */ }
}
