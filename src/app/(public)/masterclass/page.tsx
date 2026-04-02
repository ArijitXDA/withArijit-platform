import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { MasterclassClient } from './_components/MasterclassClient'
import { Shield, Clock, Star, Users, CheckCircle, Zap, Award, Video, MessageCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Certification Masterclass | oStaran',
  description: 'Get AI certified in 90 minutes. One live session, 5 audience categories, globally recognised AI certificate. Register now.',
  keywords: ['AI certification', 'AI masterclass', 'AI webinar paid', 'oStaran masterclass'],
}

const PROFESSION_OPTIONS = [
  { value: 'working_professional', label: 'Working Professional' },
  { value: 'college_student',      label: 'College Student'      },
  { value: 'job_seeker',           label: 'Job Seeker'           },
  { value: 'school_student',       label: 'School Student'       },
  { value: 'home_maker',           label: 'Homemaker'            },
]

const WHAT_YOU_GET = [
  'Live 90-minute AI Certification session',
  'Globally recognised AI Certificate',
  'Personalised for your audience category',
  'Hands-on AI tools demonstrated live',
  'Q&A with expert AI trainer',
  'Recording access post-session',
  'AI resource kit & prompt pack',
  'Certificate issued within 24 hours',
]

const TRUST_POINTS = [
  { icon: Users,  label: '10,000+ Certified'  },
  { icon: Star,   label: '4.9/5 Rating'       },
  { icon: Shield, label: 'GST Invoice Issued' },
  { icon: Clock,  label: '90 Minutes Only'    },
]

const SESSION_CATEGORIES = [
  { emoji: '💼', label: 'Working Professionals', desc: 'AI for your current role' },
  { emoji: '🎓', label: 'Students & Graduates',  desc: 'AI for career launch'     },
  { emoji: '🔍', label: 'Job Seekers',           desc: 'AI to land your next job' },
  { emoji: '📚', label: 'School Students',       desc: 'AI for young learners'    },
  { emoji: '🏠', label: 'Homemakers',            desc: 'AI for independence'      },
]

