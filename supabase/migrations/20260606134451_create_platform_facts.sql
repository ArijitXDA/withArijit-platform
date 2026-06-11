-- Single source of truth for the facts every oStaran agent states (prices, bio,
-- URLs, house code, funnel). One JSON doc, single row, read by both repos.
-- Editable without a redeploy. RLS on; only the service role reads it.
create table if not exists public.platform_facts (
  id         int primary key default 1,
  facts      jsonb not null,
  updated_at timestamptz not null default now(),
  constraint platform_facts_single_row check (id = 1)
);

alter table public.platform_facts enable row level security;

insert into public.platform_facts (id, facts) values (1, $json${
  "brand": {
    "name": "oStaran",
    "legal_entity": "Star Analytix Pvt Ltd, Mumbai, India",
    "founded": "April 2020",
    "learners_trained": "50,000+ across India, USA, Canada and Western Europe",
    "tagline": "India's leading live, hands-on AI education platform"
  },
  "founder": {
    "name": "Arijit Chowdhury",
    "bio": "Founder of oStaran & Star Analytix. 19 years of global experience (HSBC, Reliance, Yes Bank, Murugappa, Qubit Microsystems). Currently CAIO at a global fintech firm. Guest lecturer at IIT Bombay; corporate AI coach for Deloitte, PwC, McKinsey, Capgemini, Cognizant. Researcher in Agentic AI, AGI, Quantum Computing, Industrial AI and AI Defence. He personally teaches every live session."
  },
  "contacts": {
    "email": "ai@ostaran.com",
    "whatsapp": "https://wa.me/919930051053"
  },
  "urls": {
    "site": "ostaran.com",
    "masterclass": "ostaran.com/masterclass",
    "courses": "/courses",
    "group_enrol": "ostaran.com/group-enrol",
    "partner_programme": "partner.ostaran.com",
    "certificate_verify": "ostaran.com/certificate-verification",
    "free_webinar": "https://webinar.ostaran.com",
    "membership": "/courses/quantum-ai-continued"
  },
  "house_partner_code": "ARIBOMBAY-0326",
  "pricing": {
    "ai_masterclass": "Paid live instructor-led session at ₹3,999 — Arijit teaches it personally.",
    "quantum_ai_continued_membership": "₹2,999/month rolling membership with weekly live sessions; enrol at /courses/quantum-ai-continued.",
    "note": "Per-course MRPs are live in the awa_courses table — always use the get_courses tool for course prices, never guess."
  },
  "free_webinar": {
    "what": "A free 90-minute live AI webinar — the no-cost entry point before the paid Masterclass.",
    "register": "https://webinar.ostaran.com",
    "attribution": "Registrations attribute to a partner via utm_source; organic traffic defaults to the house code ARIBOMBAY-0326."
  },
  "certificates": "Two certificates for full-time courses: an Interim Certificate after Session 13 (LinkedIn-ready) and a globally-recognised Completion Certificate after all sessions. Both verifiable at ostaran.com/certificate-verification.",
  "ai_kit": "Physical oStaran AI Kit couriered free within India after enrolling in a full-time course: AI roadmap notebook, AI handbook, printed curriculum, badge & stickers, branded merch, learner card.",
  "course_formats": "Every track ships in two duration variants the student picks after paying: a 9-Week Weekend Intensive (9 × 2hr) and a 26-Week Long Track (26 × 1hr). Same curriculum, same certificate, same price.",
  "funnel": "capture lead → register for the FREE 90-min webinar → attend → enrol in a paid course → continue on the Quantum & AI Continued membership.",
  "what_makes_unique": "100% live (Arijit teaches every class personally), real projects only, physical AI kit, two certificates, audience-specific tracks, weekend-only delivery, group enrolment from 2 seats, profitable since 2020.",
  "partner_programme": "Free to join at partner.ostaran.com. Partners earn commission on every referred enrolment and can build a multi-level partner network."
}$json$::jsonb)
on conflict (id) do update set facts = excluded.facts, updated_at = now();
