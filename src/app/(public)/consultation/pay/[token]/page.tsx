import { createClient } from '@supabase/supabase-js'
import { PayClient } from './_components/PayClient'

export const dynamic = 'force-dynamic'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-600 mt-3">{body}</p>
    </div>
  )
}

export default async function ConsultationPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: quote } = await admin
    .from('consultation_quotes')
    .select('id, status, final_rate_usd, pay_token_expires_at')
    .eq('pay_token', token)
    .maybeSingle()

  if (!quote) {
    return <Message title="Link not found" body="This payment link is invalid. Please check your email or contact ai@ostaran.com." />
  }
  if (quote.status === 'booked') {
    return <Message title="Already paid" body="This consultation has already been booked. Details are in your inbox." />
  }
  if (quote.status !== 'approved' || quote.final_rate_usd == null) {
    return <Message title="Not ready yet" body="This quote isn't approved for payment yet. We'll email you when it is." />
  }
  if (quote.pay_token_expires_at && new Date().toISOString() > quote.pay_token_expires_at) {
    return <Message title="Link expired" body="This payment link has expired. Please contact ai@ostaran.com and we'll send a fresh one." />
  }

  const { data: cfg } = await admin
    .from('consultation_config')
    .select('free_attendees, group_surcharge_per_person_per_hour_usd')
    .eq('id', 1)
    .maybeSingle()

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-green-700 bg-green-50 mb-3">
        Quote approved
      </p>
      <h1 className="text-3xl font-extrabold text-gray-900">Complete your booking</h1>
      <p className="text-gray-600 mt-3">Your bespoke rate is locked in. Choose your duration and pay securely.</p>
      <PayClient
        payToken={token}
        rateUsd={Number(quote.final_rate_usd)}
        freeAttendees={Number(cfg?.free_attendees ?? 5)}
        surchargePerPersonPerHour={Number(cfg?.group_surcharge_per_person_per_hour_usd ?? 10)}
      />
    </div>
  )
}
