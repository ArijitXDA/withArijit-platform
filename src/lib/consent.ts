// Append-only consent capture for lifecycle_consent_log.
// The latest row per (lower(email), channel) is the current state, read by the
// lifecycle dispatcher's consentOk(). Writing an 'opted_in' row here is how we
// start recording affirmative marketing consent at each capture point (DPDP s.6,
// WhatsApp Business / TRAI). Non-fatal by design — a consent-log hiccup must never
// fail the user's registration/enrolment.

type ConsentState = 'opted_in' | 'opted_out' | 'withdrawn'

export async function recordConsent(
  db: any,
  opts: {
    email: string
    mobile?: string | null
    channels: string[]        // 'email' | 'whatsapp' | 'sms' — validated by the DB enum
    state: ConsentState
    source: string          // e.g. 'webinar_register', 'community_join'
    ip?: string | null
    userAgent?: string | null
    purpose?: string        // 'marketing' | 'course_reminders' | 'transactional'
  },
): Promise<void> {
  try {
    const email = (opts.email || '').toLowerCase().trim()
    if (!email || !opts.channels.length) return
    const rows = opts.channels.map(channel => ({
      email,
      mobile: opts.mobile || null,
      channel,
      state: opts.state,
      source: opts.source,
      ip_address: opts.ip || null,
      user_agent: opts.userAgent || null,
      metadata: { purpose: opts.purpose ?? 'marketing' },
    }))
    await db.from('lifecycle_consent_log').insert(rows)
  } catch (e: any) {
    console.warn('[consent] recordConsent failed (non-fatal):', e?.message)
  }
}
