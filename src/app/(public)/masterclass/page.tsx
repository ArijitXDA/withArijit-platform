import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { MasterclassClient } from './_components/MasterclassClient'
import { Shield, Clock, Star, Users, CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Masterclass | oStaran',
  description: 'Intensive live AI Masterclass — 12 sessions, 6 weeks, globally recognised certificate. Enrol now at a special price.',
}

const PROFESSION_OPTIONS = [
  { value: 'working_professional', label: 'Working Professional' },
  { value: 'college_student',      label: 'College Student'      },
  { value: 'job_seeker',           label: 'Job Seeker'           },
  { value: 'school_student',       label: 'School Student'       },
  { value: 'home_maker',           label: 'Homemaker'            },
]

const WHAT_YOU_GET = [
  '12 live interactive sessions over 6 weeks',
  'Globally recognised AI Certificate',
  'Lifetime access to all recordings',
  'Hands-on projects & case studies',
  'Direct mentorship from industry experts',
  'Dedicated student support channel',
  'Resume & LinkedIn AI makeover kit',
  'Job placement assistance network',
]

const TRUST_POINTS = [
  { icon: Users,  label: '10,000+ Alumni'     },
  { icon: Star,   label: '4.9/5 Rating'       },
  { icon: Shield, label: 'GST Invoice Issued' },
  { icon: Clock,  label: 'Weekend Batches'    },
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

  // Calculate final price server-side — never trust client
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
    // Check max_uses
    if (campaign.max_uses && campaign.uses_count >= campaign.max_uses) {
      discountAmt   = 0
      discountLabel = ''
    } else {
      finalPrice = Math.max(0, finalPrice - discountAmt)
    }
  }

  return {
    config:        config ?? { base_price: 3999, title: 'AI Masterclass', tagline: '', is_live: true, sessions: 12, duration_weeks: 6 },
    campaign:      campaign ?? null,
    basePrice:     Number(config?.base_price ?? 3999),
    finalPrice,
    discountAmt,
    discountLabel,
    campaignId:    campaign?.id ?? null,
  }
}

export default async function MasterclassPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const utmCampaign = typeof searchParams.utm_campaign === 'string' ? searchParams.utm_campaign : null
  const utmSource   = typeof searchParams.utm_source   === 'string' ? searchParams.utm_source   : null
  const utmMedium   = typeof searchParams.utm_medium   === 'string' ? searchParams.utm_medium   : null
  const utmContent  = typeof searchParams.utm_content  === 'string' ? searchParams.utm_content  : null

  const { config, basePrice, finalPrice, discountAmt, discountLabel, campaignId } =
    await getMasterclassData(utmCampaign)

  const hasCampaign = discountAmt > 0
  const savings     = basePrice - finalPrice

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white py-16 px-4" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: '#7c3aed' }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: '#4f46e5' }} />

        <div className="relative max-w-5xl mx-auto">
          {hasCampaign && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6 animate-pulse"
              style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }}>
              🎉 Special Offer Active — {discountLabel}
            </div>
          )}

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
            {config.title}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mb-8">
            {config.tagline || 'Intensive live AI programme. 12 sessions. 6 weeks. Career-transforming.'}
          </p>

          {/* Trust points */}
          <div className="flex flex-wrap gap-4 mb-8">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-gray-300">
                <Icon size={14} className="text-indigo-400" /> {label}
              </div>
            ))}
          </div>

          {/* Price display */}
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {hasCampaign ? (
              <>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Original Price</p>
                  <p className="text-2xl text-gray-400 line-through font-bold">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(basePrice)}
                  </p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div>
                  <p className="text-xs text-amber-400 uppercase tracking-wide font-bold">You Pay</p>
                  <p className="text-3xl font-extrabold text-white">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(finalPrice)}
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl text-sm font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                  Save {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(savings)}
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Programme Fee</p>
                <p className="text-3xl font-extrabold text-white">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(finalPrice)}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Main content + Form ───────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-14 grid lg:grid-cols-5 gap-12">

        {/* Left — What you get */}
        <div className="lg:col-span-3 space-y-8">

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

          {/* Programme details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Programme Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Duration',    `${config.duration_weeks} weeks`  ],
                ['Sessions',    `${config.sessions} live classes` ],
                ['Format',      'Weekend live + recordings'       ],
                ['Certificate', 'Globally recognised'            ],
                ['Access',      'Lifetime'                        ],
                ['Batch size',  'Limited seats'                   ],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-gray-400 text-xs uppercase tracking-wide">{k}</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{v}</p>
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
                <p className="text-xs text-amber-700">This discount is exclusive to this campaign link. Enrol now to lock in your price.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right — Registration form */}
        <div className="lg:col-span-2">
          <div className="sticky top-20">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="p-1" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <div className="bg-white rounded-[22px] p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Reserve Your Seat</h3>
                  <p className="text-xs text-gray-500 mb-5">Fill in your details to proceed to payment</p>

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
