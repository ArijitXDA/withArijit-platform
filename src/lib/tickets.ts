import { createServiceClient } from '@/lib/supabase/service'

export const TICKET_CATEGORIES: [string, string][] = [
  ['query', 'General query'],
  ['complaint', 'Complaint'],
  ['service_request', 'Service request'],
  ['payment', 'Payment related'],
  ['course', 'Course related'],
  ['batch', 'Batch related'],
  ['platform', 'Platform / technical'],
  ['other', 'Other'],
]
const CAT_KEYS = new Set(TICKET_CATEGORIES.map(c => c[0]))

export interface Party { type: string; id: string; name?: string }

const rnd = () => Math.random().toString(36).slice(2, 7).toUpperCase()

/** Valid "To" options for a student: their mentor(s), their partner + upstream chain, and Admins. */
export async function studentRecipientOptions(email: string): Promise<Party[]> {
  const svc = createServiceClient()
  const lower = email.toLowerCase()
  const opts: Party[] = []

  const { data: enrols } = await svc.from('student_enrolments')
    .select('owner_mentor_id, partner_id').eq('student_email', lower)
  const mentorIds = [...new Set((enrols ?? []).map(e => e.owner_mentor_id).filter(Boolean))] as string[]
  const partnerIds = [...new Set((enrols ?? []).map(e => e.partner_id).filter(Boolean))] as string[]

  if (mentorIds.length) {
    const { data: ms } = await svc.from('mentors').select('id, full_name').in('id', mentorIds)
    for (const m of ms ?? []) opts.push({ type: 'mentor', id: m.id, name: `${m.full_name} · Mentor` })
  }

  // partner + upstream chain
  const seen = new Set<string>()
  let toResolve = [...partnerIds]
  while (toResolve.length) {
    const batch = toResolve.filter(id => !seen.has(id))
    if (!batch.length) break
    const { data: ps } = await svc.from('partners').select('id, full_name, parent_partner_id').in('id', batch)
    toResolve = []
    for (const p of ps ?? []) {
      if (seen.has(p.id)) continue
      seen.add(p.id)
      opts.push({ type: 'partner', id: p.id, name: `${p.full_name} · Partner` })
      if (p.parent_partner_id) toResolve.push(p.parent_partner_id)
    }
  }

  opts.push({ type: 'admin', id: '*', name: 'oStaran Admin / Support' })
  return opts
}

/** Expand recipients (admin '*' → every dev_admin) and insert notification rows. */
async function fanNotifications(svc: any, recipients: Party[], n: { kind: string; title: string; body?: string; ticketId: string }) {
  const rows: any[] = []
  for (const r of recipients) {
    if (r.type === 'admin' && r.id === '*') {
      const { data: admins } = await svc.from('admin_users').select('id').eq('role', 'dev_admin')
      for (const a of admins ?? []) rows.push({ recipient_type: 'admin', recipient_id: a.id, kind: n.kind, title: n.title, body: n.body ?? null, ticket_id: n.ticketId })
    } else {
      rows.push({ recipient_type: r.type, recipient_id: r.id, kind: n.kind, title: n.title, body: n.body ?? null, ticket_id: n.ticketId })
    }
  }
  if (rows.length) await svc.from('notifications').insert(rows)
}

/** Create a ticket: row + recipients + first message + notifications to all recipients. */
export async function createTicket(opts: {
  by: Party; category: string; subject: string; body: string; recipients: Party[]
}): Promise<{ id: string; ticket_code: string } | { error: string }> {
  if (!CAT_KEYS.has(opts.category)) return { error: 'Invalid category' }
  if (!opts.subject?.trim() || !opts.body?.trim()) return { error: 'Subject and message are required' }
  if (!opts.recipients?.length) return { error: 'Pick at least one recipient' }
  const svc = createServiceClient()
  const ticket_code = `TKT-${rnd()}`

  const { data: ticket, error } = await svc.from('tickets').insert({
    ticket_code,
    created_by_type: opts.by.type, created_by_id: opts.by.id, created_by_name: opts.by.name ?? null,
    category: opts.category, subject: opts.subject.trim().slice(0, 200),
  }).select('id, ticket_code').single()
  if (error || !ticket) return { error: error?.message ?? 'Could not create ticket' }

  await svc.from('ticket_recipients').insert(
    opts.recipients.map(r => ({ ticket_id: ticket.id, party_type: r.type, party_id: r.id, party_name: r.name ?? null }))
  )
  await svc.from('ticket_messages').insert({
    ticket_id: ticket.id, author_type: opts.by.type, author_id: opts.by.id, author_name: opts.by.name ?? null,
    body: opts.body.trim().slice(0, 5000),
  })
  await fanNotifications(svc, opts.recipients, {
    kind: 'ticket_new', title: `New ticket: ${opts.subject.trim().slice(0, 80)}`,
    body: `from ${opts.by.name ?? opts.by.type}`, ticketId: ticket.id,
  })
  return { id: ticket.id, ticket_code: ticket.ticket_code }
}

