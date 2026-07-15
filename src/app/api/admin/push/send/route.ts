import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendPushToTokens } from '@/lib/fcm'

// ────────────────────────────────────────────────────────────────────────────
// Server-side push sender — the Phase-2 broadcast/personalized primitive.
// POST { target: <student_email> | "all", title, body, link?, kind? }
//  → writes an in-app notification row per recipient (so the NotificationBell shows it)
//  → sends an FCM push to every registered device for those recipients.
// Auth: CRON_SECRET bearer OR the shared transcript_fetch_config.cron_key (so pg_cron /
// server callers can trigger it). Admin-session UI auth can be layered on later.
// ────────────────────────────────────────────────────────────────────────────

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

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

  const b      = await req.json().catch(() => ({}))
  const target = String(b.target || '').trim()          // an email, or "all"
  const title  = String(b.title || 'oStaran').slice(0, 120)
  const body   = String(b.body  || '').slice(0, 300)
  const link   = b.link ? String(b.link).slice(0, 300) : '/dashboard'
  const kind   = String(b.kind || 'broadcast').slice(0, 40)
  if (!target || !body) return NextResponse.json({ error: 'target and body are required' }, { status: 400 })

  // Resolve device tokens (+ the distinct recipient emails).
  let q = admin.from('device_tokens').select('student_email, token')
  if (target !== 'all') q = q.eq('student_email', target)
  const { data: rows } = await q
  const tokens = (rows ?? []).map((r: any) => r.token)
  const emails = [...new Set((rows ?? []).map((r: any) => r.student_email))]

  // In-app inbox row per recipient (works even for devices without push permission).
  if (emails.length) {
    await admin.from('notifications').insert(
      emails.map((e) => ({ recipient_type: 'student', recipient_id: e, kind, title, body, link })),
    )
  }

  if (!tokens.length) {
    return NextResponse.json({ ok: true, target, recipients: emails.length, devices: 0, sent: 0, note: 'no registered devices for target' })
  }

  const result = await sendPushToTokens(tokens, { title, body, data: { kind, link } })
  if (result.invalidTokens?.length) {
    await admin.from('device_tokens').delete().in('token', result.invalidTokens)
  }
  return NextResponse.json({ ok: true, target, recipients: emails.length, devices: tokens.length, ...result })
}
