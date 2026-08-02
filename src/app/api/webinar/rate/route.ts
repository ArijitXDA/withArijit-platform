import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Public webinar rating capture. A free-webinar attendee opens /rate/<join_token>,
// picks 1–5 + optional feedback, and this inserts a webinar_ratings row (source='web').
// An AFTER-INSERT trigger (trg_issue_cert_on_rating) mints the participation
// certificate synchronously, so we can read it straight back and hand the attendee
// their certificate URL. Identity is the per-registration join_token (unguessable),
// so no login is needed and no PII is placed in the URL.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const svc = createServiceClient()
  const { token, rating, feedback } = await req.json().catch(() => ({} as any))

  if (!token || typeof token !== 'string') return NextResponse.json({ error: 'Missing link token' }, { status: 400 })
  const r = Number(rating)
  if (!Number.isInteger(r) || r < 1 || r > 5) return NextResponse.json({ error: 'Please give a rating from 1 to 5' }, { status: 400 })

  const { data: reg } = await svc
    .from('qr_landing_registrations')
    .select('full_name, email, mobile, course_name')
    .eq('join_token', token)
    .maybeSingle()
  if (!reg || !reg.email) return NextResponse.json({ error: 'This rating link is invalid or has expired.' }, { status: 404 })

  const email  = String(reg.email).toLowerCase().trim()
  const course = (reg.course_name && String(reg.course_name).trim()) || 'AI Webinar'

  // webinar_ratings enforces UNIQUE(email) — one rating per person, ever. Dedupe by EMAIL
  // alone: an email that has already rated (this flow OR the old WhatsApp campaign) just
  // re-fetches its existing certificate instead of attempting a duplicate insert.
  const { data: existing } = await svc
    .from('webinar_ratings').select('id')
    .eq('email', email).limit(1).maybeSingle()

  if (!existing) {
    const clean = feedback ? String(feedback).slice(0, 2000).trim() : ''
    const { error: insErr } = await svc.from('webinar_ratings').insert({
      email,
      mobile:      reg.mobile || null,
      full_name:   reg.full_name || null,
      course_name: course,
      rating:      r,
      feedback:    clean || null,
      source:      'web',
    })
    // 23505 = a concurrent submit already inserted the unique email → fall through to read
    // the cert. Any other error is a real failure — never leak the raw DB text to the client.
    if (insErr && insErr.code !== '23505') {
      console.error('[webinar/rate] insert failed:', insErr.message)
      return NextResponse.json({ error: 'Could not save your rating — please try again.' }, { status: 400 })
    }
  }

  // The rating trigger mints the cert within the same statement — read it back by email
  // (one cert per person). Return the CERT's own course so the label/LinkedIn match it.
  const { data: cert } = await svc
    .from('webinar_participation_certificates')
    .select('cert_id, certificate_url, course_name')
    .eq('email', email)
    .order('issued_at', { ascending: false }).limit(1).maybeSingle()

  return NextResponse.json({
    ok: true,
    cert_id:         cert?.cert_id ?? null,
    certificate_url: cert?.certificate_url ?? null,
    course_name:     cert?.course_name ?? course,
    full_name:       reg.full_name ?? null,
  })
}
