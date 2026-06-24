import { NextResponse } from 'next/server'
import { currentStudentParty } from '@/lib/ticketParty'
import { studentRecipientOptions, TICKET_CATEGORIES } from '@/lib/tickets'

export const dynamic = 'force-dynamic'

// GET /api/tickets/recipients — valid "To" options + categories for the compose form.
export async function GET() {
  const me = await currentStudentParty()
  if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  return NextResponse.json({ options: await studentRecipientOptions(me.id), categories: TICKET_CATEGORIES })
}
