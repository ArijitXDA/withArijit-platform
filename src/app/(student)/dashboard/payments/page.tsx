import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect }            from 'next/navigation'
import { CreditCard, CheckCircle, FileText } from 'lucide-react'

function formatINR(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function payTypeLabel(type: string, inst: number, total: number): string {
  if (type === 'full')              return 'Full Payment'
  if (type === 'first_instalment')  return `Instalment ${inst}/${total}`
  if (type === 'second_instalment') return `Instalment ${inst}/${total}`
  if (type === 'monthly_emi')       return `EMI ${inst}/${total}`
  if (type === 'balance_clearance') return 'Balance Cleared'
  return 'Payment'
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // New: payment_transactions (one per payment event, with invoice)
  const { data: transactions } = await service
    .from('payment_transactions')
    .select('invoice_number, course_name, payment_type, instalment_number, total_instalments, amount_paid, payment_mode, payment_date, payment_reference, net_taxable, gst_amount, gst_mode, gst_pct, invoice_url, created_at')
    .eq('student_email', email.toLowerCase())
    .order('created_at', { ascending: false })

  // Legacy payments (no invoice available)
  const { data: legacyPayments } = await service
    .from('payments')
    .select('id, amount, payment_date, razorpay_payment_id, course')
    .eq('email', email)
    .order('payment_date', { ascending: false })

  const totalPaid = [
    ...(transactions ?? []).map(t => Number(t.amount_paid)),
    ...(legacyPayments ?? []).map(p => Number(p.amount)),
  ].reduce((a, b) => a + b, 0)

  const hasPaid = (transactions ?? []).length > 0 || (legacyPayments ?? []).length > 0

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <CreditCard size={22} className="text-indigo-400" /> Payment History
        </h1>
        {hasPaid && (
          <p className="text-gray-500 text-sm mt-1">
            Total paid: <span className="text-white font-semibold">{formatINR(totalPaid)}</span>
          </p>
        )}
      </div>

      {/* ── Payment transactions with invoices ──────────────────────────── */}
      {(transactions ?? []).length > 0 && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-white font-bold">Course Payments</h2>
            <p className="text-gray-500 text-xs mt-0.5">GST tax invoice available for each payment</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {(transactions ?? []).map((t: any) => (
              <div key={t.invoice_number} className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <CheckCircle size={15} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.course_name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {payTypeLabel(t.payment_type, t.instalment_number, t.total_instalments)}
                      {' · '}
                      {t.payment_date
                        ? new Date(t.payment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {t.payment_mode && ` · ${t.payment_mode.replace(/_/g,' ')}`}
                    </p>
                    {t.payment_reference && (
                      <p className="text-gray-600 text-xs font-mono mt-0.5">{t.payment_reference}</p>
                    )}
                    {/* GST breakdown hint */}
                    <p className="text-gray-700 text-xs mt-0.5">
                      Taxable ₹{Math.round(Number(t.net_taxable)).toLocaleString('en-IN')} + GST ₹{Math.round(Number(t.gst_amount)).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-white font-black">{formatINR(Number(t.amount_paid))}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                      Paid
                    </span>
                  </div>
                  {/* Invoice button */}
                  <a
                    href={`/dashboard/invoice/${t.invoice_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    <FileText size={12} />
                    GST Invoice
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Legacy payments (no invoice) ────────────────────────────────── */}
      {(legacyPayments ?? []).length > 0 && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-white font-bold">Previous Payments</h2>
            <p className="text-gray-500 text-xs mt-0.5">Pre-platform payments — invoices not available</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {(legacyPayments ?? []).map((p: any) => (
              <div key={p.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <CreditCard size={15} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{p.course ?? 'AI Course Payment'}</p>
                    {p.payment_date && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        {new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {p.razorpay_payment_id && (
                      <p className="text-gray-600 text-xs font-mono mt-0.5">{p.razorpay_payment_id}</p>
                    )}
                  </div>
                </div>
                <p className="text-white font-black">{formatINR(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasPaid && (
        <div className="rounded-2xl border py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <CreditCard size={36} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-semibold">No payment records</p>
          <p className="text-gray-600 text-sm mt-1">Your payment history and GST invoices will appear here after enrolment</p>
        </div>
      )}
    </div>
  )
}
