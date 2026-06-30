// ─────────────────────────────────────────────────────────────────────────────
// Quantum & AI — Continued Up-skilling  (BESPOKE static page)
//
// This is a STATIC route that intentionally OVERRIDES the dynamic /courses/[slug]
// template for this one slug. The course is an endless monthly membership
// (₹2,999/mo) — not a fixed one-time programme — so it needs its own layout:
// monthly pricing, two weekly cohorts, evergreen topic spread, no curriculum/
// projects/50-50. The shared [slug] template and its 15 sub-components are NOT
// touched. Data (price, cohort times) is read live so admin edits flow through.
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { PaymentModalTrigger } from '@/components/shared/PaymentModalTrigger'
import { CourseVideos } from '@/components/CourseVideos'

// PaymentModalTrigger uses useSearchParams(); on this fully-static page it must
// sit inside a Suspense boundary. Small helper keeps the two CTAs tidy.
function EnrolCTA(props: { courseId: string; courseName: string; price: number; label: string; className: string }) {
  return (
    <Suspense fallback={
      <span className="inline-flex items-center justify-center rounded-2xl bg-white/10 text-white/70 font-bold opacity-70 px-8 py-4 text-base">
        {props.label}
      </span>
    }>
      <PaymentModalTrigger
        courseId={props.courseId}
        courseName={props.courseName}
        price={props.price}
        membership
        label={props.label}
        className={props.className}
      />
    </Suspense>
  )
}

export const revalidate = 600
const SLUG = 'quantum-ai-continued'

export const metadata: Metadata = {
  title: 'Quantum & AI — Continued Up-skilling | Monthly AI Membership | oStaran',
  description:
    'An endless monthly membership with one live 60-minute session every week on the latest in AI, Agentic AI, AI automation, MLOps/LLMOps, GPUs, GCC Ops and Quantum Computing. ₹2,999/month. Saturday & Sunday cohorts. For every learner, every level.',
  alternates: { canonical: 'https://www.ostaran.com/courses/quantum-ai-continued' },
  openGraph: {
    title: 'Quantum & AI — Continued Up-skilling | Monthly AI Membership',
    description: 'One live 60-min session every week on the frontier of AI & Quantum. ₹2,999/month. Ongoing, no end date.',
  },
}

const TOPICS: { emoji: string; label: string; blurb: string }[] = [
  { emoji: '🧠', label: 'Frontier AI & LLMs',        blurb: 'The newest models, capabilities and how to use them well' },
  { emoji: '🤖', label: 'Agentic AI',                blurb: 'Autonomous agents, tool-use, multi-agent systems' },
  { emoji: '⚙️', label: 'AI Automations',            blurb: 'Workflow automation that actually ships' },
  { emoji: '🧰', label: 'AI Tools',                  blurb: 'The tools worth your time, as they emerge' },
  { emoji: '🛡️', label: 'Governance · Security · Observability', blurb: 'Responsible, safe, monitored AI' },
  { emoji: '🚀', label: 'MLOps · DevOps · LLMOps',   blurb: 'From notebook to production and back' },
  { emoji: '🖥️', label: 'GPUs & Compute',            blurb: 'Hardware, cost and performance for AI' },
  { emoji: '🏢', label: 'GCC Operations',            blurb: 'How global capability centres run AI at scale' },
  { emoji: '⚛️', label: 'Quantum Computing',         blurb: 'Foundations and where it meets AI' },
]

function fmtTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'} IST`
}
function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function QuantumAIContinuedPage() {
  const supabase = createServiceClient()

  const { data: course } = await supabase
    .from('awa_courses')
    .select('id, name, description, mrp, gst_percent, session_duration_mins')
    .eq('slug', SLUG)
    .maybeSingle()

  if (!course) notFound()

  const { data: batches } = await supabase
    .from('awa_batches')
    .select('id, day_of_week, start_time, start_date, variant, sort_order')
    .eq('course_id', course.id)
    .eq('variant', 'rolling')
    .order('sort_order')

  const cohorts = batches ?? []
  const price   = Number(course.mrp ?? 2999)
  const priceStr = `₹${price.toLocaleString('en-IN')}`
  const gstPct   = Number(course.gst_percent ?? 18)

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #05051a 0%, #0d0b2b 45%, #1a0a3d 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-24 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border"
            style={{ background: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.4)', color: '#d8b4fe' }}>
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" /> Ongoing Monthly Membership · No End Date
          </span>
          <h1 className="font-extrabold tracking-tight leading-[1.08] mb-5"
            style={{ fontSize: 'clamp(2.25rem, 6vw, 4rem)' }}>
            Quantum &amp; AI —{' '}
            <span style={{
              background: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Continued Up-skilling</span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8" style={{ color: '#94a3b8' }}>
            One live <strong className="text-white">60-minute session every week</strong> on the very latest in AI &amp; Quantum —
            forever. Stay current as the field moves. For every learner, at every level.
          </p>

          <CourseVideos courseSlug={SLUG} />

          {/* Key facts */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            {[
              ['🗓️', '60 min · every week'],
              ['♾️', 'Ongoing — cancel/pause anytime'],
              ['🎥', 'Live + full recording archive'],
              ['📈', 'Always the latest topics'],
            ].map(([e, t]) => (
              <span key={t} className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)', color: '#cbd5e1' }}>
                {e} {t}
              </span>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3">
            <EnrolCTA
              courseId={course.id}
              courseName={course.name}
              price={price}
              label={`Join the membership — ${priceStr}/mo →`}
              className="px-8 py-4 text-base font-bold shadow-2xl shadow-fuchsia-500/20"
            />
            <p className="text-xs" style={{ color: '#64748b' }}>
              {priceStr} / month · incl {gstPct}% GST · 🔒 Razorpay · GST invoice issued
            </p>
          </div>
        </div>
      </section>

      {/* ── What you'll keep learning ─────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">What you&apos;ll keep learning</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              There&apos;s no fixed syllabus — because the frontier keeps moving. Every week covers what&apos;s newest and what&apos;s next across:
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOPICS.map(t => (
              <div key={t.label} className="rounded-2xl border border-gray-100 p-5 bg-gray-50/60">
                <div className="text-2xl mb-2">{t.emoji}</div>
                <h3 className="font-bold text-gray-900 mb-1">{t.label}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two weekly cohorts ────────────────────────────────────────────── */}
      <section className="py-20 px-4" style={{ background: '#f8fafc' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">Two weekly cohorts — pick what suits you</h2>
            <p className="text-gray-500 text-lg">Choose your cohort after you join. Same membership, your preferred day.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {cohorts.map(c => (
              <div key={c.id} className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">{c.day_of_week} Cohort</p>
                <p className="text-2xl font-extrabold text-gray-900">{fmtTime(c.start_time)}</p>
                <p className="text-sm text-gray-500 mt-1">60 minutes live · every {c.day_of_week}</p>
                <p className="text-sm text-gray-700 mt-3">First session: <strong>{fmtDate(c.start_date)}</strong></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-10 text-center">How the membership works</h2>
          <div className="space-y-4">
            {[
              ['💳', 'Simple monthly fee', `${priceStr}/month, all-inclusive (incl ${gstPct}% GST). No long-term commitment — renew month to month.`],
              ['🎥', 'Live + recordings', 'Join the weekly live session and access the full growing archive of past recordings while your membership is active.'],
              ['⏸️', 'Pause anytime', 'Stop renewing whenever you like — your membership simply pauses, and you can resume any time by renewing.'],
              ['📜', 'Certificate on request', 'Need proof of your continued learning? Request a certificate any time and we\'ll issue it.'],
            ].map(([e, h, b]) => (
              <div key={h} className="flex items-start gap-4 rounded-2xl border border-gray-100 p-5 bg-gray-50/60">
                <div className="text-2xl shrink-0">{e}</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{h}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing + CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4" style={{ background: 'linear-gradient(135deg, #0d0b2b, #1a0a3d)' }}>
        <div className="max-w-md mx-auto rounded-3xl border overflow-hidden"
          style={{ background: '#0d0d1f', borderColor: 'rgba(168,85,247,0.3)' }}>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #a855f7, #22d3ee)' }} />
          <div className="p-8 text-center">
            <p className="text-5xl font-black text-white">{priceStr}<span className="text-lg text-slate-400 font-medium"> / month</span></p>
            <p className="text-xs text-slate-500 mt-1">incl {gstPct}% GST · cancel or pause anytime</p>
            <ul className="text-left text-sm text-slate-300 space-y-2 my-6">
              {[
                'One live 60-min session every week',
                'Always the latest AI & Quantum topics',
                'Full archive of past recordings',
                'Saturday or Sunday cohort — your choice',
                'Certificate on request',
              ].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span> {t}
                </li>
              ))}
            </ul>
            <EnrolCTA
              courseId={course.id}
              courseName={course.name}
              price={price}
              label={`Join now — ${priceStr}/mo →`}
              className="w-full px-6 py-4 text-base font-bold"
            />
            <p className="text-xs text-slate-500 mt-3">🔒 Secured by Razorpay · GST invoice issued automatically</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Questions</h2>
          <div className="space-y-4">
            {[
              ['Is this a fixed course with an end date?', 'No — it\'s an ongoing membership. There\'s a live 60-minute session every single week, indefinitely, always covering the latest in AI & Quantum.'],
              ['Do I need a background in AI or Quantum?', 'No. It\'s open to every learner at every level — professionals, students, founders, leaders and the technically curious alike.'],
              ['What if I miss a session?', 'Every session is recorded. While your membership is active you can watch the full archive of past sessions any time.'],
              ['Can I cancel?', `Yes — just stop renewing. Your membership pauses and you keep nothing pending. Resume whenever you like by paying the next ${priceStr}.`],
              ['Saturday or Sunday?', 'Both cohorts run weekly at 12:00 PM (noon) IST. You pick the day that suits you after joining, and can switch cohorts later.'],
              ['Do I get a certificate?', 'You can request a certificate of your continued learning at any time and we\'ll issue it.'],
            ].map(([q, a]) => (
              <details key={q} className="rounded-2xl border border-gray-100 p-5 bg-gray-50/60 group">
                <summary className="font-bold text-gray-900 cursor-pointer list-none flex justify-between items-center">
                  {q} <span className="text-indigo-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-gray-600 leading-relaxed mt-3">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
