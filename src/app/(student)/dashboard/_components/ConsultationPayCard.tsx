import { createServiceClient } from '@/lib/supabase/service'
import { formatUsd } from '@/lib/consultationUsd'

// Surfaces any APPROVED Type-4 consultation quote for the logged-in buyer's email, with a
// Pay button (the same locked-rate pay page the approval email links to). Renders nothing
// when there is no approved-and-unpaid quote. consultation_quotes is service-role only.
export async function ConsultationPayCard({ email }: { email: string }) {
  let quotes: { id: string; final_rate_usd: number; pay_token: string }[] = []
  try {
    const svc = createServiceClient()
    const nowIso = new Date().toISOString()
    const { data } = await svc
      .from('consultation_quotes')
      .select('id, final_rate_usd, pay_token, pay_token_expires_at, consultation_enquiries!inner(work_email)')
      .eq('status', 'approved')
      .not('pay_token', 'is', null)
      .eq('consultation_enquiries.work_email', email.toLowerCase())
    quotes = (data ?? [])
      .filter(
        (q: any) =>
          q.pay_token &&
          q.final_rate_usd != null &&
          (!q.pay_token_expires_at || nowIso <= q.pay_token_expires_at),
      )
      .map((q: any) => ({ id: q.id, final_rate_usd: Number(q.final_rate_usd), pay_token: q.pay_token }))
  } catch {
    return null
  }

  if (!quotes.length) return null

  return (
    <div className="space-y-3">
      {quotes.map((q) => (
        <div
          key={q.id}
          className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <p className="font-bold text-gray-900">Your consultation quote is approved</p>
            <p className="text-sm text-gray-600">
              Bespoke rate: <span className="font-semibold">{formatUsd(q.final_rate_usd)}/hour</span> · choose your
              duration and pay to book.
            </p>
          </div>
          <a
            href={`/consultation/pay/${q.pay_token}`}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700"
          >
            Pay
          </a>
        </div>
      ))}
    </div>
  )
}
