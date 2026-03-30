'use client'
import { useState } from 'react'
import { ExternalLink, Copy, CheckCircle, Users, TrendingUp, Gift, Star, Shield, ChevronRight, Zap } from 'lucide-react'

const T = {
  surface: '#ffffff', border: '#dce6f5', borderLight: '#e8f0fc',
  navy: '#0f1f3d', navyMid: '#1a3a6b', blue: '#2563eb', blueMid: '#1d4ed8',
  blueLight: '#eff6ff', bluePale: '#dbeafe',
  textPrimary: '#0f1f3d', textSec: '#475569', textMuted: '#94a3b8',
  green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#bbf7d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBorder: '#fde68a',
  indigo: '#4f46e5', indigoBg: '#eef2ff', indigoBorder: '#c7d2fe',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBorder: '#ddd6fe',
}

const TIERS = [
  { level: 'L1 Partner',  enrolments: '1–4',   earn: '₹7,200',   color: T.blue,   bg: T.blueLight   },
  { level: 'L2 Partner',  enrolments: '5–14',  earn: '₹8,500',   color: T.green,  bg: T.greenBg     },
  { level: 'L3 Partner',  enrolments: '15–29', earn: '₹10,000',  color: T.amber,  bg: T.amberBg     },
  { level: 'L4 Partner',  enrolments: '30+',   earn: '₹12,000+', color: T.purple, bg: T.purpleBg    },
]

const BENEFITS = [
  { icon: TrendingUp, color: T.green,  title: 'Earn ₹7,000–₹15,000 per enrolment',  desc: 'Every paid student you bring in earns you a commission. The more you enrol, the higher your rate.' },
  { icon: Users,      color: T.blue,   title: 'Build your own partner network',       desc: 'Earn cascade commissions when your downstream partners enrol students too — fully geometric.' },
  { icon: Gift,       color: T.amber,  title: 'Free AI-Kit & priority certificate',   desc: 'Active partners receive the oStaran AI-Kit (worth ₹5,000) and priority certificate issuance.' },
  { icon: Star,       color: T.purple, title: 'Exclusive partner webinars',           desc: 'Monthly partner briefings with Arijit — strategy, new courses, collateral, and updates.' },
  { icon: Shield,     color: T.indigo, title: 'Dedicated partner dashboard',          desc: 'Real-time analytics on registrations, conversions, payouts at partner.ostaran.com.' },
  { icon: Zap,        color: '#ea580c', title: 'Ready-made marketing collateral',     desc: 'Personalised QR codes, posters, standees, WhatsApp messages — all pre-built.' },
]

