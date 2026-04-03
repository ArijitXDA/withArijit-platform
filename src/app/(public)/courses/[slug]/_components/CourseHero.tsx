import Link from 'next/link'
import { PaymentModalTrigger } from '@/components/shared/PaymentModalTrigger'

const AUDIENCE_TAG: Record<string, { label: string; color: string; emoji: string }> = {
  working_professionals: { label: 'Working Professionals',  color: '#4f46e5', emoji: '💼' },
  school:               { label: 'School Students',         color: '#0284c7', emoji: '📚' },
  college:              { label: 'College & Job Seekers',   color: '#059669', emoji: '🎓' },
  tech:                 { label: 'Tech Developers',         color: '#7c3aed', emoji: '💻' },
  cxo:                  { label: 'Business Leaders',        color: '#d97706', emoji: '🏆' },
  general:              { label: 'All Learners',            color: '#4f46e5', emoji: '🌟' },
}

export function CourseHero({
  course, mrp, gstAmount, netBeforeGst, discountPct, partner, enrolProps,
}: {
  course: any; mrp: number; gstAmount: number; netBeforeGst: number
  discountPct: number; partner?: string; enrolProps: any
}) {
  const tag     = AUDIENCE_TAG[course.audience_category ?? 'general'] ?? AUDIENCE_TAG.general
  const fmtINR  = (n: number) => `₹${n.toLocaleString('en-IN')}`

  const discountAmt   = Math.round(mrp * discountPct / 100)
  const finalPrice    = mrp - discountAmt
  const finalNet      = Math.round(finalPrice / 1.18)
  const finalGst      = finalPrice - finalNet

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #05051a 0%, #0d0b2b 50%, #0a1628 100%)' }}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />

      <div className="relative max-w-7xl mx-auto px-4 pt-12 pb-0">
        <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">

          {/* ── Left: Content ────────────────────────────────────────────── */}
          <div className="pt-4 pb-12">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
              <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
              <span>/</span>
              <Link href="/courses" className="hover:text-slate-300 transition-colors">Programmes</Link>
              <span>/</span>
              <span className="text-slate-300">{course.name}</span>
            </div>

            {/* Audience badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5 border"
              style={{
                background:  `${tag.color}18`,
                borderColor: `${tag.color}40`,
                color: tag.color,
              }}>
              {tag.emoji} {tag.label} · Live Course
            </div>

            {/* H1 */}
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-[1.1] mb-4 tracking-tight">
              {course.name}
            </h1>

            {/* Tagline */}
            {course.description && (
              <p className="text-lg text-slate-300 leading-relaxed mb-6 max-w-xl">
                {course.description}
              </p>
            )}

            {/* Outcome pills */}
            <div className="flex flex-wrap gap-2.5 mb-6">
              {[
                ['💰', 'Increase Your Salary'],
                ['🚀', 'Launch AI Ventures'],
                ['💼', 'Get Consulting Work'],
                ['📜', 'Globally Recognised Certificate'],
              ].map(([emoji, label]) => (
                <span key={label as string}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  {emoji} {label}
                </span>
              ))}
            </div>

            {/* Batch start */}
            <div className="flex items-center gap-2 text-sm text-emerald-400 font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Enrol now to join the batch starting this week
            </div>

            {/* Urgency */}
            <div className="inline-flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl mb-8">
              ⚠️ <strong>Fee increases ~10% every month</strong> — enrol today to lock in this price
            </div>

            {/* Mobile: show price card inline */}
            <div className="lg:hidden mb-8">
              <PriceCard mrp={mrp} finalPrice={finalPrice} finalGst={finalGst} finalNet={finalNet}
                discountPct={discountPct} discountAmt={discountAmt} fmtINR={fmtINR}
                enrolProps={enrolProps} partner={partner} />
            </div>

            {/* Quick stats row */}
            <div className="flex flex-wrap gap-6 text-sm">
              {[
                ['📅', `${course.total_sessions ?? 26} live sessions`],
                ['⏱',  `${course.session_duration_mins ?? 60} min each`],
                ['🗓', 'Weekend only'],
                ['♾️', 'Lifetime recordings'],
                ['🎁', 'AI Kit couriered'],
              ].map(([icon, text]) => (
                <div key={text as string} className="flex items-center gap-1.5 text-slate-400">
                  <span>{icon}</span> <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Sticky price card (desktop) ───────────────────────── */}
          <div className="hidden lg:block pt-4 sticky top-6 self-start pb-12">
            <PriceCard mrp={mrp} finalPrice={finalPrice} finalGst={finalGst} finalNet={finalNet}
              discountPct={discountPct} discountAmt={discountAmt} fmtINR={fmtINR}
              enrolProps={enrolProps} partner={partner} />
          </div>
        </div>
      </div>
    </section>
  )
}

function PriceCard({ mrp, finalPrice, finalGst, finalNet, discountPct, discountAmt, fmtINR, enrolProps, partner }: any) {
  return (
    <div className="rounded-3xl border overflow-hidden" style={{ background: '#0d0d1f', borderColor: 'rgba(139,92,246,0.25)' }}>
      <div className="h-1" style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }} />
      <div className="p-6">
        {/* Price */}
        <div className="mb-4">
          {discountPct > 0 && (
            <div className="flex items-center gap-2 mb-1">
              <p className="text-slate-500 line-through text-sm">{fmtINR(mrp)}</p>
              <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                {discountPct}% partner discount
              </span>
            </div>
          )}
          <p className="text-4xl font-black text-white">{fmtINR(discountPct > 0 ? finalPrice : mrp)}</p>
          <p className="text-xs text-slate-500 mt-1">
            incl. 18% GST ({fmtINR(discountPct > 0 ? finalGst : mrp - Math.round(mrp/1.18))}) · net taxable {fmtINR(discountPct > 0 ? finalNet : Math.round(mrp/1.18))}
          </p>
        </div>

        {/* 50-50 plan */}
        <div className="rounded-xl p-3 mb-4 border border-indigo-500/20 bg-indigo-500/05 text-xs">
          <p className="text-indigo-300 font-semibold mb-1">💳 50-50 Payment Plan</p>
          <p className="text-slate-400">
            Pay <strong className="text-white">{fmtINR(Math.round((discountPct > 0 ? finalPrice : mrp) / 2))}</strong> now
            · <strong className="text-white">{fmtINR(Math.round((discountPct > 0 ? finalPrice : mrp) / 2))}</strong> after session 13
          </p>
        </div>

        {/* CTA */}
        <PaymentModalTrigger
          {...enrolProps}
          label="🎓 Enrol Now — Lock Today's Price →"
          className="w-full text-base py-4 font-bold shadow-lg shadow-indigo-500/20"
        />

        {/* Trust */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-slate-500">
          {['🔒 Razorpay secure', '🧾 GST invoice', '♾️ Lifetime access', '📜 Certificate'].map(t => (
            <span key={t} className="flex items-center gap-1">{t}</span>
          ))}
        </div>

        {/* Partner */}
        {partner && (
          <p className="mt-3 text-xs text-indigo-400 text-center">
            🤝 Partner referral: <span className="font-mono font-semibold">{partner}</span>
          </p>
        )}

        {/* Group enrol */}
        <div className="mt-4 pt-4 border-t border-white/5 text-center">
          <p className="text-xs text-slate-500 mb-2">Enrolling multiple people?</p>
          <a href="/group-enrol"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            👥 Group & Corporate Enrolment →
          </a>
        </div>
      </div>
    </div>
  )
}
