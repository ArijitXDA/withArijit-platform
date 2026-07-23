import { createClient } from '@supabase/supabase-js'
import { SlotPickerClient } from './_components/SlotPickerClient'
import { InviteAttendees } from './_components/InviteAttendees'

export const dynamic = 'force-dynamic'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default async function SchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: order } = await admin
    .from('consultation_orders')
    .select('id, status, duration_sku, sessions, attendees, buyer_name, buyer_timezone, batch_id')
    .eq('schedule_token', token)
    .maybeSingle()

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Booking not found</h1>
        <p className="text-gray-600 mt-3">This scheduling link is invalid or has expired. Please check your email or contact ai@ostaran.com.</p>
      </div>
    )
  }

  if (order.status === 'scheduled') {
    const { data: batch } = await admin
      .from('awa_batches')
      .select('meeting_link')
      .eq('id', order.batch_id)
      .maybeSingle()
    // Paid top-up (extension) orders — each has its own downloadable invoice.
    const { data: extensions } = await admin
      .from('consultation_orders')
      .select('schedule_token, extra_sessions')
      .eq('parent_order_id', order.id)
      .eq('order_kind', 'extension')
      .eq('status', 'paid')
      .not('schedule_token', 'is', null)
      .order('created_at')
    return (
      <div className="max-w-lg mx-auto px-4 py-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">You&apos;re all booked ✓</h1>
          <p className="text-gray-600 mt-3">Your consultation is scheduled. Details are in your inbox.</p>
          {batch?.meeting_link && (
            <a href={batch.meeting_link} className="inline-block mt-6 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold">
              Join link
            </a>
          )}
        </div>
        {Number(order.attendees) > 1 && (
          <InviteAttendees token={token} maxInvites={Number(order.attendees) - 1} />
        )}

        {/* Invoices — the booking + every paid extension */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-left">
          <h3 className="font-bold text-gray-900 mb-3">Invoices</h3>
          <ul className="divide-y divide-gray-100">
            <li className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Consultation booking</span>
              <a href={`/api/consultation/invoice/${token}`} className="text-sm font-semibold text-indigo-600 hover:underline">
                Download PDF
              </a>
            </li>
            {(extensions ?? []).map((x) => (
              <li key={x.schedule_token} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">
                  + {x.extra_sessions} session{x.extra_sessions === 1 ? '' : 's'} added
                </span>
                <a href={`/api/consultation/invoice/${x.schedule_token}`} className="text-sm font-semibold text-indigo-600 hover:underline">
                  Download PDF
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <p className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-green-700 bg-green-50 mb-3">
          Payment received
        </p>
        <h1 className="text-3xl font-extrabold text-gray-900">Pick your session time</h1>
        <p className="text-gray-600 mt-3">
          {order.sessions > 1
            ? `Choose a weekly slot — your ${order.sessions} sessions repeat at that time.`
            : 'Choose a time that works for you.'}
        </p>
      </div>
      <SlotPickerClient
        token={token}
        sessions={Number(order.sessions) || 1}
        attendees={Number(order.attendees) || 1}
        buyerTimezone={order.buyer_timezone}
      />
      <p className="text-center mt-6">
        <a href={`/api/consultation/invoice/${token}`} className="text-sm text-indigo-600 underline">
          Download invoice (PDF)
        </a>
      </p>
    </div>
  )
}