export default function BecomePartnerClient({ registerUrl, referringPartner, studentEmail, existingPartner }: {
  registerUrl: string
  referringPartner: { partner_code: string; full_name: string; level: number } | null
  studentEmail: string
  existingPartner: { id: string; partner_code: string; status: string; level: number; total_paid_enrolments: number; total_commission_earned: number } | null
}) {
  const [copied, setCopied] = useState(false)

  // ── Already a partner ─────────────────────────────────────────────────────
  if (existingPartner) {
    const isActive = existingPartner.status === 'active'
    return (
      <div className="space-y-5 max-w-2xl pb-12">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: T.navy }}>You're already a Partner! 🎉</h1>
          <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
            Manage your network, track earnings, and invite more students from your partner dashboard.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${T.border}` }}>
          <div className="px-6 py-5 border-b" style={{ borderColor: T.borderLight, background: T.blueLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: T.textMuted }}>Partner Code</p>
                <p className="font-black text-3xl font-mono" style={{ color: T.navy }}>{existingPartner.partner_code}</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-semibold capitalize"
                style={isActive
                  ? { background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }
                  : { background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}>
                {existingPartner.status}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x" style={{ borderColor: T.borderLight }}>
            {[
              { label: 'Level',       value: `L${existingPartner.level}` },
              { label: 'Enrolments', value: existingPartner.total_paid_enrolments },
              { label: 'Earned',     value: `₹${Math.round(Number(existingPartner.total_commission_earned)).toLocaleString('en-IN')}` },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-4 text-center">
                <p className="font-black text-2xl" style={{ color: T.textPrimary }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <a href="https://partner.ostaran.com/dashboard" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})` }}>
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
    <div className="space-y-5 pb-12 max-w-3xl">

      {/* Hero — keep dark gradient for visual impact */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: `linear-gradient(135deg, ${T.navyMid} 0%, ${T.blueMid} 60%, #1e40af 100%)` }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative px-6 py-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
              💼 AI Partner Programme
            </span>
          </div>
          <h1 className="text-white font-extrabold text-2xl leading-tight mb-2">
            Turn your network into<br />a revenue stream
          </h1>
          <p className="text-sm leading-relaxed mb-6 max-w-lg" style={{ color: '#bfdbfe' }}>
            You're already an AI student — now become an AI Partner. Earn ₹7,000–₹15,000+ per enrolment
            by promoting oStaran's AI certification programmes to your network.
          </p>

          {/* Referral chain */}
          <div className="flex items-center gap-2 mb-5 text-xs flex-wrap">
            <div className="px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: '#e0f2fe' }}>
              oStaran (Root)
            </div>
            <ChevronRight className="w-3 h-3" style={{ color: '#bfdbfe' }} />
            {isDownstream && (
              <>
                <div className="px-3 py-1.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.2)', color: '#c7d2fe' }}>
                  {referringPartner!.full_name} ({referringPartner!.partner_code}) · L{referringPartner!.level}
                </div>
                <ChevronRight className="w-3 h-3" style={{ color: '#bfdbfe' }} />
              </>
            )}
            <div className="px-3 py-1.5 rounded-full font-bold text-white"
              style={{ background: 'rgba(251,191,36,0.3)', border: '1px solid rgba(251,191,36,0.5)' }}>
              You → {isDownstream ? `L${(referringPartner!.level ?? 1) + 1}` : 'L1 Root Partner'}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a href={registerUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <ExternalLink className="w-4 h-4" /> Register as Partner →
            </a>
            <button onClick={copyUrl}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}>
              {copied ? <CheckCircle className="w-4 h-4" style={{ color: '#4ade80' }} /> : <Copy className="w-4 h-4" />}
              {copied ? 'Link Copied!' : 'Copy Registration Link'}
            </button>
          </div>
        </div>
      </div>

      {/* Registration URL */}
      <div className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${T.border}` }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: T.textMuted }}>
          {isDownstream
            ? `Your personalised registration link (downstream under ${referringPartner!.partner_code})`
            : 'Your registration link (root partner — direct under oStaran)'}
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs rounded-xl px-3 py-2 break-all"
            style={{ background: T.blueLight, color: T.blue, border: `1px solid ${T.bluePale}` }}>
            {registerUrl}
          </code>
          <button onClick={copyUrl}
            className="shrink-0 p-2 rounded-lg transition-all hover:bg-blue-50"
            style={{ color: copied ? T.green : T.textMuted }}>
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: T.textMuted }}>
          {isDownstream
            ? `ℹ️ This link places you as a downstream partner under ${referringPartner!.full_name}.`
            : "ℹ️ No partner referred you — you'll join as a root L1 partner directly under oStaran."}
        </p>
      </div>

      {/* Earnings tiers */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: T.borderLight, background: T.blueLight }}>
          <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: T.navy }}>
            <TrendingUp className="w-4 h-4" style={{ color: T.green }} /> Earnings by Tier
          </h2>
          <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>Per enrolment · AI Mastery Programme (₹47,994 MRP)</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0"
          style={{ borderColor: T.borderLight }}>
          {TIERS.map(t => (
            <div key={t.level} className="px-4 py-4 text-center" style={{ background: t.bg }}>
              <p className="text-xs mb-1" style={{ color: T.textMuted }}>{t.level}</p>
              <p className="font-black text-lg" style={{ color: t.color }}>{t.earn}</p>
              <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{t.enrolments} enrolments</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t" style={{ borderColor: T.borderLight }}>
          <p className="text-xs" style={{ color: T.textSec }}>
            + Cascade earnings when your downstream partners enrol students (geometric 75/25 model).
            A partner with 10 active downstream partners can earn ₹50,000–₹1,50,000/month.
          </p>
        </div>
      </div>

      {/* Benefits grid */}
      <div>
        <h2 className="font-bold mb-3 text-sm" style={{ color: T.navy }}>What you get as a Partner</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {BENEFITS.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="rounded-2xl bg-white p-4 flex gap-3"
              style={{ border: `1px solid ${T.border}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: color + '18' }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: T.textPrimary }}>{title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: T.textSec }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="rounded-2xl p-6 text-center bg-white" style={{ border: `1px solid ${T.indigoBorder}`, background: T.indigoBg }}>
        <p className="font-bold text-lg mb-1" style={{ color: T.navy }}>Ready to start earning?</p>
        <p className="text-sm mb-5" style={{ color: T.textSec }}>
          Registration takes 3 minutes. Your partner dashboard is live instantly after approval.
        </p>
        <a href={registerUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})` }}>
          <ExternalLink className="w-4 h-4" />
          Register at partner.ostaran.com →
        </a>
      </div>
    </div>
  )
}
