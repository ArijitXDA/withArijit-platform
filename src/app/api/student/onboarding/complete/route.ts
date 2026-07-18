import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/student/onboarding/complete  { full_name?, mobile?, partner_code? }
//
// The first server-side touchpoint a student account has ever had. Signup is pure client-side
// (signInWithOtp + verifyOtp) and there are no triggers on auth.users, so until now an app install
// created an auth row and nothing else: no profile, no lifecycle event, no comms. ~117 accounts
// accumulated that way with zero contact.
//
// This route runs once from the onboarding screen and does three things:
//   1. upserts student_profiles
//   2. records partner attribution under the one-time rule below
//   3. emits app_account_created, which lifecycle_auto_enrol turns into either the cold
//      (free-webinar link) or warm (app welcome) sequence via trigger_filter on is_warm
//
// PARTNER RULE (founder): the referring partner may be set or changed ONLY while the stored code is
// NULL or the house default. Once a real partner is attached it is theirs — a student must never be
// able to re-attribute someone else's referral to a partner of their choosing, which would let
// partners poach each other's leads through the app.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HOUSE_CODE = 'ARIBOMBAY-0326'

const firstName = (full: string | null | undefined, email: string) => {
  const n = (full || '').trim().split(/\s+/)[0]
  return n || (email.split('@')[0] || 'there')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = user.email.toLowerCase()
  const body = await req.json().catch(() => ({} as any))
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 120) : null
  const mobile   = typeof body.mobile === 'string' ? body.mobile.trim().slice(0, 20) : null
  const wantCode = typeof body.partner_code === 'string' ? body.partner_code.trim().toUpperCase() : ''

  const svc = createServiceClient()

  try {
    const { data: existing } = await svc
      .from('student_profiles')
      .select('id, full_name, mobile, referred_by_partner_code')
      .eq('email', email)
      .maybeSingle()

    // ── Partner attribution ────────────────────────────────────────────────────
    const current = existing?.referred_by_partner_code ?? null
    const changeable = current === null || current === HOUSE_CODE
    let code   = current
    let source = existing ? undefined : 'house_default'

    if (wantCode && changeable) {
      // Validate against a real, active partner. Codes are stored uppercase, so .eq is exact —
      // ilike would treat a typed '_' or '%' as a wildcard and could attach the wrong partner.
      const { data: p } = await svc
        .from('partners')
        .select('partner_code, status')
        .eq('partner_code', wantCode)
        .maybeSingle()
      if (p && p.status !== 'suspended' && p.status !== 'inactive') {
        code = p.partner_code
        source = 'self_selected'
      }
    }
    if (!code) { code = HOUSE_CODE; source = 'house_default' }

    // ── Profile ────────────────────────────────────────────────────────────────
    const profile: Record<string, unknown> = {
      email,
      user_id: user.id,
      full_name: fullName || existing?.full_name || (user.user_metadata as any)?.full_name || null,
      mobile:    mobile   || existing?.mobile || null,
      updated_at: new Date().toISOString(),
    }
    if (code !== current) {
      profile.referred_by_partner_code = code
      profile.referred_by_source       = source
      profile.referred_by_set_at       = new Date().toISOString()
    }

    if (existing) {
      await svc.from('student_profiles').update(profile).eq('id', existing.id)
    } else {
      await svc.from('student_profiles').insert(profile)
    }

    // ── Emit the entry event, exactly once ────────────────────────────────────
    // Idempotent on (email, event_type): the onboarding screen can be reloaded or re-submitted,
    // and a second event would start the welcome sequence over.
    const { count } = await svc
      .from('lifecycle_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'app_account_created')
      .ilike('email', email)

    let emitted = false
    if ((count ?? 0) === 0) {
      // Warm = already somewhere in our funnel. Same test the dispatcher uses for warm/cold copy.
      const [{ data: reg }, { data: enr }] = await Promise.all([
        svc.from('qr_landing_registrations').select('id').eq('email', email).limit(1).maybeSingle(),
        svc.from('student_enrolments').select('id').eq('student_email', email).limit(1).maybeSingle(),
      ])
      const isWarm = !!(reg || enr)

      const { error } = await svc.from('lifecycle_events').insert({
        email,
        mobile: (profile.mobile as string | null) ?? null,
        event_type: 'app_account_created',
        event_source_table: 'student_profiles',
        source_row_id: existing?.id ?? null,
        track: 'student',
        // is_warm drives the branch: lifecycle_auto_enrol matches trigger_filter with `@>`, so it
        // must be a real boolean, not a string.
        metadata: {
          full_name:  profile.full_name,
          first_name: firstName(profile.full_name as string | null, email),
          is_warm:    isWarm,
          partner_code: code,
        },
        backfilled: false,
      })
      if (error) console.error('[onboarding] event insert failed:', error.message)
      else emitted = true
    }

    return NextResponse.json({ ok: true, partner_code: code, partner_code_locked: !changeable, emitted })
  } catch (e: any) {
    console.error('[onboarding/complete]', e?.message ?? e)
    return NextResponse.json({ error: 'Could not complete onboarding' }, { status: 500 })
  }
}
