import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ConsultationHero } from './_components/ConsultationHero'
import { WhoThisIsFor } from './_components/WhoThisIsFor'
import { ConsultationServices } from './_components/ConsultationServices'
import { ConsultationInteractive } from './_components/ConsultationInteractive'

// ISR: the rate card changes rarely and every visitor sees the same USD prices.
// Buyer-country / timezone detection is done CLIENT-side (see ConsultationInteractive)
// so this page never needs dynamic rendering — which keeps it cached and fast.
export const revalidate = 3600

export const metadata: Metadata = {
  // The (public) layout template appends " | oStaran" — do not repeat it here.
  title: 'Book a slot with an Industrial Agentic AI Expert',
  description:
    'One-on-one and team consultations with an industrial Agentic AI expert — Agentic AI development, quantum AI, data-centre & governance, BI and custom projects. USD pricing, sessions in your own timezone.',
  keywords: [
    'AI consultation',
    'Agentic AI expert',
    'AI project consulting',
    'AI system design',
    'AI governance advisory',
    'quantum AI consulting',
  ],
}

export type ConsultationType = {
  id: string
  code: string
  label: string
  price_per_hour_usd: number | null
  min_charge_usd: number | null
  is_dynamic: boolean
  floor_usd: number | null
  ceiling_usd: number | null
  services: string[]
}

export type ConsultationConfig = {
  free_attendees: number
  group_surcharge_per_person_per_hour_usd: number
}

async function getConsultationData(): Promise<{
  types: ConsultationType[]
  config: ConsultationConfig
}> {
  const supabase = await createClient()

  const [typesRes, configRes] = await Promise.all([
    supabase
      .from('consultation_project_types')
      .select(
        'id, code, label, price_per_hour_usd, min_charge_usd, is_dynamic, floor_usd, ceiling_usd, sort_order, consultation_services(name, sort_order)',
      )
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('consultation_config')
      .select('free_attendees, group_surcharge_per_person_per_hour_usd')
      .eq('id', 1)
      .maybeSingle(),
  ])

  if (typesRes.error) console.error('[expert-consultation] types read:', typesRes.error.message)
  if (configRes.error) console.error('[expert-consultation] config read:', configRes.error.message)

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

  const types: ConsultationType[] = (typesRes.data ?? []).map((r: any) => ({
    id: r.id,
    code: r.code,
    label: r.label,
    price_per_hour_usd: num(r.price_per_hour_usd),
    min_charge_usd: num(r.min_charge_usd),
    is_dynamic: !!r.is_dynamic,
    floor_usd: num(r.floor_usd),
    ceiling_usd: num(r.ceiling_usd),
    services: ((r.consultation_services ?? []) as any[])
      .slice()
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
      .map((s) => String(s.name)),
  }))

  const config: ConsultationConfig = {
    free_attendees: Number(configRes.data?.free_attendees ?? 5),
    group_surcharge_per_person_per_hour_usd: Number(
      configRes.data?.group_surcharge_per_person_per_hour_usd ?? 10,
    ),
  }

  return { types, config }
}

export default async function ExpertConsultationPage() {
  const { types, config } = await getConsultationData()

  // Lowest standard hourly rate, for the hero "from $X/hr" stat.
  const fixedRates = types
    .filter((t) => !t.is_dynamic && t.price_per_hour_usd != null)
    .map((t) => t.price_per_hour_usd as number)
  const fromRate = fixedRates.length ? Math.min(...fixedRates) : null

  return (
    <div className="min-h-screen bg-white">
      <ConsultationHero fromRate={fromRate} freeAttendees={config.free_attendees} />
      <WhoThisIsFor />
      <ConsultationServices config={config} />
      <ConsultationInteractive types={types} config={config} />
    </div>
  )
}
