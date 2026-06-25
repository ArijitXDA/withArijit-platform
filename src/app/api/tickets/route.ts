import { NextRequest, NextResponse } from 'next/server'
import { currentStudentParty } from '@/lib/ticketParty'
import { ticketsForParty, createTicket, studentRecipientOptions } from '@/lib/tickets'

export const dynamic = 'force-dynamic'

// GET /api/tickets — tickets I raised or that are addressed to me.
export async function GET() {
  const me = await currentStudentParty()
  if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  return NextResponse.json({ tickets: await ticketsForParty(me) })
}

// POST /api/tickets — raise a ticket. { category, subject, body, recipients:[{type,id,name}] }
export async function POST(req: NextRequest) {
  const me = await currentStudentParty()
  if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { category, subject, body, recipients, attachments } = await req.json().catch(() => ({}))

  // Only allow recipients that are actually valid for this student.
  const allowed = await studentRecipientOptions(me.id)
  const allowKey = new Set(allowed.map(o => `${o.type}:${o.id}`))
  const chosen = (Array.isArray(recipients) ? recipients : [])
    .filter((r: any) => r && allowKey.has(`${r.type}:${r.id}`))
    .map((r: any) => ({ type: r.type, id: r.id, name: allowed.find(o => o.type === r.type && o.id === r.id)?.name }))
  if (!chosen.length) return NextResponse.json({ error: 'Pick at least one valid recipient.' }, { status: 400 })

  const res = await createTicket({ by: me, category, subject, body, recipients: chosen, attachments })
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json(res)
}
