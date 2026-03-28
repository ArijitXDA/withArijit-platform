import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { CreditCard, CheckCircle, Clock } from 'lucide-react'

function formatINR(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // New enrolments (primary)
  const { data: enrolments } = await service
    .from('student_enrolments')
    .select('id, created_at, amount_paid, payment_mode, payment_date, payment_reference, enrolment_type, course_name')
    .eq('student_email', email)
    .order('created_at', { ascending: false })

  // Legacy payments
  const { data: legacyPayments } = await service
    .from('payments')
    .select('id, amount, payment_date, razorpay_payment_id, course')
    .eq('email', email)
    .order('payment_date', { ascending: false })

  const totalPaid = [
    ...(enrolments ?? []).map(e => Number(e.amount_paid)),
    ...(legacyPayments ?? []).map(p => Number(p.amount)),
  ].reduce((a, b) => a + b, 0)

  const hasPaid = (enrolments ?? []).length > 0 || (legacyPayments ?? []).length > 0

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

      {/* New enrolment payments */}
      {(enrolments ?? []).length > 0 && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-white font-bold">Course Enrolments</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {(enrolments ?? []).map((e: any) => (
              <div key={e.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <CheckCircle size={15} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{e.course_name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {e.payment_date
                        ? new Date(e.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      }
                      {e.payment_mode && ` · ${e.payment_mode.replace(/_/g, ' ')}`}
                    </p>
                    {e.payment_reference && (
                      <p className="text-gray-600 text-xs font-mono mt-0.5">{e.payment_reference}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-black">{formatINR(e.amount_paid)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                    Paid
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy payments */}
      {(legacyPayments ?? []).length > 0 && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-white font-bold">Previous Payments</h2>
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
                        {new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {p.razorpay_payment_id && (
                      <p className="text-gray-600 text-xs font-mono mt-0.5">{p.razorpay_payment_id}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-black">{formatINR(p.amount)}</p>
                </div>
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
          <p className="text-gray-600 text-sm mt-1">Your payment history will appear here after enrolment</p>
        </div>
      )}
    </div>
  )
}
