import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { MasterclassHero }     from './_components/MasterclassHero'
import { MasterclassCards }    from './_components/MasterclassCards'
import { MasterclassTrainer }  from './_components/MasterclassTrainer'
import { MasterclassCurriculum } from './_components/MasterclassCurriculum'
import { MasterclassTestimonials } from './_components/MasterclassTestimonials'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Certification Session | oStaran',
  description: 'Get AI certified in 90 minutes. Live online session with globally recognised certificate. Choose your audience category and register now.',
  keywords: ['AI certification', 'AI session paid', 'oStaran masterclass', 'live AI webinar India'],
}

// UTM content → course_id mapping
const UTM_CONTENT_MAP: Record<string, number[]> = {
  working_prof: [1],
  school:       [2],
  college:      [3],
  techies:      [4],
  cxo:          [5],
  'all-5':      [1, 2, 3, 4, 5],
}

// Audience metadata for each course_id
const SESSION_META: Record<number, {
  emoji: string; label: string; ageRange: string
  profession: string; badge: string | null; color: string
}> = {
  1: { emoji: '💼', label: 'AI for Working Professionals',         ageRange: '24 to 60 years', profession: 'working_professional', badge: '⭐ Most popular in India',    color: '#4f46e5' },
  2: { emoji: '📚', label: 'AI for Schools (CBSE/ICSE/State)',     ageRange: '10 to 16 years', profession: 'school_student',       badge: '⭐ Most popular in India',    color: '#0284c7' },
  3: { emoji: '🎓', label: 'AI for College & Job Seekers',         ageRange: '17 to 23 years', profession: 'college_student',      badge: '⭐ Most popular in India',    color: '#059669' },
  4: { emoji: '💻', label: 'Agentic AI — Tech Developers',         ageRange: '20 to 55 years', profession: 'tech_developer',       badge: '⭐ Most popular in Bengaluru', color: '#7c3aed' },
  5: { emoji: '🏆', label: 'AI for Business Leaders & CXOs',       ageRange: '30 to 65 years', profession: 'cxo',                  badge: '⭐ Most popular in Mumbai',    color: '#d97706' },
}

async function getPageData(utmCampaign: string | null, utmContent: string | null) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const allowedCourseIds = utmContent && UTM_CONTENT_MAP[utmContent]
    ? UTM_CONTENT_MAP[utmContent]
    : [1, 2, 3, 4, 5]

  const today = new Date().toISOString().split('T')[0]

  const [{ data: config }, campaignResult, { data: sessions }] = await Promise.all([
    admin.from('masterclass_config').select('*').single(),
    utmCampaign
      ? admin.from('masterclass_campaigns').select('*')
          .eq('utm_code', utmCampaign).eq('is_active', true)
          .or(`valid_until.is.null,valid_until.gte.${today}`)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from('qr_landing_webinar_links')
      .select('course_id, course_name, webinar_date, webinar_time')
      .gte('webinar_date', today)
      .eq('is_active', true)
      .in('course_id', allowedCourseIds)
      .order('webinar_date').order('webinar_time'),
  ])

  const campaign   = campaignResult.data
  const basePrice  = Number(config?.base_price ?? 3999)
  let finalPrice   = basePrice
  let discountAmt  = 0
  let discountLabel = ''
  let discountPct   = 0

  if (campaign) {
    if (campaign.discount_type === 'flat') {
      discountAmt   = Number(campaign.discount_value)
      discountPct   = Math.round(discountAmt / basePrice * 100)
      discountLabel = campaign.name
    } else {
      discountPct   = Number(campaign.discount_value)
      discountAmt   = Math.round(basePrice * discountPct / 100)
      discountLabel = `${campaign.name} (${discountPct}% off)`
    }
    const withinUses = !campaign.max_uses || campaign.uses_count < campaign.max_uses
    if (withinUses) {
      finalPrice = Math.max(0, basePrice - discountAmt)
    } else {
      discountAmt = 0; discountLabel = ''; discountPct = 0
    }
  }

  // Deduplicate by course_id (keep first/nearest date)
  const seen = new Set<number>()
  const dedupedSessions = (sessions ?? []).filter(s => {
    if (seen.has(s.course_id)) return false
    seen.add(s.course_id); return true
  })

  // Sort by our desired order
  const ORDER = [1, 2, 3, 4, 5]
  dedupedSessions.sort((a, b) => ORDER.indexOf(a.course_id) - ORDER.indexOf(b.course_id))

  return {
    config:       config ?? { title: 'AI Certification Session', is_live: true },
    sessions:     dedupedSessions,
    basePrice,
    finalPrice,
    discountAmt,
    discountLabel,
    discountPct,
    campaignId:   campaign?.id ?? null,
    sessionMeta:  SESSION_META,
  }
}

export default async function MasterclassPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params       = await searchParams
  const utmCampaign  = typeof params.utm_campaign === 'string' ? params.utm_campaign : null
  const utmSource    = typeof params.utm_source   === 'string' ? params.utm_source   : null
  const utmMedium    = typeof params.utm_medium   === 'string' ? params.utm_medium   : null
  const utmContent   = typeof params.utm_content  === 'string' ? params.utm_content  : null

  const data = await getPageData(utmCampaign, utmContent)

  return (
    <div className="min-h-screen bg-white">
      <MasterclassHero
        basePrice={data.basePrice}
        finalPrice={data.finalPrice}
        discountAmt={data.discountAmt}
        discountLabel={data.discountLabel}
        discountPct={data.discountPct}
        title={data.config.title as string}
      />
      <MasterclassCards
        sessions={data.sessions}
        sessionMeta={data.sessionMeta}
        basePrice={data.basePrice}
        finalPrice={data.finalPrice}
        discountAmt={data.discountAmt}
        discountLabel={data.discountLabel}
        campaignId={data.campaignId}
        utmSource={utmSource}
        utmMedium={utmMedium}
        utmCampaign={utmCampaign}
        utmContent={utmContent}
      />
      <MasterclassTrainer />
      <MasterclassTestimonials />
      <MasterclassCurriculum />
    </div>
  )
}
