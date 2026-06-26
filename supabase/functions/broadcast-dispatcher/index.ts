// Broadcast dispatcher — drains queued cold-email sends for 'sending' campaigns,
// renders per-contact HTML (open pixel + click-wrapped ostaran links + unsubscribe
// + List-Unsubscribe), sends via Resend from go.ostaran.com, and records events +
// contact rollups. Invoked every minute by pg_cron, gated by a DB-stored cron key.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_URL = 'https://api.resend.com/emails'
const TRACK = Deno.env.get('BROADCAST_TRACK_BASE') || 'https://www.ostaran.com'
const ADDR = 'Star Analytix Pvt Ltd · Mira Road East, Mumbai, Maharashtra, India'

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c))
const firstName = (name?: string) => (name || '').trim().split(/\s+/)[0] || 'there'

function personalize(s: string, c: any): string {
  const map: Record<string, string> = {
    first_name: firstName(c.name), name: c.name || 'there', city: c.city || '',
    country: c.country || '', company: c.company_college || '', occupation: c.occupation || '',
  }
  return String(s || '').replace(/\{\{\s*(first_name|name|city|country|company|occupation)\s*\}\}/g, (_m, k) => esc(map[k] || ''))
}

function wrapLinks(html: string, token: string): string {
  return html.replace(/href\s*=\s*"([^"]+)"/gi, (m, url) => {
    try {
      const u = new URL(url)
      if (/(^|\.)ostaran\.com$/i.test(u.hostname) && /^https?:$/.test(u.protocol)) {
        return `href="${TRACK}/api/bx/c?s=${token}&u=${encodeURIComponent(url)}"`
      }
    } catch { /* not an absolute URL — leave as-is */ }
    return m
  })
}

function renderEmail(campaign: any, c: any, token: string) {
  let body = wrapLinks(personalize(campaign.body_html || '', c), token)
  const unsub = `${TRACK}/api/bx/u?s=${token}`
  const pixel = `<img src="${TRACK}/api/bx/o?s=${token}" width="1" height="1" alt="" style="display:none">`
  const footer = `<div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:12px;color:#888;line-height:1.6;">
    ${esc(ADDR)}<br>You're receiving this because you opted in or expressed interest in AI upskilling.
    <a href="${unsub}" style="color:#888;text-decoration:underline;">Unsubscribe</a>.</div>`
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a1a;max-width:600px;margin:0 auto;padding:8px;">${body}${footer}${pixel}</div>`
  const text = (campaign.body_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000) + `\n\nUnsubscribe: ${unsub}`
  const subject = personalize(campaign.subject || '', c).replace(/<[^>]+>/g, '').slice(0, 200)
  return { html, text, unsub, subject }
}

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const apiKey = Deno.env.get('RESEND_API_KEY')!
  let payload: any = {}
  try { payload = await req.json() } catch { /* */ }

  // Auth: the cron passes a key read from broadcast_config (service-role-only table).
  const { data: cfg } = await supabase.from('broadcast_config').select('cron_key').eq('id', 1).maybeSingle()
  if (!cfg || !payload?.key || payload.key !== cfg.cron_key) return new Response('unauthorized', { status: 401 })

  // Self-throttle: claim the tick atomically — bounds the send pace even if the key leaks.
  const { data: claimed } = await supabase.rpc('bx_claim_tick', { p_min_seconds: 50 })
  if (!claimed) return new Response(JSON.stringify({ skipped: 'tick_not_due' }), { headers: { 'Content-Type': 'application/json' } })

  let remaining = Math.min(Math.max(Number(payload.limit) || 120, 1), 500)
  const summary: any = { sent: 0, skipped: 0, failed: 0, campaigns: 0 }

  const { data: campaigns } = await supabase.from('broadcast_campaigns')
    .select('*').eq('status', 'sending').eq('channel', 'email')
    .order('scheduled_at', { ascending: true, nullsFirst: true }).limit(20)

  for (const camp of campaigns || []) {
    if (remaining <= 0) break
    // honour campaigns scheduled for the future
    if (camp.scheduled_at && new Date(camp.scheduled_at).getTime() > Date.now()) continue
    const budget = Math.min(remaining, Math.max(1, Math.ceil((camp.throttle_per_hour || 500) / 60)))
    const { data: sends } = await supabase.from('broadcast_sends')
      .select('id, contact_id, send_token, email').eq('campaign_id', camp.id).eq('status', 'queued').limit(budget)

    if (!sends || sends.length === 0) {
      await supabase.from('broadcast_campaigns').update({ status: 'done' }).eq('id', camp.id)
      continue
    }
    summary.campaigns++

    const ids = sends.map((s) => s.contact_id)
    const { data: contacts } = await supabase.from('broadcast_contacts')
      .select('id, email, name, city, country, occupation, company_college, unsub_email, hard_bounced, complained, email_status, email_sent_count')
      .in('id', ids)
    const byId = new Map((contacts || []).map((c) => [c.id, c]))

    // Re-check the GLOBAL suppression list at send (someone may have opted out after queueing).
    const emails = (contacts || []).map((c) => c.email).filter(Boolean)
    const { data: supp } = emails.length
      ? await supabase.from('lifecycle_suppression').select('email, channels').in('email', emails)
      : { data: [] as any[] }
    const suppSet = new Set((supp || [])
      .filter((r: any) => !Array.isArray(r.channels) || r.channels.length === 0 || r.channels.includes('email'))
      .map((r: any) => String(r.email || '').toLowerCase()))

    for (const s of sends) {
      if (remaining <= 0) break
      const c: any = byId.get(s.contact_id)
      if (!c || c.unsub_email || c.hard_bounced || c.complained || c.email_status === 'invalid' || suppSet.has(String(c.email || '').toLowerCase())) {
        await supabase.from('broadcast_sends').update({ status: 'skipped', error: 'suppressed_at_send' }).eq('id', s.id)
        summary.skipped++; continue
      }
      const { html, text, unsub, subject } = renderEmail(camp, c, s.send_token)
      try {
        const res = await fetch(RESEND_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${camp.from_name || 'oStaran'} <${camp.from_email}>`,
            to: [s.email], reply_to: 'ai@ostaran.com', subject, html, text,
            headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
          }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(j?.message || `resend_${res.status}`)
        const now = new Date().toISOString()
        await supabase.from('broadcast_sends').update({ status: 'sent', provider_message_id: j.id || null, sent_at: now }).eq('id', s.id)
        await supabase.from('broadcast_events').insert({ send_id: s.id, campaign_id: camp.id, contact_id: s.contact_id, type: 'sent' })
        await supabase.from('broadcast_contacts').update({ last_sent_at: now, last_campaign_at: now, email_sent_count: (c.email_sent_count || 0) + 1 }).eq('id', s.contact_id)
        summary.sent++; remaining--
      } catch (e: any) {
        await supabase.from('broadcast_sends').update({ status: 'failed', error: String(e?.message || e).slice(0, 300) }).eq('id', s.id)
        summary.failed++; remaining--
      }
    }
  }

  return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } })
})
