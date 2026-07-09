'use client'
import { Shield, Users, Star, Clock, Award } from 'lucide-react'
import { Price } from '@/lib/currency'

interface Props {
  basePrice:    number
  finalPrice:   number
  discountAmt:  number
  discountLabel: string
  discountPct:  number
  title:        string
}

const BADGES = [
  '✔ Online Session',
  '✔ AI Certificate',
  '✔ Expert Trainer',
  '✔ Library Access',
  '✔ Recording Access',
]

export function MasterclassHero({ basePrice, finalPrice, discountAmt, discountLabel, discountPct, title }: Props) {
  const hasCampaign = discountAmt > 0

  return (
    <section className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #1e1b4b 100%)' }}>
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#7c3aed' }} />
      <div className="absolute bottom-0 right-1/3 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#4f46e5' }} />

      <div className="relative max-w-5xl mx-auto px-4 py-14">

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-8 text-sm text-indigo-200">
          <span className="flex items-center gap-1.5"><Users size={14} className="text-indigo-400" /> 50,000+ trained from India, USA &amp; Canada</span>
          <span className="flex items-center gap-1.5"><Star size={13} className="text-amber-400 fill-amber-400" /> 4.9 / 5 Rating</span>
          <span className="flex items-center gap-1.5"><Clock size={13} className="text-indigo-400" /> 90 Minutes</span>
          <span className="flex items-center gap-1.5"><Award size={13} className="text-green-400" /> Globally Recognised Certificate</span>
        </div>

        {/* Campaign badge */}
        {hasCampaign && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-5 border"
            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)' }}>
            🎉 {discountLabel} — {discountPct}% OFF
          </div>
        )}

        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">{title}</h1>
        <p className="text-xl text-indigo-200 max-w-2xl mb-6">
          Boost your resume, LinkedIn &amp; career prospects with an industry-recognised AI certification — in just 90 minutes.
        </p>

        {/* Feature badges */}
        <div className="flex flex-wrap gap-2 mb-10">
          {BADGES.map(b => (
            <span key={b} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
              {b}
            </span>
          ))}
        </div>

        {/* Price block */}
        <div className="inline-flex flex-col sm:flex-row items-start sm:items-center gap-5 px-7 py-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          {hasCampaign ? (
            <>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Session Fee (MRP)</p>
                <p className="text-2xl font-semibold text-gray-400 line-through"><Price inr={basePrice} /></p>
              </div>
              <div className="text-2xl text-gray-500 hidden sm:block">→</div>
              <div>
                <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">You Pay Today</p>
                <p className="text-6xl font-black text-white leading-none"><Price inr={finalPrice} /></p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="px-3 py-1.5 rounded-xl text-sm font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                  Save <Price inr={discountAmt} /> 🎉
                </span>
                <p className="text-xs text-gray-500 px-1">{discountLabel}</p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Session Fee</p>
              <p className="text-5xl font-black text-white"><Price inr={finalPrice} /></p>
            </div>
          )}
        </div>

        {/* Trust line */}
        <div className="flex items-center gap-2 mt-6 text-xs text-indigo-400">
          <Shield size={13} /> Secured by Razorpay · GST Invoice Issued · 7-day Refund Policy
        </div>
      </div>
    </section>
  )
}
