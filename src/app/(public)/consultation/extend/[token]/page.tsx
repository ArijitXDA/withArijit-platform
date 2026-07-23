import { createClient } from '@supabase/supabase-js'
import { getFxRates } from '@/lib/fxRates'
import { inrPerUnit } from '@/lib/currency-config'
import { SKU_HOURS, SKU_SESSIONS, type DurationSku } from '@/lib/consultationCheckoutPricing'
import { ExtendClient } from './_components/ExtendClient'

export const dynamic = 'force-dynamic'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const hhmm = (t: string | null) => String(t ?? '').slice(0, 5)

function Shell({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-600 mt-3">{body}</p>
    </div>
  )
}

export default async function ExtendConsultationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: order } = await admin
    .from('consultation_orders')
    .select('id, status, batch_id, rate_usd, duration_sku, attendees, billing_country, billing_state')
    .eq('schedule_token', token)
    .eq('order_kind', 'booking')
    .maybeSingle()

  if (!order) return <Shell title="Booking not found" body="This link is invalid. Please check your dashboard or contact ai@ostaran.com." />
  if (order.status !== 'paid' && order.status !== 'scheduled')
    return <Shell title="Not active yet" body="This consultation isn't active yet. Once it is, you can add more sessions." />
  if (!order.batch_id)
    return <Shell title="Pick your slot first" body="Choose your session time first — then you can add more sessions to it." />

  const { data: batch } = await admin
    .from('awa_batches')
    .select('total_sessions, day_of_week, start_time')
    .eq('id', order.batch_id)
    .maybeSingle()

  const { data: cfg } = await admin
    .from('consultation_config')
    .select('free_attendees, group_surcharge_per_person_per_hour_usd, gst_rate, gst_mode')
    .eq('id', 1)
    .maybeSingle()

  let fxUsdInr = 0
  try {
    fxUsdInr = inrPerUnit('USD', await getFxRates())
  } catch {
    fxUsdInr = 0
  }

  const dsku = order.duration_sku as DurationSku
  const perSessionHours = (SKU_HOURS[dsku] ?? 1) / (SKU_SESSIONS[dsku] ?? 1)

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <p className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 mb-3">
          Extend your engagement
        </p>
        <h1 className="text-3xl font-extrabold text-gray-900">Add more sessions</h1>
        <p className="text-gray-600 mt-3">
          Your engagement: <span className="font-semibold">{batch?.total_sessions ?? 0} sessions</span> ·{' '}
          {batch?.day_of_week} {hhmm(batch?.start_time)} IST. New sessions continue at the same weekly time and use the
          same Teams link.
        </p>
      </div>
      <ExtendClient
        token={token}
        rateUsd={Number(order.rate_usd) || 0}
        perSessionHours={perSessionHours}
        attendees={Number(order.attendees) || 1}
        freeAttendees={Number(cfg?.free_attendees ?? 5)}
        surcharge={Number(cfg?.group_surcharge_per_person_per_hour_usd ?? 10)}
        billingCountry={order.billing_country}
        billingState={order.billing_state}
        gstRate={Number(cfg?.gst_rate ?? 18)}
        gstMode={cfg?.gst_mode === 'inclusive' ? 'inclusive' : 'exclusive'}
        fxUsdInr={fxUsdInr}
      />
    </div>
  )
}
