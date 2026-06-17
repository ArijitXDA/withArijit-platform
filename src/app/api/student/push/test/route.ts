import { NextResponse }       from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendPushToTokens }    from '@/lib/fcm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST — sends a test push to the signed-in student's own registered devices.
// Verifies the whole chain (FCM_SERVICE_ACCOUNT_B64 + a registered token) once
// the env var is set and the app/PWA has registered a device.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: rows } = await service.from('device_tokens').select('token').eq('student_email', user.email)
  const tokens = (rows ?? []).map((r: any) => r.token)
  if (!tokens.length) {
    return NextResponse.json({ error: 'No devices registered for this account yet' }, { status: 400 })
  }

  try {
    const result = await sendPushToTokens(tokens, {
      title: 'oStaran',
      body:  'Push notifications are working 🎉',
      data:  { kind: 'test' },
    })
    if (result.invalidTokens.length) {
      await service.from('device_tokens').delete().in('token', result.invalidTokens)
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
