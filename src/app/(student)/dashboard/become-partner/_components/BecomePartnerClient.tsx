'use client'
import { useState } from 'react'
import { ExternalLink, Copy, CheckCircle, Users, TrendingUp, Gift, Star, Shield, ChevronRight, Zap } from 'lucide-react'

const TIERS = [
  { level: 'L1 Partner',  enrolments: '1–4',   earn: '₹7,200',   color: '#60a5fa' },
  { level: 'L2 Partner',  enrolments: '5–14',  earn: '₹8,500',   color: '#34d399' },
  { level: 'L3 Partner',  enrolments: '15–29', earn: '₹10,000',  color: '#fbbf24' },
  { level: 'L4 Partner',  enrolments: '30+',   earn: '₹12,000+', color: '#f472b6' },
]

const BENEFITS = [
  { icon: TrendingUp, color: '#34d399', title: 'Earn ₹7,000–₹15,000 per enrolment', desc: 'Every paid student you bring in earns you a commission. The more you enrol, the higher your rate.' },
  { icon: Users,      color: '#818cf8', title: 'Build your own partner network', desc: 'Earn cascade commissions when your downstream partners enrol students too — fully geometric.' },
  { icon: Gift,       color: '#fbbf24', title: 'Free AI-Kit & priority certificate', desc: 'Active partners receive the oStaran AI-Kit (worth ₹5,000) and priority certificate issuance.' },
  { icon: Star,       color: '#f472b6', title: 'Exclusive partner webinars', desc: 'Monthly partner briefings with Arijit — strategy, new courses, collateral, and updates.' },
  { icon: Shield,     color: '#60a5fa', title: 'Dedicated partner dashboard', desc: 'Real-time analytics on registrations, conversions, payouts, and your full network at partner.ostaran.com.' },
  { icon: Zap,        color: '#fb923c', title: 'Ready-made marketing collateral', desc: 'Personalised QR codes, posters, standees, WhatsApp messages, and email templates — all pre-built.' },
]

