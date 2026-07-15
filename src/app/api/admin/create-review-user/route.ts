import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// Mint (or reset the password of) a login account with a password + confirmed email.
// Used to create a Google Play reviewer account, since student sign-in is otherwise
// OTP / OAuth only (a reviewer can't receive an OTP). Auth: CRON_SECRET bearer or the
// shared transcript_fetch_config.cron_key, so it can be triggered server-side (pg_net).

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authorized(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization') || ''
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim()
    if (token) {
      const { data } = await admin.from('transcript_fetch_config').select('cron_key').eq('id', 1).maybeSingle()
      if (data?.cron_key && token === data.cron_key) return true
    }
  }
  return false
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b        = await req.json().catch(() => ({}))
  const email    = String(b.email || '').toLowerCase().trim()
  const password = String(b.password || '')
  const name     = String(b.name || 'Play Review')
  if (!email || password.length < 8) {
    return NextResponse.json({ error: 'email + password (>= 8 chars) required' }, { status: 400 })
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, email, user_id: data.user?.id ?? null })
}
