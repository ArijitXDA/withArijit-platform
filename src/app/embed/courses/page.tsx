/**
 * /embed/courses — a hosted, iframe-embeddable course widget for partner (SD) websites.
 * ─────────────────────────────────────────────────────────────────────────────
 * A Udaan distribution partner adds this to their own site as a new "product" tab with one line:
 *   <iframe src="https://www.ostaran.com/embed/courses?partner=OS1234567&brand=YourAcademy"
 *           style="width:100%;height:1500px;border:0" loading="lazy"></iframe>
 *
 * It is served by oStaran (so content updates centrally and each load is logged for the ND's
 * "who has embedded it" list), but presents as the PARTNER'S product: their brand heading, an
 * optional accent colour, and enquiry CTAs that go to THEM (they set the price and close the sale,
 * per the NNWD model). oStaran stays named as the training provider for credibility & honesty
 * (branding=min just shrinks that to a small "Powered by oStaran" line).
 *
 * Self-contained: bare route (no site chrome), own scoped styles, forced light, framable by any
 * site (frame-ancestors * set in next.config.ts). Node runtime — service-role key stays server-side.
 */
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePartnerByCode } from '@/lib/partnerCode'

export const dynamic = 'force-dynamic'

const clean = (s: unknown, max: number) =>
  String(s ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').slice(0, max).trim()

const hexAccent = (s: unknown, fallback: string) => {
  const v = String(s ?? '').trim().replace(/^#/, '')
  return /^[0-9a-fA-F]{6}$/.test(v) ? `#${v}` : fallback
}

const waDigits = (mobile: unknown) => {
  const d = String(mobile ?? '').replace(/\D/g, '')
  if (!d) return ''
  return d.length === 10 ? `91${d}` : d.replace(/^0+/, '')
}

// Per-course display extras (order + framing); prices/names/sessions come from the DB so the
// widget stays accurate when courses change. Order = flagship 5-week first, then the 1-day tasters.
const ORDER = [
  'udaan-ai-bootcamp-certification', 'udaan-ai-bootcamp-master',
  'udaan-ai-1day-professionals', 'udaan-ai-robotics-1day-students',
]
const DISPLAY: Record<string, { tag: string; highlights: string[]; tags: string[]; kids?: boolean }> = {
  'udaan-ai-bootcamp-certification': {
    tag: 'Working professionals & job-seekers · 5 weeks · no coding needed',
    highlights: ['ChatGPT, Claude & automation for real work', 'AI job-interview prep for AI MNCs',
      'AI projects portfolio + a verifiable certificate'],
    tags: ['Claude', 'ChatGPT', 'n8n / Make', 'Cloud (AWS·GCP·Azure)', 'APIs & MCP'],
  },
  'udaan-ai-bootcamp-master': {
    tag: 'School students 9–16 · 5 weeks · robotics + AI kit couriered', kids: true,
    highlights: ['A robotics + AI kit couriered to your child', 'AI, robots, drones, code & games',
      'AI Olympiad prep + a verifiable certificate'],
    tags: ['Scratch', 'Python', 'Robotics', 'Drones', 'Game dev'],
  },
  'udaan-ai-1day-professionals': {
    tag: 'Working professionals · one intensive day · no coding needed',
    highlights: ['ChatGPT & Claude for real work', 'Automate a workflow with n8n / Make',
      'A portfolio piece + a 50-mark evaluation'],
    tags: ['Claude', 'ChatGPT', 'n8n / Make', 'APIs'],
  },
  'udaan-ai-robotics-1day-students': {
    tag: 'Students 9–16 · one fun, hands-on day · no experience needed', kids: true,
    highlights: ['Train an AI model & create with AI, safely', 'Write real code & program a robot',
      'Build a small game + a friendly certificate'],
    tags: ['Scratch', 'AI basics', 'Robotics', 'Game dev'],
  },
}

function duration(c: any) {
  if (c.tenure_type === 'single_session') return '1 full day · 10 AM–4 PM IST'
  const n = Number(c.total_sessions) || 0
  const mins = Number(c.session_duration_mins) || 0
  const hrs = mins % 60 === 0 ? `${mins / 60} hr` : `${mins} min`
  return `${n} live sessions · ${hrs} each`
}
const inr = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN')

export default async function EmbedCourses({
  searchParams,
}: { searchParams: Promise<{ partner?: string; brand?: string; branding?: string; accent?: string }> }) {
  const sp = await searchParams
  const partnerCode = String(sp.partner ?? '').trim().slice(0, 40)
  const brand = clean(sp.brand, 40)
  const minimal = sp.branding === 'min'
  const accent = hexAccent(sp.accent, '#2563EB')

  const supabase = createServiceClient()

  // partner (for the enquiry CTA + attribution)
  let partner: any = null
  if (partnerCode) {
    partner = await resolvePartnerByCode(
      supabase, partnerCode,
      'id, full_name, mobile, email, hide_identity, status, partner_code_v2',
    )
  }
  const active = partner && partner.status === 'active' ? partner : null
  const hidden = active?.hide_identity === true
  const wa = !hidden ? waDigits(active?.mobile) : ''

  // the NNWD-enabled (Udaan) courses
  const { data: rows } = await supabase
    .from('nnwd_course_terms')
    .select('is_enabled, awa_courses!inner(slug, name, mrp, tenure_type, total_sessions, session_duration_mins)')
    .eq('is_enabled', true)
    .eq('awa_courses.is_active', true)
  const byslug = new Map<string, any>()
  for (const r of (rows ?? []) as any[]) {
    const c = Array.isArray(r.awa_courses) ? r.awa_courses[0] : r.awa_courses
    if (c?.slug) byslug.set(c.slug, c)
  }
  const courses = ORDER.map((s) => byslug.get(s)).filter(Boolean)

  // log the embed load (fire-and-forget; never blocks render)
  const h = await headers()
  const referer = h.get('referer')
  let host: string | null = null
  try { host = referer ? new URL(referer).host : null } catch { /* ignore */ }
  try {
    await supabase.from('embed_load_log').insert({
      partner_code: partnerCode || null, partner_id: active?.id ?? null,
      brand: brand || null, referer: referer ?? null, referer_host: host,
      user_agent: h.get('user-agent') ?? null,
    })
  } catch { /* analytics must never break the widget */ }

  const partnerName = !hidden ? clean(active?.full_name, 60) : ''
  const ctaFor = (c: any) => {
    if (wa) {
      const msg = `Hi${partnerName ? ' ' + partnerName : ''}, I'm interested in "${c.name}" — please share the details and price.`
      return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`
    }
    // no reachable partner → send to the oStaran course page, still attributed
    return `https://www.ostaran.com/courses/${c.slug}?partner=${encodeURIComponent(partnerCode)}`
  }
  const ctaLabel = wa ? 'Enquire on WhatsApp' : 'View details'
  const heading = brand ? `AI, Robotics & Coding Courses` : 'Live AI, Robotics & Coding Courses'

  return (
    <div className="ox" style={{ '--ox': accent } as React.CSSProperties}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ox-wrap">
        <header className="ox-head">
          {brand ? <div className="ox-brand">{brand}</div> : null}
          <h1 className="ox-h1">{heading}</h1>
          <p className="ox-sub">
            Live, instructor-led courses for every level — from a one-day taster to a 5-week
            certification. No prior coding or tech knowledge needed; every course starts from zero.
          </p>
          <div className="ox-facts">
            <span>🎓 Live &amp; interactive</span><span>🏅 Verifiable certificate</span>
            <span>🌍 India · USA · Canada timings</span><span>💻 100% online</span>
          </div>
        </header>

        <div className="ox-grid">
          {courses.map((c: any) => {
            const d = DISPLAY[c.slug] || { tag: '', highlights: [], tags: [] }
            return (
              <article className={`ox-card${d.kids ? ' ox-kids' : ''}`} key={c.slug}>
                <div className="ox-card-top">
                  <div>
                    <h2 className="ox-name">{c.name}</h2>
                    <p className="ox-tag">{d.tag}</p>
                  </div>
                  <div className="ox-price">
                    <span className="ox-mrp">{inr(c.mrp)}</span>
                    <span className="ox-mrp-l">MRP · incl. GST</span>
                  </div>
                </div>
                <div className="ox-chips">
                  <span className="ox-chip">{duration(c)}</span>
                  <span className="ox-chip ox-chip-ok">No coding needed — learn from zero</span>
                </div>
                <ul className="ox-hl">
                  {d.highlights.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
                {d.tags.length ? (
                  <div className="ox-tags">
                    {d.tags.map((t, i) => <span className="ox-t" key={i}>{t}</span>)}
                  </div>
                ) : null}
                <a className="ox-cta" href={ctaFor(c)} target="_blank" rel="noopener noreferrer">
                  {ctaLabel} <span aria-hidden>→</span>
                </a>
                <p className="ox-pricenote">Ask us for your price — we set it and book your seat.</p>
              </article>
            )
          })}
        </div>

        <footer className="ox-foot">
          {minimal ? (
            <p className="ox-foot-min">Courses delivered live by <b>oStaran</b> · verifiable certificate · ostaran.com</p>
          ) : (
            <>
              <p className="ox-foot-main">
                Delivered live by <b>oStaran</b> — taught by <b>Arijit Chowdhury</b> (IIT Bombay · Chief AI
                Officer &amp; CTO · 50,000+ learners trained globally). Every learner earns a verifiable certificate.
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

// Optional parent auto-resize: the widget posts its height; a partner may listen (snippet provided).
const RESIZE = `
(function(){function h(){try{parent.postMessage({ostaranEmbedHeight:document.documentElement.scrollHeight},'*')}catch(e){}}
window.addEventListener('load',h);setTimeout(h,400);try{new ResizeObserver(h).observe(document.documentElement)}catch(e){}})();
`

const CSS = `
html,body{background:#fff!important;margin:0!important;padding:0!important}
.ox{--ink:#0F1E3D;--ink2:#4B5563;--line:#E3E9F2;--surf:#F7F9FC;--navy:#0B1A3E;
  all:initial;display:block;background:#fff;color-scheme:light;
  font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif;color:var(--ink);
  -webkit-font-smoothing:antialiased}
.ox *{box-sizing:border-box}
.ox-wrap{max-width:1040px;margin:0 auto;padding:22px 18px 26px}
.ox-brand{display:inline-block;font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--ox);background:color-mix(in srgb,var(--ox) 10%,#fff);border:1px solid color-mix(in srgb,var(--ox) 25%,#fff);
  border-radius:999px;padding:5px 12px;margin-bottom:10px}
.ox-h1{margin:0 0 8px;font-size:clamp(21px,3.4vw,28px);font-weight:800;letter-spacing:-.02em;color:var(--ink)}
.ox-sub{margin:0 0 12px;color:var(--ink2);max-width:70ch;font-size:14px}
.ox-facts{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:12.5px;font-weight:600;color:var(--ink2)}
.ox-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}
@media(max-width:680px){.ox-grid{grid-template-columns:1fr}}
.ox-card{border:1px solid var(--line);border-radius:16px;padding:16px 16px 14px;background:#fff;
  border-top:3px solid var(--ox);display:flex;flex-direction:column}
.ox-card.ox-kids{border-top-color:#7C3AED}
.ox-card.ox-kids .ox-cta{background:#7C3AED}
.ox-card.ox-kids .ox-t{color:#5B21B6;background:#F3EDFE}
.ox-card-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.ox-name{margin:0 0 3px;font-size:17px;font-weight:800;color:var(--ink);line-height:1.2}
.ox-tag{margin:0;font-size:12.5px;color:var(--ink2)}
.ox-price{flex:0 0 auto;text-align:right;background:var(--navy);color:#fff;border-radius:10px;padding:7px 11px}
.ox-mrp{display:block;font-size:17px;font-weight:800}
.ox-mrp-l{display:block;font-size:9px;color:#C6D2E8;letter-spacing:.04em}
.ox-chips{display:flex;flex-wrap:wrap;gap:6px;margin:11px 0 2px}
.ox-chip{font-size:11.5px;font-weight:600;color:var(--ink);background:var(--surf);border:1px solid var(--line);
  border-radius:999px;padding:4px 10px}
.ox-chip-ok{color:#0E7A4B;background:#E7F6EE;border-color:#Bfe6cf}
.ox-hl{margin:11px 0 8px;padding:0;list-style:none}
.ox-hl li{position:relative;padding-left:18px;margin:0 0 5px;font-size:13.5px;color:var(--ink)}
.ox-hl li::before{content:"";position:absolute;left:2px;top:6px;width:7px;height:7px;border-radius:50%;background:var(--ox)}
.ox-kids .ox-hl li::before{background:#7C3AED}
.ox-tags{display:flex;flex-wrap:wrap;gap:5px;margin:2px 0 12px}
.ox-t{font-size:11px;font-weight:600;color:#1E3A8A;background:#EAF1FE;border-radius:6px;padding:3px 8px}
.ox-cta{margin-top:auto;display:inline-flex;align-items:center;justify-content:center;gap:8px;
  background:var(--ox);color:#fff;font-weight:800;font-size:14px;text-decoration:none;border-radius:10px;
  padding:11px 16px;transition:filter .15s}
.ox-cta:hover{filter:brightness(1.08)}
.ox-pricenote{margin:7px 0 0;font-size:11.5px;color:var(--ink2);text-align:center}
.ox-foot{border-top:1px solid var(--line);padding-top:14px;text-align:center}
.ox-foot-main{margin:0 0 4px;font-size:13px;color:var(--ink)}
.ox-foot-sub{margin:0;font-size:11.5px;color:var(--ink2)}
.ox-foot-min{margin:0;font-size:12px;color:var(--ink2)}
`
