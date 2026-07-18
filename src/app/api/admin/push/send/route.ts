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

  // An explicit recipient list, used by the admin console's cohort send. Cohort resolution lives
  // in the admin app (where the segment definitions already are) rather than being reimplemented
  // here, so this endpoint stays a dumb, auditable "send to exactly these people".
  const emailList: string[] = Array.isArray(b.emails)
    ? b.emails.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean).slice(0, 2000)
    : []

  if (!body) return NextResponse.json({ error: 'body is required' }, { status: 400 })
  if (!target && emailList.length === 0) {
    return NextResponse.json({ error: 'target or emails is required' }, { status: 400 })
  }

  // Resolve device tokens (+ the distinct recipient emails). device_tokens is shared with the
  // partner (and later mentor) apps, so scope to students — without this, target:'all' would
  // blast student announcements to every partner's phone and file them in the student inbox.
  let q = admin.from('device_tokens').select('student_email, token').eq('user_type', 'student')
  if (emailList.length > 0)      q = q.in('student_email', emailList)
  else if (target !== 'all')     q = q.eq('student_email', target)
  const { data: rows } = await q
  const tokens = (rows ?? []).map((r: any) => r.token)
  const deviceEmails = [...new Set((rows ?? []).map((r: any) => String(r.student_email).toLowerCase()))]

  // Inbox recipients come from who we were ASKED to reach, not from who happens to own a device.
  // Deriving them from the device_tokens result meant a student without a registered device (or one
  // whose token had just been pruned as invalid) got no inbox row at all — the opposite of what the
  // row is for, since it is the fallback for exactly those people. Only target:'all' has to fall
  // back to devices, because there is no recipient list to expand.
  const inboxEmails = emailList.length > 0 ? emailList
                    : target !== 'all'     ? [target.toLowerCase()]
                    : deviceEmails
  if (inboxEmails.length) {
    await admin.from('notifications').insert(
      inboxEmails.map((e) => ({ recipient_type: 'student', recipient_id: e, kind, title, body, link })),
    )
  }
  const emails = inboxEmails

  if (!tokens.length) {
    return NextResponse.json({ ok: true, target, recipients: emails.length, devices: 0, sent: 0, note: 'no registered devices for target' })
  }

  const result = await sendPushToTokens(tokens, { title, body, link, data: { kind } })
  if (result.invalidTokens?.length) {
    await admin.from('device_tokens').delete().in('token', result.invalidTokens)
  }
  return NextResponse.json({ ok: true, target, recipients: emails.length, devices: tokens.length, ...result })
}
