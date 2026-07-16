import { createServiceClient } from '@/lib/supabase/service'
import { sendPushToTokens } from '@/lib/fcm'

// Partner-facing notifications raised from the student app — today, the commission cascade on
// a new enrolment. Mirrors lib/notifyPartner.ts in the partner repo: the notifications row is
// what partner.ostaran.com's bell reads, the push is what reaches the Android app. Both repos
// share one Supabase project and one Firebase project, so this needs no separate wiring.
//
// Best-effort throughout: an enrolment must never fail because a notification didn't send.

export interface PartnerNotice {
  partnerId: string
  kind:      string
  title:     string
  body?:     string
  link?:     string   // path on partner.ostaran.com, e.g. '/dashboard/income'
}

export async function notifyPartner(n: PartnerNotice): Promise<void> {
  try {
    const s = createServiceClient()

    await s.from('notifications').insert({
      recipient_type: 'partner',
      recipient_id:   n.partnerId,
      kind:           n.kind,
      title:          n.title,
      body:           n.body ?? null,
      link:           n.link ?? null,
    })

    const { data: partner } = await s.from('partners').select('email').eq('id', n.partnerId).maybeSingle()
    if (!partner?.email) return

    // student_email is the generic email column (legacy name) — user_type is what scopes it.
    // Exact match on the lowercased address, never ilike: some partner emails contain '_', which
    // ilike treats as a single-character wildcard — a_b@x.com would also match axb@x.com and push
    // this partner's earnings to a stranger's phone. Tokens are always written from the Supabase
    // auth email, which is already lowercase.
    const { data: devices } = await s
      .from('device_tokens')
      .select('token')
      .eq('user_type', 'partner')
      .eq('student_email', partner.email.toLowerCase())
    const tokens = (devices ?? []).map((d: any) => d.token as string)
    if (!tokens.length) return

    const res = await sendPushToTokens(tokens, {
      title: n.title,
      body:  n.body ?? '',
      data:  { link: n.link ?? '/dashboard', kind: n.kind },
    })
    if (res.invalidTokens.length) {
      await s.from('device_tokens').delete().in('token', res.invalidTokens)
    }
  } catch (e: any) {
    console.error('[notifyPartner] failed:', e?.message ?? e)
  }
}
