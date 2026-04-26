import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const dynamic = 'force-dynamic'

/**
 * POST /api/unsubscribe
 *
 * Body: { enrolment_id: string (uuid), also_whatsapp?: boolean }
 *
 * Effects (atomic-ish, via 3 sequential statements):
 *   1. UPSERT lifecycle_suppression for the email (channels = ['email'] or ['email','whatsapp'])
 *   2. INSERT lifecycle_consent_log row(s) — one per channel being opted out
 *   3. UPDATE all active enrolments for that email -> status='exited', exit_reason='user_unsubscribed'
 *
 * Idempotent: re-running has no extra effect (UPSERT short-circuits, UPDATE WHERE
 * status='active' becomes a no-op once already exited).
 *
 * Always returns success on a valid UUID, even if the enrolment doesn't exist —
 * privacy: don't leak whether an enrolment_id is real to attackers enumerating UUIDs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const enrolmentId: unknown = body?.enrolment_id
    const alsoWhatsapp: boolean = body?.also_whatsapp === true

    if (typeof enrolmentId !== 'string' || !UUID_RE.test(enrolmentId)) {
      return NextResponse.json({ error: 'Invalid enrolment_id' }, { status: 400 })
    }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? null
    const userAgent = req.headers.get('user-agent') ?? null

    const supabase = createServiceClient()

    // 1. Look up the enrolment to get email + mobile
    const { data: enrolment, error: lookupErr } = await supabase
      .from('lifecycle_sequence_enrolments')
      .select('email, mobile')
      .eq('id', enrolmentId)
      .maybeSingle()

    if (lookupErr) {
      console.error('[unsubscribe] enrolment lookup failed:', lookupErr.message)
      // Don't leak DB errors to client
      return NextResponse.json({ success: true, channels: ['email'] })
    }

    // Privacy: succeed silently for unknown enrolments so attackers can't enumerate
    if (!enrolment?.email) {
      return NextResponse.json({ success: true, channels: ['email'] })
    }

    const email = enrolment.email.toLowerCase()
    const mobile = enrolment.mobile
    // Suppress WhatsApp only if user opted AND we have a mobile on file
    const channels: ('email' | 'whatsapp')[] = alsoWhatsapp && mobile
      ? ['email', 'whatsapp']
      : ['email']

    // 2. UPSERT lifecycle_suppression — extend channels if already partially suppressed
    const { data: existing } = await supabase
      .from('lifecycle_suppression')
      .select('id, channels')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      const merged = Array.from(new Set([...(existing.channels || []), ...channels]))
      const { error: updErr } = await supabase
        .from('lifecycle_suppression')
        .update({
          channels: merged,
          mobile:   mobile ?? null,
          reason:   'user_unsubscribe',
          notes:    `Updated via /unsubscribe at ${new Date().toISOString()}`,
        })
        .eq('id', existing.id)
      if (updErr) console.error('[unsubscribe] suppression update failed:', updErr.message)
    } else {
      const { error: insErr } = await supabase
        .from('lifecycle_suppression')
        .insert({
          email,
          mobile: mobile ?? null,
          channels,
          reason: 'user_unsubscribe',
          notes:  `Created via /unsubscribe`,
        })
      if (insErr) console.error('[unsubscribe] suppression insert failed:', insErr.message)
    }

    // 3. Log consent change for each channel (audit trail for DPDP/GDPR)
    const consentRows = channels.map((channel) => ({
      email,
      mobile:     mobile ?? null,
      channel,
      state:      'opted_out',
      source:     'user_unsubscribe',
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        enrolment_id: enrolmentId,
        unsubscribe_url_clicked_at: new Date().toISOString(),
      },
    }))
    const { error: consentErr } = await supabase
      .from('lifecycle_consent_log')
      .insert(consentRows)
    if (consentErr) console.error('[unsubscribe] consent log insert failed:', consentErr.message)

    // 4. Exit ALL active enrolments for this email (not just the one in the URL)
    const { error: exitErr } = await supabase
      .from('lifecycle_sequence_enrolments')
      .update({
        status:       'exited',
        exit_reason:  'user_unsubscribed',
        next_send_at: null,
        updated_at:   new Date().toISOString(),
      })
      .eq('email', email)
      .eq('status', 'active')
    if (exitErr) console.error('[unsubscribe] enrolment exit failed:', exitErr.message)

    return NextResponse.json({ success: true, channels })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[unsubscribe API]', message)
    // Even on error, don't leak details — return generic success to prevent enumeration
    return NextResponse.json({ success: true, channels: ['email'] })
  }
}
