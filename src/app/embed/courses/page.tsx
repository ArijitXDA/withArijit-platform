/**
 * /embed/courses — a hosted, iframe-embeddable course showcase for partner (SD) websites.
 * ─────────────────────────────────────────────────────────────────────────────
 * A Udaan distribution partner adds this to their own site as a new "product" tab with one line:
 *   <iframe src="https://www.ostaran.com/embed/courses?partner=OS1234567&brand=YourAcademy"
 *           style="width:100%;height:2600px;border:0" loading="lazy"></iframe>
 *
 * Served by oStaran (so content updates centrally and each load is logged for the ND's "who has
 * embedded it" list), but presents as the PARTNER'S product: their brand heading + optional accent.
 * Sections: partner-branded hero → the 4 Udaan courses they sell (enquiry CTA to THEM, they set the
 * price) → other oStaran courses (enrol direct with oStaran, partner-attributed) → the trainer
 * (Arijit Chowdhury) → the full "what you'll master" tools & topics. Consultations and the ₹2,999/mo
 * "Continued Up-skilling" subscription are deliberately excluded.
 *
 * Self-contained: bare route (no site chrome), own scoped styles, forced light, framable by any site
 * (frame-ancestors * in next.config.ts). Node runtime — service-role key stays server-side.
 */
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePartnerByCode } from '@/lib/partnerCode'

export const dynamic = 'force-dynamic'

