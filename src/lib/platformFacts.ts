import { createClient } from '@supabase/supabase-js'

// Single source of truth for the facts every oStaran agent states (prices, bio,
// URLs, house code, funnel). Lives in the shared `platform_facts` table so the
// founder can edit it without a redeploy and both repos read the same doc.
// getPlatformFacts() is cached per warm lambda; platformFactsBlock() renders the
// authoritative prompt section each agent includes.
//
// NOTE: platformFactsBlock() only renders the keys it explicitly lists below — a
// new top-level key added to the DB row will NOT appear in any prompt until a
// matching render line is added here (in BOTH repos) and the FALLBACK is synced.

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Canonical fallback if the DB read ever fails — keeps agents factual on a hiccup.
// Keep in sync with the live platform_facts row (id=1).
const FALLBACK: any = {
  brand: { name: 'oStaran', legal_entity: 'Star Analytix Pvt Ltd, Mumbai, India', founded: 'April 2020', learners_trained: '50,000+' },
  founder: { name: 'Arijit Chowdhury', bio: 'Founder of oStaran; CAIO, AI researcher, IIT Bombay guest lecturer. Teaches every live session personally.' },
  contacts: { email: 'ai@ostaran.com', whatsapp: 'https://wa.me/919930051053' },
  urls: { masterclass: 'ostaran.com/masterclass', courses: '/courses', group_enrol: 'ostaran.com/group-enrol', partner_programme: 'partner.ostaran.com', certificate_verify: 'ostaran.com/certificate-verification', free_webinar: 'https://webinar.ostaran.com', membership: '/courses/quantum-ai-continued', expert_consultation: '/expert-consultation' },
  house_partner_code: 'ARIBOMBAY-0326',
  pricing: {
    ai_masterclass: 'Paid live session at ₹3,999 — Arijit teaches it personally.',
    quantum_ai_continued_membership: '₹2,999/month rolling membership; enrol at /courses/quantum-ai-continued.',
    note: 'Per-course MRPs are live in awa_courses — use the get_courses tool for course prices, never guess. Expert Consultation is priced separately (USD, or INR+GST for India) — never quote it from memory; point to /expert-consultation.',
  },
  certificates: 'Interim Certificate after Session 13 + globally-recognised Completion certificate. Verifiable at ostaran.com/certificate-verification.',
  ai_kit: 'Physical AI Kit couriered free in India after enrolling in a full-time course.',
  course_formats: '9-Week Weekend Intensive (9×2hr) or 26-Week Long Track (26×1hr) — same curriculum, certificate, price.',
  funnel: 'capture lead → FREE 90-min webinar → attend → enrol → Quantum & AI Continued membership.',
  mentor_programme: {
    what: 'Expert professors can launch their own live courses on oStaran (shown under "Mentor Programmes" at ostaran.com/courses), using oStaran rails (live Teams classes, recordings, AI study notes, the AI Professor, certificates, payments) at zero cost.',
    who_and_how: 'Invite-only, oStaran-approved. Partners apply at partner.ostaran.com via "Become a Mentor"; prospects start from "Launch Your Course" on ostaran.com.',
    revenue_share: 'Negotiated per course: 50/50 net by default, up to 90/10 favouring the mentor on approved courses; net of taxes, gateway/refund costs and any partner commission; locked per enrolment; mentors paid monthly.',
    mentor_marketing: 'Mentors get WhatsApp-shareable PDF posters (a fee-free webinar invite + a full course one-pager) from their course page.',
    for_students: 'Taught by the named professor (not Arijit) with the same oStaran rails.',
  },
  expert_consultation: 'Expert Consultation is a SEPARATE 1:1/small-team AI advisory for organisations, founders, leaders and CXOs. Booked at ostaran.com/expert-consultation, priced per hour in USD (India buyers pay INR + GST). NOT a cohort course and NOT partner-commissionable. Never quote a price from memory — point to ostaran.com/expert-consultation.',
  invoicing: 'Invoices are from Star Analytix Pvt Ltd. India buyers: INR + 18% GST (GST tax invoice); international buyers: USD export of services (no GST). GSTIN currently "Applied For".',
}

let cache: { facts: any; at: number } | null = null
const TTL = 5 * 60 * 1000

export async function getPlatformFacts(): Promise<any> {
  if (cache && Date.now() - cache.at < TTL) return cache.facts
  try {
    const { data } = await svc.from('platform_facts').select('facts').eq('id', 1).maybeSingle()
    const facts = (data?.facts as any) ?? FALLBACK
    cache = { facts, at: Date.now() }
    return facts
  } catch {
    return FALLBACK
  }
}

export function platformFactsBlock(f: any): string {
  if (!f) f = FALLBACK
  const u = f.urls ?? {}
  const p = f.pricing ?? {}
  const c = f.contacts ?? {}
  const lines = [
    '## PLATFORM FACTS (authoritative — if anything elsewhere conflicts with this, trust THIS. Never state a price, URL or claim that contradicts it.)',
    f.brand ? `- Brand: ${f.brand.name} — ${f.brand.legal_entity ?? ''}. Founded ${f.brand.founded ?? ''}. ${f.brand.learners_trained ?? ''} learners.` : '',
    f.founder ? `- Founder: ${f.founder.name} — ${f.founder.bio ?? ''}` : '',
    p.ai_masterclass ? `- AI Masterclass: ${p.ai_masterclass}` : '',
    p.quantum_ai_continued_membership ? `- Quantum & AI Continued membership: ${p.quantum_ai_continued_membership}` : '',
    p.note ? `- Pricing note: ${p.note}` : '',
    f.course_formats ? `- Course formats: ${f.course_formats}` : '',
    f.free_webinar?.what ? `- Free webinar: ${f.free_webinar.what} Register: ${f.free_webinar.register ?? u.free_webinar ?? ''}` : '',
    f.certificates ? `- Certificates: ${f.certificates}` : '',
    f.ai_kit ? `- AI Kit: ${f.ai_kit}` : '',
    f.funnel ? `- Funnel: ${f.funnel}` : '',
    f.mentor_programme ? `- Mentor Programme (professors launch their OWN courses on oStaran): ${[f.mentor_programme.what, f.mentor_programme.who_and_how, f.mentor_programme.revenue_share, f.mentor_programme.mentor_marketing, f.mentor_programme.for_students].filter(Boolean).join(' ')}` : '',
    f.expert_consultation ? `- Expert Consultation: ${f.expert_consultation}` : '',
    f.invoicing ? `- Invoicing & GST: ${f.invoicing}` : '',
    f.house_partner_code ? `- House partner code (default free-webinar attribution): ${f.house_partner_code}` : '',
    (u.masterclass || u.courses || u.membership || u.partner_programme)
      ? `- Key URLs: masterclass ${u.masterclass ?? ''} · courses ${u.courses ?? ''} · consultation ${u.expert_consultation ?? ''} · membership ${u.membership ?? ''} · group ${u.group_enrol ?? ''} · partner ${u.partner_programme ?? ''} · cert ${u.certificate_verify ?? ''}`
      : '',
    (c.email || c.whatsapp) ? `- Contact: ${c.email ?? ''} · ${c.whatsapp ?? ''}` : '',
  ].filter(Boolean)
  return lines.join('\n')
}
