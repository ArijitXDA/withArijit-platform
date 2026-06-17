import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST { token, platform } — the app/PWA calls this after login to save its FCM
// device token, so reminder pushes can reach this student's phone. Upsert on the
// token (a device re-registering, or a shared device after re-login, just
// re-points to the current student).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body     = await req.json().catch(() => ({}))
  const token    = typeof body.token === 'string' ? body.token.trim() : ''
  const platform = typeof body.platform === 'string' ? body.platform : null
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service.from('device_tokens').upsert({
    student_email: user.email,
    token,
    platform,
    user_agent:    req.headers.get('user-agent'),
    last_seen_at:  new Date().toISOString(),
  }, { onConflict: 'token' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