const clean = (s: unknown, max: number) =>
  String(s ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').slice(0, max).trim()
const hexAccent = (s: unknown, fb: string) => {
  const v = String(s ?? '').trim().replace(/^#/, '')
  return /^[0-9a-fA-F]{6}$/.test(v) ? `#${v}` : fb
}
const waDigits = (m: unknown) => {
  const d = String(m ?? '').replace(/\D/g, '')
  return !d ? '' : d.length === 10 ? `91${d}` : d.replace(/^0+/, '')
}
const inr = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN')
function duration(c: any) {
  if (c?.tenure_type === 'single_session') return '1 full day · 10 AM–4 PM IST'
  const n = Number(c?.total_sessions) || 0, mins = Number(c?.session_duration_mins) || 0
  return `${n} live sessions · ${mins % 60 === 0 ? mins / 60 + ' hr' : mins + ' min'} each`
}

// ── Udaan courses the partner sells (order + framing); prices/names from DB ──
const UDAAN_ORDER = [
  'udaan-ai-bootcamp-certification', 'udaan-ai-bootcamp-master',
  'udaan-ai-1day-professionals', 'udaan-ai-robotics-1day-students',
]
const DISPLAY: Record<string, { tag: string; highlights: string[]; tags: string[]; kids?: boolean }> = {
  'udaan-ai-bootcamp-certification': { tag: 'Working professionals & job-seekers · 5 weeks · no coding needed',
    highlights: ['ChatGPT, Claude & automation for real work', 'AI job-interview prep for AI MNCs', 'AI projects portfolio + a verifiable certificate'],
    tags: ['Claude', 'ChatGPT', 'n8n / Make', 'Cloud (AWS·GCP·Azure)', 'APIs & MCP'] },
  'udaan-ai-bootcamp-master': { tag: 'School students 9–16 · 5 weeks · robotics + AI kit couriered', kids: true,
    highlights: ['A robotics + AI kit couriered to your child', 'AI, robots, drones, code & games', 'AI Olympiad prep + a verifiable certificate'],
    tags: ['Scratch', 'Python', 'Robotics', 'Drones', 'Game dev'] },
  'udaan-ai-1day-professionals': { tag: 'Working professionals · one intensive day · no coding needed',
    highlights: ['ChatGPT & Claude for real work', 'Automate a workflow with n8n / Make', 'A portfolio piece + a 50-mark evaluation'],
    tags: ['Claude', 'ChatGPT', 'n8n / Make', 'APIs'] },
  'udaan-ai-robotics-1day-students': { tag: 'Students 9–16 · one fun, hands-on day · no experience needed', kids: true,
    highlights: ['Train an AI model & create with AI, safely', 'Write real code & program a robot', 'Build a small game + a friendly certificate'],
    tags: ['Scratch', 'AI basics', 'Robotics', 'Game dev'] },
}

// ── Other oStaran courses (enrol direct, partner-attributed). Consultations & the monthly
//    "Continued Up-skilling" subscription are excluded. AI Mastery shown once (7 audience variants). ──
const OTHER_ORDER = ['ai-mastery-programme', 'agentic-ai-development', 'quantum-computing-and-ai']
const OTHER: Record<string, { name: string; tag: string }> = {
  'ai-mastery-programme': { name: 'AI Mastery Programme (26-Week)', tag: 'For professionals, students, entrepreneurs, leaders, career-returners & school students — no coding needed' },
  'agentic-ai-development': { name: 'Master of Agentic AI Development', tag: 'For developers & engineers building production AI systems' },
  'quantum-computing-and-ai': { name: 'Master of Quantum Computing & AI', tag: 'For engineers, researchers & data scientists (STEM background)' },
}

const TRAINER_STATS = [
  ['19 yrs', 'Global AI experience'], ['IIT Bombay', 'Guest Lecturer'], ['50,000+', 'Learners trained'],
  ['4.9 / 5', 'Learner rating'], ['Big 4 + MNCs', 'Corporate AI coach'], ['Since 2020', 'Live every week'],
]
const LEARN: { h: string; items: string[] }[] = [
  { h: 'AI agents — no-code / low-code', items: ['Bolt.new', 'Make.com', 'n8n', 'Zapier', 'Bubble', 'Streamlit'] },
  { h: 'AI IDEs & coding', items: ['Cursor', 'GitHub Copilot', 'Claude Code', 'Antigravity'] },
  { h: 'Agentic AI frameworks', items: ['LangChain', 'LangGraph', 'LlamaIndex', 'CrewAI', 'AutoGen', 'MCP'] },
  { h: 'Python for data, ML & AI', items: ['Pandas', 'NumPy', 'scikit-learn', 'TensorFlow', 'PyTorch', 'Transformers'] },
  { h: 'Model fine-tuning', items: ['LoRA', 'PEFT', 'Agentic RAG', 'Vector databases'] },
  { h: 'Cloud & deployment', items: ['AWS', 'Azure', 'GCP', 'Docker', 'Vercel', 'GitHub'] },
  { h: 'Business intelligence', items: ['Power BI', 'Tableau', 'Advanced Excel', 'Copilot for Analytics', 'DAX'] },
  { h: 'Daily AI productivity', items: ['ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'NotebookLM', 'Canva', 'Notion'] },
]

export default async function EmbedCourses({
  searchParams,
}: { searchParams: Promise<{ partner?: string; brand?: string; branding?: string; accent?: string }> }) {
  const sp = await searchParams
  const partnerCode = String(sp.partner ?? '').trim().slice(0, 40)
  const brand = clean(sp.brand, 40)
  const minimal = sp.branding === 'min'
  const accent = hexAccent(sp.accent, '#2563EB')

  const supabase = createServiceClient()

  let partner: any = null
  if (partnerCode) {
    partner = await resolvePartnerByCode(supabase, partnerCode,
      'id, full_name, mobile, hide_identity, status, partner_code_v2')
  }
  const active = partner && partner.status === 'active' ? partner : null
  const hidden = active?.hide_identity === true
  const wa = !hidden ? waDigits(active?.mobile) : ''
  const partnerName = !hidden ? clean(active?.full_name, 60) : ''

  const { data: crows } = await supabase
    .from('awa_courses')
    .select('slug, name, mrp, tenure_type, total_sessions, session_duration_mins')
    .in('slug', [...UDAAN_ORDER, ...OTHER_ORDER]).eq('is_active', true)
  const bySlug = new Map<string, any>((crows ?? []).map((c: any) => [c.slug, c]))
  const udaan = UDAAN_ORDER.map((s) => bySlug.get(s)).filter(Boolean)
  const others = OTHER_ORDER.map((s) => bySlug.get(s)).filter(Boolean)

  // log the embed load (fire-and-forget)
  const h = await headers()
  const referer = h.get('referer')
  let host: string | null = null
  try { host = referer ? new URL(referer).host : null } catch { /* ignore */ }
  try {
    await supabase.from('embed_load_log').insert({
      partner_code: partnerCode || null, partner_id: active?.id ?? null, brand: brand || null,
      referer: referer ?? null, referer_host: host, user_agent: h.get('user-agent') ?? null,
    })
  } catch { /* analytics must never break the widget */ }

  const udaanCta = (c: any) => {
    if (wa) {
      const msg = `Hi${partnerName ? ' ' + partnerName : ''}, I'm interested in "${c.name}" — please share the details and price.`
      return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`
    }
    return `https://www.ostaran.com/courses/${c.slug}?partner=${encodeURIComponent(partnerCode)}`
  }
  const otherCta = (c: any) => `https://www.ostaran.com/courses/${c.slug}?partner=${encodeURIComponent(partnerCode)}`
  const enquireLabel = wa ? 'Enquire on WhatsApp' : 'View details'

  return (
    <div className="ox" style={{ '--ox': accent } as React.CSSProperties}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ox-wrap">
        {/* HERO */}
        <header className="ox-hero">
          {brand ? <div className="ox-brand">{brand}</div> : null}
          <h1 className="ox-h1">Live AI, Robotics &amp; Coding Courses</h1>
          <p className="ox-sub">
            Instructor-led courses for every level — a one-day taster to a 26-week mastery. No prior
            coding or tech knowledge needed; every course starts from zero. Taught live, never a recording.
          </p>
          <div className="ox-facts">
            <span>🎓 Live &amp; interactive</span><span>🏅 Verifiable certificate</span>
            <span>🌍 India · USA · Canada timings</span><span>💻 100% online</span>
          </div>
        </header>

        {/* TRAINER */}
        <section className="ox-trainer">
          <img className="ox-face" src="/arijit-image.png" alt="Arijit Chowdhury" width={92} height={92} loading="lazy" />
          <div className="ox-tr-body">
            <span className="ox-eyebrow" style={{ color: accent }}>YOUR TRAINER</span>
            <h2 className="ox-tr-name">Arijit Chowdhury</h2>
            <p className="ox-tr-title">CAIO · AI Researcher · Educator · Founder, oStaran</p>
            <p className="ox-tr-bio">
              19 years building AI inside HSBC, Reliance, Yes Bank &amp; global fintechs — now teaching
              50,000+ learners to build it too. Guest Lecturer at <b>IIT Bombay</b>; corporate AI coach for
              Deloitte, PwC, McKinsey, Capgemini &amp; Cognizant. Every class is taught live by Arijit.
            </p>
            <div className="ox-tr-stats">
              {TRAINER_STATS.map(([n, l]) => (
                <div className="ox-stat" key={l}><span className="ox-stat-n" style={{ color: accent }}>{n}</span><span className="ox-stat-l">{l}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* UDAAN COURSES */}
        <h2 className="ox-sec">Our live certification courses</h2>
        <div className="ox-grid">
          {udaan.map((c: any) => {
            const d = DISPLAY[c.slug] || { tag: '', highlights: [], tags: [] }
            return (
              <article className={`ox-card${d.kids ? ' ox-kids' : ''}`} key={c.slug}>
                <div className="ox-card-top">
                  <div><h3 className="ox-name">{c.name}</h3><p className="ox-tag">{d.tag}</p></div>
                  <div className="ox-price"><span className="ox-mrp">{inr(c.mrp)}</span><span className="ox-mrp-l">MRP · incl. GST</span></div>
                </div>
                <div className="ox-chips">
                  <span className="ox-chip">{duration(c)}</span>
                  <span className="ox-chip ox-chip-ok">No coding needed — learn from zero</span>
                </div>
                <ul className="ox-hl">{d.highlights.map((x, i) => <li key={i}>{x}</li>)}</ul>
                {d.tags.length ? <div className="ox-tags">{d.tags.map((t, i) => <span className="ox-t" key={i}>{t}</span>)}</div> : null}
                <a className="ox-cta" href={udaanCta(c)} target="_blank" rel="noopener noreferrer">{enquireLabel} <span aria-hidden>→</span></a>
                <p className="ox-pricenote">Ask us for your price — we set it and book your seat.</p>
              </article>
            )
          })}
        </div>

        {/* OTHER COURSES */}
        {others.length ? (
          <>
            <h2 className="ox-sec">Also available — advanced &amp; specialist tracks</h2>
            <div className="ox-grid ox-grid-3">
              {others.map((c: any) => {
                const o = OTHER[c.slug]
                return (
                  <article className="ox-card ox-card-other" key={c.slug}>
                    <div className="ox-card-top">
                      <div><h3 className="ox-name">{o?.name || c.name}</h3><p className="ox-tag">{o?.tag}</p></div>
                    </div>
                    <div className="ox-chips">
                      <span className="ox-chip">{duration(c)}</span>
                      <span className="ox-chip">{inr(c.mrp)} MRP · incl. GST</span>
                    </div>
                    <a className="ox-cta ox-cta-ghost" href={otherCta(c)} target="_blank" rel="noopener noreferrer">View &amp; enrol <span aria-hidden>→</span></a>
                  </article>
                )
              })}
            </div>
          </>
        ) : null}

        {/* WHAT YOU'LL LEARN */}
        <h2 className="ox-sec">What you'll master — tools &amp; topics</h2>
        <p className="ox-sec-sub">Real, current tools &amp; platforms used across the programmes (coverage depth varies by track).</p>
        <div className="ox-learn">
          {LEARN.map((g) => (
            <div className="ox-lg" key={g.h}>
              <h4 className="ox-lg-h">{g.h}</h4>
              <div className="ox-lg-items">{g.items.map((it) => <span className="ox-t2" key={it}>{it}</span>)}</div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <footer className="ox-foot">
          {minimal ? (
            <p className="ox-foot-min">Courses delivered live by <b>oStaran</b> · verifiable certificate · ostaran.com</p>
          ) : (
            <>
              <p className="ox-foot-main">
                Delivered live by <b>oStaran</b> — taught by <b>Arijit Chowdhury</b> · verifiable certificate for every learner.
              </p>
              <p className="ox-foot-sub">Never a recording · India · USA · Canada friendly timings · ostaran.com</p>
            </>
          )}
        </footer>
      </div>
      <script dangerouslySetInnerHTML={{ __html: RESIZE }} />
    </div>
  )
}

const RESIZE = `
(function(){function h(){try{parent.postMessage({ostaranEmbedHeight:document.documentElement.scrollHeight},'*')}catch(e){}}
window.addEventListener('load',h);setTimeout(h,500);try{new ResizeObserver(h).observe(document.documentElement)}catch(e){}})();
`

const CSS = `
html,body{background:#fff!important;margin:0!important;padding:0!important}
.ox{--ink:#0F1E3D;--ink2:#4B5563;--line:#E3E9F2;--surf:#F7F9FC;--navy:#0B1A3E;
  all:initial;display:block;background:#fff;color-scheme:light;
  font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.ox *{box-sizing:border-box}
.ox-wrap{max-width:1060px;margin:0 auto;padding:24px 18px 30px}
/* hero */
.ox-hero{background:linear-gradient(135deg,#0B1A3E,#14265a);color:#fff;border-radius:18px;padding:24px 24px 20px;margin-bottom:16px}
.ox-brand{display:inline-block;font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#fff;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:5px 13px;margin-bottom:11px}
.ox-h1{margin:0 0 8px;font-size:clamp(22px,3.6vw,30px);font-weight:800;letter-spacing:-.02em;color:#fff}
.ox-sub{margin:0 0 13px;color:#C6D2E8;max-width:74ch;font-size:14px}
.ox-facts{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:12.5px;font-weight:600;color:#EAF0FB}
/* trainer */
.ox-trainer{display:flex;gap:16px;align-items:flex-start;background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin-bottom:20px}
.ox-face{width:92px;height:92px;border-radius:14px;object-fit:cover;flex:0 0 auto;border:2px solid #fff;box-shadow:0 2px 10px rgba(15,30,61,.12)}
.ox-eyebrow{font-size:10.5px;font-weight:800;letter-spacing:.14em}
.ox-tr-name{margin:2px 0 1px;font-size:19px;font-weight:800;color:var(--ink)}
.ox-tr-title{margin:0 0 7px;font-size:12.5px;font-weight:600;color:var(--ink2)}
.ox-tr-bio{margin:0 0 11px;font-size:13px;color:var(--ink);max-width:78ch;line-height:1.5}
.ox-tr-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
@media(max-width:760px){.ox-tr-stats{grid-template-columns:repeat(3,1fr)}.ox-trainer{flex-direction:column}}
.ox-stat{text-align:center;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 4px}
.ox-stat-n{display:block;font-size:15px;font-weight:800;line-height:1.1}
.ox-stat-l{display:block;font-size:9.5px;color:var(--ink2);margin-top:2px}
/* sections */
.ox-sec{margin:6px 0 12px;font-size:17px;font-weight:800;color:var(--ink)}
.ox-sec-sub{margin:-8px 0 12px;font-size:13px;color:var(--ink2)}
.ox-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 22px}
.ox-grid-3{grid-template-columns:1fr 1fr 1fr}
@media(max-width:760px){.ox-grid,.ox-grid-3{grid-template-columns:1fr}}
.ox-card{border:1px solid var(--line);border-radius:16px;padding:16px 16px 14px;background:#fff;border-top:3px solid var(--ox);display:flex;flex-direction:column}
.ox-card.ox-kids{border-top-color:#7C3AED}
.ox-card.ox-kids .ox-cta{background:#7C3AED}
.ox-card.ox-kids .ox-t{color:#5B21B6;background:#F3EDFE}
.ox-card.ox-kids .ox-hl li::before{background:#7C3AED}
.ox-card-other{border-top-color:#B45309;background:linear-gradient(180deg,#FFFDF9,#fff)}
.ox-card-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.ox-name{margin:0 0 3px;font-size:16.5px;font-weight:800;color:var(--ink);line-height:1.2}
.ox-tag{margin:0;font-size:12.5px;color:var(--ink2)}
.ox-price{flex:0 0 auto;text-align:right;background:var(--navy);color:#fff;border-radius:10px;padding:7px 11px}
.ox-mrp{display:block;font-size:17px;font-weight:800}
.ox-mrp-l{display:block;font-size:9px;color:#C6D2E8;letter-spacing:.04em}
.ox-chips{display:flex;flex-wrap:wrap;gap:6px;margin:11px 0 2px}
.ox-chip{font-size:11.5px;font-weight:600;color:var(--ink);background:var(--surf);border:1px solid var(--line);border-radius:999px;padding:4px 10px}
.ox-chip-ok{color:#0E7A4B;background:#E7F6EE;border-color:#Bfe6cf}
.ox-hl{margin:11px 0 8px;padding:0;list-style:none}
.ox-hl li{position:relative;padding-left:18px;margin:0 0 5px;font-size:13.5px;color:var(--ink)}
.ox-hl li::before{content:"";position:absolute;left:2px;top:6px;width:7px;height:7px;border-radius:50%;background:var(--ox)}
.ox-tags{display:flex;flex-wrap:wrap;gap:5px;margin:2px 0 12px}
.ox-t{font-size:11px;font-weight:600;color:#1E3A8A;background:#EAF1FE;border-radius:6px;padding:3px 8px}
.ox-cta{margin-top:auto;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--ox);color:#fff;
  font-weight:800;font-size:14px;text-decoration:none;border-radius:10px;padding:11px 16px;transition:filter .15s}
.ox-cta:hover{filter:brightness(1.08)}
.ox-cta-ghost{background:#fff;color:var(--navy);border:1.5px solid var(--navy);margin-top:12px}
.ox-cta-ghost:hover{background:var(--navy);color:#fff;filter:none}
.ox-pricenote{margin:7px 0 0;font-size:11.5px;color:var(--ink2);text-align:center}
/* learn */
.ox-learn{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 22px}
@media(max-width:760px){.ox-learn{grid-template-columns:1fr}}
.ox-lg{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--surf)}
.ox-lg-h{margin:0 0 8px;font-size:13px;font-weight:800;color:var(--ink)}
.ox-lg-items{display:flex;flex-wrap:wrap;gap:5px}
.ox-t2{font-size:11px;font-weight:600;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:6px;padding:3px 8px}
/* footer */
.ox-foot{border-top:1px solid var(--line);padding-top:15px;text-align:center}
.ox-foot-main{margin:0 0 4px;font-size:13px;color:var(--ink)}
.ox-foot-sub{margin:0;font-size:11.5px;color:var(--ink2)}
.ox-foot-min{margin:0;font-size:12px;color:var(--ink2)}
`
