import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST { token, platform } — the app/PWA calls this after login to save its FCM
// device token, so reminder pushes can reach this student's phone. Upsert on the
// token (a device re-registering, or a shared device after re-login, just
// re-points to the current student).
//
// POST { status, reason } — reports why registration did NOT produce a token (permission denied,
// unsupported browser, no VAPID key). Without this, a student with no token was indistinguishable
// from one who never opened the app: the client knew the reason and discarded it, so "she has the
// app but I can't push to her" had no answer. The email is taken from the session, never the body,
// so nobody can file a status for someone else.
const STATUSES = ['granted', 'denied', 'unsupported', 'no_vapid', 'no_token', 'error']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body     = await req.json().catch(() => ({}))
  const token    = typeof body.token === 'string' ? body.token.trim() : ''
  const platform = typeof body.platform === 'string' ? body.platform : null
  const status   = typeof body.status === 'string' ? body.status.trim() : ''
  const service  = createServiceClient()

  async function recordStatus(s: string, reason: string | null) {
    if (!STATUSES.includes(s)) return
    try {
      await service.from('push_registration_status').upsert({
        email:      user!.email!.toLowerCase(),
        user_type:  'student',
        status:     s,
        reason:     reason ? String(reason).slice(0, 200) : null,
        user_agent: req.headers.get('user-agent'),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' })
    } catch { /* diagnostics must never break registration */ }
  }

  // Status-only report — no token to save.
  if (!token) {
    if (status) { await recordStatus(status, typeof body.reason === 'string' ? body.reason : null); return NextResponse.json({ ok: true, recorded: status }) }
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }

  const { error } = await service.from('device_tokens').upsert({
    student_email: user.email,
    token,
    platform,
    user_agent:    req.headers.get('user-agent'),
    last_seen_at:  new Date().toISOString(),
  }, { onConflict: 'token' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordStatus('granted', null)
  return NextResponse.json({ ok: true })
}