export default function BecomePartnerClient({ registerUrl, referringPartner, studentEmail, existingPartner }: {
  registerUrl: string
  referringPartner: { partner_code: string; full_name: string; level: number } | null
  studentEmail: string
  existingPartner: { id: string; partner_code: string; status: string; level: number; total_paid_enrolments: number; total_commission_earned: number } | null
}) {
  const [copied, setCopied] = useState(false)

  // ── Already a partner — show their dashboard link ─────────────────────
  if (existingPartner) {
    const dashboardUrl = 'https://partner.ostaran.com/dashboard'
    const statusColor = existingPartner.status === 'active' ? '#4ade80' : '#fbbf24'
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white">You're already a Partner! 🎉</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your network, track earnings, and invite more students from your partner dashboard.</p>
        </div>
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Partner Code</p>
                <p className="text-white font-black text-2xl font-mono">{existingPartner.partner_code}</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-semibold capitalize"
                style={{ background: statusColor + '18', color: statusColor, border: `1px solid ${statusColor}30` }}>
                {existingPartner.status}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {[
              { label: 'Level',       value: `L${existingPartner.level}` },
              { label: 'Enrolments', value: existingPartner.total_paid_enrolments },
              { label: 'Earned',     value: `₹${Math.round(Number(existingPartner.total_commission_earned)).toLocaleString('en-IN')}` },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-4 text-center">
                <p className="text-white font-black text-xl">{value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <a href={dashboardUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          <ExternalLink className="w-4 h-4" />
          Open Partner Dashboard →
        </a>
      </div>
    )
  }

  function copyUrl() {
    navigator.clipboard.writeText(registerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const isDownstream = !!referringPartner

  return (
    <div className="space-y-6 pb-12 max-w-3xl">

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)' }}>
        <div className="px-6 py-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
              💼 AI Partner Programme
            </span>
          </div>
          <h1 className="text-white font-extrabold text-2xl leading-tight mb-2">
            Turn your network into<br />a revenue stream
          </h1>
          <p className="text-indigo-300 text-sm leading-relaxed mb-6 max-w-lg">
            You're already an AI student — now become an AI Partner. Earn ₹7,000–₹15,000+ per enrolment
            by promoting oStaran's AI certification programmes to your friends, colleagues, and network.
          </p>

          {/* Referral chain — show who they'll be under */}
          {isDownstream ? (
            <div className="flex items-center gap-2 mb-5 text-xs">
              <div className="px-3 py-1.5 rounded-full text-indigo-200"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                oStaran (Root)
              </div>
              <ChevronRight className="w-3 h-3 text-indigo-400" />
              <div className="px-3 py-1.5 rounded-full font-semibold"
                style={{ background: 'rgba(99,102,241,0.3)', color: '#c7d2fe' }}>
                {referringPartner.full_name} ({referringPartner.partner_code}) · L{referringPartner.level}
              </div>
              <ChevronRight className="w-3 h-3 text-indigo-400" />
              <div className="px-3 py-1.5 rounded-full font-bold text-white"
                style={{ background: 'rgba(251,191,36,0.25)', border: '1px solid rgba(251,191,36,0.4)' }}>
                You → L{(referringPartner.level ?? 1) + 1}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-5 text-xs">
              <div className="px-3 py-1.5 rounded-full text-indigo-200"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                oStaran (Root)
              </div>
              <ChevronRight className="w-3 h-3 text-indigo-400" />
              <div className="px-3 py-1.5 rounded-full font-bold text-white"
                style={{ background: 'rgba(251,191,36,0.25)', border: '1px solid rgba(251,191,36,0.4)' }}>
                You → L1 Root Partner
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={registerUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <ExternalLink className="w-4 h-4" />
              Register as Partner →
            </a>
            <button onClick={copyUrl}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Link Copied!' : 'Copy Registration Link'}
            </button>
          </div>
        </div>
      </div>

      {/* Registration URL box */}
      <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <p className="text-slate-400 text-xs mb-2 uppercase tracking-wide">
          {isDownstream
            ? `Your personalised registration link (downstream under ${referringPartner!.partner_code})`
            : 'Your registration link (root partner — direct under oStaran)'}
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-indigo-300 bg-white/5 rounded-lg px-3 py-2 break-all">
            {registerUrl}
          </code>
          <button onClick={copyUrl}
            className="shrink-0 p-2 rounded-lg transition-all hover:bg-white/10"
            style={{ color: copied ? '#4ade80' : '#94a3b8' }}>
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        {isDownstream && (
          <p className="text-slate-600 text-xs mt-2">
            ℹ️ This link automatically places you as a downstream partner under <strong className="text-slate-400">{referringPartner!.full_name}</strong>.
            You'll earn from your own enrolments, and they earn a cascade commission too.
          </p>
        )}
        {!isDownstream && (
          <p className="text-slate-600 text-xs mt-2">
            ℹ️ No partner referred you, so you'll join as a <strong className="text-slate-400">root Level-1 partner</strong> directly under oStaran.
            All your commissions go entirely to you — no upstream.
          </p>
        )}
      </div>

      {/* Earnings tiers */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-white font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" /> Earnings by Tier
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">Per enrolment · AI Mastery Programme (₹47,994 MRP)</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {TIERS.map(t => (
            <div key={t.level} className="px-4 py-4 text-center">
              <p className="text-xs text-slate-500 mb-1">{t.level}</p>
              <p className="font-black text-lg" style={{ color: t.color }}>{t.earn}</p>
              <p className="text-slate-600 text-[10px] mt-0.5">{t.enrolments} enrolments</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-slate-500 text-xs">
            + Cascade earnings when your downstream partners enrol students (geometric 75/25 model).
            A partner with 10 active downstream partners can earn ₹50,000–₹1,50,000/month.
          </p>
        </div>
      </div>

      {/* Benefits grid */}
      <div>
        <h2 className="text-white font-bold mb-4">What you get as a Partner</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {BENEFITS.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="rounded-2xl border p-4 flex gap-3"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: color + '18' }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{title}</p>
                <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="rounded-2xl border p-6 text-center"
        style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
        <p className="text-white font-bold text-lg mb-1">Ready to start earning?</p>
        <p className="text-slate-400 text-sm mb-5">
          Registration takes 3 minutes. Your partner dashboard is live instantly after approval.
        </p>
        <a href={registerUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          <ExternalLink className="w-4 h-4" />
          Register at partner.ostaran.com →
        </a>
      </div>
    </div>
  )
}
