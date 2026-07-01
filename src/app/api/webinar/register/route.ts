import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { attributeBroadcast } from '@/lib/broadcastAttribution'
import { recordConsent } from '@/lib/consent'

// POST /api/webinar/register  { slug, full_name, email, mobile?, consent? }
// Public — captures a registration for a mentor webinar; returns the join link.
export async function POST(req: NextRequest) {
  const { slug, full_name, email, mobile, partner_code, consent } = await req.json().catch(() => ({}))
  if (!slug || !full_name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
  }
  const service = createServiceClient()
  const { data: webinar } = await service
    .from('mentor_webinars').select('id, meeting_link, is_active').eq('slug', slug).maybeSingle()
  if (!webinar || !webinar.is_active) return NextResponse.json({ error: 'Webinar not found.' }, { status: 404 })

  const row = {
    webinar_id: webinar.id,
    full_name: full_name.toString().trim().slice(0, 160),
    email: email.toString().trim().toLowerCase().slice(0, 200),
    mobile: (mobile ?? '').toString().trim().slice(0, 20) || null,
    partner_code: (partner_code ?? '').toString().trim().slice(0, 40) || null,
  }
  const { error } = await service.from('mentor_webinar_registrations').insert(row)
  // 23505 = already registered (unique on webinar_id + lower(email)) — that's fine.
  if (error && (error as any).code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  // Broadcast funnel: attribute this registration if it came via a cold-email click.
  if (!error) await attributeBroadcast(req.cookies.get('ost_bk')?.value, 'registered', row.email)

  // Affirmative marketing opt-in (WhatsApp + email) — recorded only when the
  // registrant ticked the consent box. Non-fatal.
  if (consent) {
    await recordConsent(service, {
      email: row.email,
      mobile: row.mobile,
      channels: row.mobile ? ['email', 'whatsapp'] : ['email'],
      state: 'opted_in',
      source: 'webinar_register',
      ip: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
      purpose: 'marketing',
    })
  }

  return NextResponse.json({ ok: true, meeting_link: webinar.meeting_link })
}