/** Post a reply: message + bump ticket + notify every OTHER participant (creator + recipients). */
export async function postReply(opts: { ticketId: string; by: Party; body: string }): Promise<{ ok: true } | { error: string }> {
  if (!opts.body?.trim()) return { error: 'Message is empty' }
  const svc = createServiceClient()
  const { data: ticket } = await svc.from('tickets')
    .select('id, subject, created_by_type, created_by_id, created_by_name, status').eq('id', opts.ticketId).maybeSingle()
  if (!ticket) return { error: 'Ticket not found' }

  await svc.from('ticket_messages').insert({
    ticket_id: ticket.id, author_type: opts.by.type, author_id: opts.by.id, author_name: opts.by.name ?? null,
    body: opts.body.trim().slice(0, 5000),
  })
  const isCreator = opts.by.type === ticket.created_by_type && opts.by.id === ticket.created_by_id
  await svc.from('tickets').update({
    last_message_at: new Date().toISOString(),
    status: isCreator ? (ticket.status === 'resolved' ? 'open' : ticket.status) : 'responded',
  }).eq('id', ticket.id)
  if (!isCreator) {
    await svc.from('ticket_recipients').update({ responded_at: new Date().toISOString() })
      .eq('ticket_id', ticket.id).eq('party_type', opts.by.type).eq('party_id', opts.by.id)
  }

  // Notify all participants except the author.
  const { data: recips } = await svc.from('ticket_recipients').select('party_type, party_id, party_name').eq('ticket_id', ticket.id)
  const participants: Party[] = [
    { type: ticket.created_by_type, id: ticket.created_by_id, name: ticket.created_by_name ?? undefined },
    ...(recips ?? []).map((r: any) => ({ type: r.party_type, id: r.party_id, name: r.party_name ?? undefined })),
  ].filter(p => !(p.type === opts.by.type && p.id === opts.by.id))
  await fanNotifications(svc, participants, {
    kind: 'ticket_reply', title: `Reply on: ${ticket.subject.slice(0, 80)}`,
    body: `from ${opts.by.name ?? opts.by.type}`, ticketId: ticket.id,
  })
  return { ok: true }
}

/** Tickets where the party is the creator OR a recipient (admins '*' see all). */
export async function ticketsForParty(party: Party): Promise<any[]> {
  const svc = createServiceClient()
  if (party.type === 'admin') {
    const { data } = await svc.from('tickets').select('*').order('last_message_at', { ascending: false }).limit(300)
    return data ?? []
  }
  const { data: mine } = await svc.from('tickets').select('*')
    .eq('created_by_type', party.type).eq('created_by_id', party.id)
  const { data: rec } = await svc.from('ticket_recipients').select('ticket_id').eq('party_type', party.type).eq('party_id', party.id)
  const recIds = (rec ?? []).map((r: any) => r.ticket_id)
  let addressed: any[] = []
  if (recIds.length) {
    const { data } = await svc.from('tickets').select('*').in('id', recIds)
    addressed = data ?? []
  }
  const byId: Record<string, any> = {}
  for (const t of [...(mine ?? []), ...addressed]) byId[t.id] = t
  return Object.values(byId).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
}

/** Is this party a participant in the ticket (creator, recipient, or any admin)? */
export async function isParticipant(svc: any, ticketId: string, party: Party): Promise<boolean> {
  if (party.type === 'admin') return true
  const { data: t } = await svc.from('tickets').select('created_by_type, created_by_id').eq('id', ticketId).maybeSingle()
  if (t && t.created_by_type === party.type && t.created_by_id === party.id) return true
  const { data: r } = await svc.from('ticket_recipients').select('id').eq('ticket_id', ticketId).eq('party_type', party.type).eq('party_id', party.id).maybeSingle()
  return !!r
}
