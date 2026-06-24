import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { currentStudentParty } from '@/lib/ticketParty'

export const dynamic = 'force-dynamic'

// GET /api/notifications — my notifications + unread count.
export async function GET() {
  const me = await currentStudentParty()
  if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const svc = createServiceClient()
  const { data } = await svc.from('notifications')
    .select('id, kind, title, body, ticket_id, read_at, created_at')
    .eq('recipient_type', me.type).eq('recipient_id', me.id)
    .order('created_at', { ascending: false }).limit(50)
  const notifications = data ?? []
  return NextResponse.json({ notifications, unread: notifications.filter(n => !n.read_at).length })
}

// POST /api/notifications — mark read. { id } to mark one, omit to mark all.
export async function POST(req: NextRequest) {
  const me = await currentStudentParty()
  if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { id } = await req.json().catch(() => ({}))
  const svc = createServiceClient()
  let q = svc.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('recipient_type', me.type).eq('recipient_id', me.id).is('read_at', null)
  if (id) q = q.eq('id', id)
  await q
  return NextResponse.json({ ok: true })
}
