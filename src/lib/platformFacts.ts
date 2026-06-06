import { createClient } from '@supabase/supabase-js'

// Single source of truth for the facts every oStaran agent states (prices, bio,
// URLs, house code, funnel). Lives in the shared `platform_facts` table so the
// founder can edit it without a redeploy and both repos read the same doc.
// getPlatformFacts() is cached per warm lambda; platformFactsBlock() renders the
// authoritative prompt section each agent includes.

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Canonical fallback if the DB read ever fails — keeps agents factual on a hiccup.
const FALLBACK: any = {
  brand: { name: 'oStaran', legal_entity: 'Star Analytix Pvt Ltd, Mumbai, India', founded: 'April 2020', learners_trained: '50,000+' },
  founder: { name: 'Arijit Chowdhury', bio: 'Founder of oStaran; CAIO, AI researcher, IIT Bombay guest lecturer. Teaches every live session personally.' },
  contacts: { email: 'ai@ostaran.com', whatsapp: 'https://wa.me/919930051053' },
  urls: { masterclass: 'ostaran.com/masterclass', courses: '/courses', group_enrol: 'ostaran.com/group-enrol', partner_programme: 'partner.ostaran.com', certificate_verify: 'ostaran.com/certificate-verification', free_webinar: 'https://webinar.ostaran.com', membership: '/courses/quantum-ai-continued' },
  house_partner_code: 'ARIBOMBAY-0326',
  pricing: {
    ai_masterclass: 'Paid live session at ₹3,999 — Arijit teaches it personally.',
    quantum_ai_continued_membership: '₹2,999/month rolling membership; enrol at /courses/quantum-ai-continued.',
    note: 'Per-course MRPs are live in awa_courses — use the get_courses tool for course prices, never guess.',
  },
  certificates: 'Interim Certificate after Session 13 + globally-recognised Completion certificate. Verifiable at ostaran.com/certificate-verification.',
  ai_kit: 'Physical AI Kit couriered free in India after enrolling in a full-time course.',
  course_formats: '9-Week Weekend Intensive (9×2hr) or 26-Week Long Track (26×1hr) — same curriculum, certificate, price.',
  funnel: 'capture lead → FREE 90-min webinar → attend → enrol → Quantum & AI Continued membership.',
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
    f.house_partner_code ? `- House partner code (default free-webinar attribution): ${f.house_partner_code}` : '',
    (u.masterclass || u.courses || u.membership || u.partner_programme)
      ? `- Key URLs: masterclass ${u.masterclass ?? ''} · courses ${u.courses ?? ''} · membership ${u.membership ?? ''} · group ${u.group_enrol ?? ''} · partner ${u.partner_programme ?? ''} · cert ${u.certificate_verify ?? ''}`
      : '',
    (c.email || c.whatsapp) ? `- Contact: ${c.email ?? ''} · ${c.whatsapp ?? ''}` : '',
  ].filter(Boolean)
  return lines.join('\n')
}
