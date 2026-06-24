import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { currentStudentParty } from '@/lib/ticketParty'
import { isParticipant, postReply } from '@/lib/tickets'

export const dynamic = 'force-dynamic'

// GET /api/tickets/[id] — the ticket + its thread (marks my copy read).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentStudentParty()
  if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { id } = await params
  const svc = createServiceClient()
  if (!(await isParticipant(svc, id, me))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const [{ data: ticket }, { data: messages }, { data: recipients }] = await Promise.all([
    svc.from('tickets').select('*').eq('id', id).maybeSingle(),
    svc.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
    svc.from('ticket_recipients').select('*').eq('ticket_id', id),
  ])
  const now = new Date().toISOString()
  await svc.from('ticket_recipients').update({ read_at: now })
    .eq('ticket_id', id).eq('party_type', me.type).eq('party_id', me.id).is('read_at', null)
  await svc.from('notifications').update({ read_at: now })
    .eq('recipient_type', me.type).eq('recipient_id', me.id).eq('ticket_id', id).is('read_at', null)

  return NextResponse.json({ ticket, messages: messages ?? [], recipients: recipients ?? [] })
}

// POST /api/tickets/[id] — reply. { body }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentStudentParty()
  if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { id } = await params
  const svc = createServiceClient()
  if (!(await isParticipant(svc, id, me))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const { body } = await req.json().catch(() => ({}))
  const res = await postReply({ ticketId: id, by: me, body })
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