async function getMasterclassData(utmCampaign: string | null) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: config }, campaignResult] = await Promise.all([
    admin.from('masterclass_config').select('*').single(),
    utmCampaign
      ? admin
          .from('masterclass_campaigns')
          .select('*')
          .eq('utm_code', utmCampaign)
          .eq('is_active', true)
          .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString().split('T')[0]}`)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const campaign = campaignResult.data
  let finalPrice    = Number(config?.base_price ?? 3999)
  let discountAmt   = 0
  let discountLabel = ''

  if (campaign) {
    if (campaign.discount_type === 'flat') {
      discountAmt   = Number(campaign.discount_value)
      discountLabel = `${campaign.name}`
    } else {
      discountAmt   = Math.round(finalPrice * Number(campaign.discount_value) / 100)
      discountLabel = `${campaign.name} (${campaign.discount_value}% off)`
    }
    if (campaign.max_uses && campaign.uses_count >= campaign.max_uses) {
      discountAmt = 0; discountLabel = ''
    } else {
      finalPrice = Math.max(0, finalPrice - discountAmt)
    }
  }

  return {
    config:       config ?? { base_price: 3999, title: 'AI Certification Masterclass', tagline: '', is_live: true, sessions: 1, duration_weeks: 1 },
    campaign:     campaign ?? null,
    basePrice:    Number(config?.base_price ?? 3999),
    finalPrice,
    discountAmt,
    discountLabel,
    campaignId:   campaign?.id ?? null,
  }
}

export default async function MasterclassPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params      = await searchParams
  const utmCampaign = typeof params.utm_campaign === 'string' ? params.utm_campaign : null
  const utmSource   = typeof params.utm_source   === 'string' ? params.utm_source   : null
  const utmMedium   = typeof params.utm_medium   === 'string' ? params.utm_medium   : null
  const utmContent  = typeof params.utm_content  === 'string' ? params.utm_content  : null

  const { config, basePrice, finalPrice, discountAmt, discountLabel, campaignId } =
    await getMasterclassData(utmCampaign)

  const hasCampaign = discountAmt > 0

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white py-16 px-4" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: '#7c3aed' }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: '#4f46e5' }} />

        <div className="relative max-w-5xl mx-auto">
          {hasCampaign && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6"
              style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }}>
              🎉 Special Offer — {discountLabel}
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
              ✓ Certificate Included
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ⏱ 90 Minutes Only
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
            {config.title}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mb-6">
            One powerful live session. Globally recognised AI certificate.
            Personalised for your career category — not a generic course.
          </p>

          <div className="flex flex-wrap gap-4 mb-8">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-gray-300">
                <Icon size={14} className="text-indigo-400" /> {label}
              </div>
            ))}
          </div>

          {/* Price display */}
          <div className="inline-flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {hasCampaign ? (
              <>
                {/* Struck-off MRP — small */}
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-0.5">Session Fee (MRP)</p>
                    <p className="text-xl text-gray-500 line-through font-semibold">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(basePrice)}
                    </p>
                  </div>
                  <span className="text-gray-600 text-2xl">→</span>
                  {/* Final price — big and prominent */}
                  <div>
                    <p className="text-[11px] text-amber-400 uppercase tracking-widest font-bold mb-0.5">You Pay Today</p>
                    <p className="text-5xl font-black text-white leading-none">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(finalPrice)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="px-3 py-1.5 rounded-xl text-sm font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                    You save {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(discountAmt)}
                  </div>
                  <p className="text-xs text-gray-500 px-1">{discountLabel}</p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Session Fee</p>
                <p className="text-4xl font-extrabold text-white">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(finalPrice)}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Main content + Form ───────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-14 grid lg:grid-cols-5 gap-12">

        {/* Left — details */}
        <div className="lg:col-span-3 space-y-8">

          {/* What you get */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-5">What You Get</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {WHAT_YOU_GET.map(item => (
                <div key={item} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                  <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5 Session Categories */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Video size={18} className="text-indigo-600" /> 5 Audience-Specific Sessions
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Each session is tailored to a specific audience — the AI tools, use cases and examples
              are completely different for each category. Choose the one that fits your profile.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {SESSION_CATEGORIES.map(({ emoji, label, desc }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" /> How It Works
            </h3>
            <div className="space-y-3">
              {[
                ['Register & Pay',    'Complete your registration and payment below'],
                ['Receive Joining Link', 'Your personal webinar link is sent to your email instantly'],
                ['Attend Live Session',  'Join your 90-minute live AI Certification session'],
                ['Get Certified',        'Your AI certificate is issued within 24 hours of attending'],
              ].map(([step, desc], i) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                    style={{ background: '#4f46e5' }}>{i + 1}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{step}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Urgency strip */}
          {hasCampaign && (
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50">
              <span className="text-2xl">⏰</span>
              <div>
                <p className="font-bold text-amber-800 text-sm">Limited Time Offer</p>
                <p className="text-xs text-amber-700">
                  This special price is exclusive to this campaign link. Register now to lock it in.
                </p>
              </div>
            </div>
          )}

          {/* Support note */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-100 border border-gray-200">
            <MessageCircle size={16} className="text-green-600 shrink-0" />
            <p className="text-xs text-gray-600">
              Questions? WhatsApp us or email <a href="mailto:ai@ostaran.com" className="text-indigo-600 font-semibold hover:underline">ai@ostaran.com</a> — we respond within 4 business hours.
            </p>
          </div>
        </div>

        {/* Right — registration form */}
        <div className="lg:col-span-2">
          <div className="sticky top-20">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="p-1" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <div className="bg-white rounded-[22px] p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Award size={18} className="text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-900">Reserve Your Seat</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-5">
                    Select your category below — your session is tailored to your profile.
                  </p>

                  <MasterclassClient
                    basePrice={basePrice}
                    finalPrice={finalPrice}
                    discountAmt={discountAmt}
                    discountLabel={discountLabel}
                    campaignId={campaignId}
                    utmSource={utmSource}
                    utmMedium={utmMedium}
                    utmCampaign={utmCampaign}
                    utmContent={utmContent}
                    professionOptions={PROFESSION_OPTIONS}
                  />
                </div>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                <Shield size={12} className="text-green-500" />
                Secured by Razorpay · GST invoice issued · 7-day refund policy
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
