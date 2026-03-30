import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect }            from 'next/navigation'
import { CreditCard, CheckCircle, FileText, AlertCircle } from 'lucide-react'
import { BalancePaymentButton } from './BalancePaymentButton'

const T = {
  surface: '#ffffff', border: '#dce6f5', borderLight: '#e8f0fc',
  navy: '#0f1f3d', blue: '#2563eb', blueLight: '#eff6ff', bluePale: '#dbeafe',
  textPrimary: '#0f1f3d', textSec: '#475569', textMuted: '#94a3b8',
  green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#bbf7d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBorder: '#fde68a', amberDark: '#b45309',
}

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

// Determine what the next payment should be for a given enrolment
function resolveNextPayment(enrolment: any, lastTransaction: any | null): {
  paymentType: string
  instalmentNumber: number
  totalInstalments: number
  label: string
} {
  const lastInst  = lastTransaction?.instalment_number ?? 1
  const totalInst = lastTransaction?.total_instalments ?? 2
  const next      = lastInst + 1

  if (totalInst === 2) {
    return {
      paymentType:      'second_instalment',
      instalmentNumber: 2,
      totalInstalments: 2,
      label:            '2nd Instalment of 50-50 Plan',
    }
  }
  if (totalInst > 2) {
    return {
      paymentType:      'monthly_emi',
      instalmentNumber: next,
      totalInstalments: totalInst,
      label:            `EMI ${next} of ${totalInst}`,
    }
  }
  return {
    paymentType:      'balance_clearance',
    instalmentNumber: next,
    totalInstalments: totalInst,
    label:            'Balance Clearance',
  }
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // ── Fetch all active enrolments with balance_due > 0 ─────────────────────
  const { data: enrolmentsWithBalance } = await service
    .from('student_enrolments')
    .select('id, course_name, course_id, enrolment_type, amount_paid, balance_due, student_name, student_mobile')
    .eq('student_email', email.toLowerCase())
    .eq('is_active', true)
    .gt('balance_due', 0)
    .order('created_at', { ascending: false })

  // For each enrolment with balance, get the last payment_transaction for context
  const balanceEnrolments = await Promise.all(
    (enrolmentsWithBalance ?? []).map(async (e: any) => {
      const { data: lastTx } = await service
        .from('payment_transactions')
        .select('payment_type, instalment_number, total_instalments, amount_paid')
        .eq('enrolment_id', e.id)
        .order('instalment_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      return { ...e, lastTx }
    })
  )

  // ── Payment history (invoices + legacy) ───────────────────────────────────
  const { data: transactions } = await service
    .from('payment_transactions')
    .select('invoice_number, course_name, payment_type, instalment_number, total_instalments, amount_paid, payment_mode, payment_date, payment_reference, net_taxable, gst_amount, gst_mode, gst_pct, invoice_url, created_at')
    .eq('student_email', email.toLowerCase())
    .order('created_at', { ascending: false })

  const { data: legacyPayments } = await service
    .from('payments')
    .select('id, amount, payment_date, razorpay_payment_id, course')
    .eq('email', email)
    .order('payment_date', { ascending: false })

  const totalPaid = [
    ...(transactions ?? []).map(t => Number(t.amount_paid)),
    ...(legacyPayments ?? []).map(p => Number(p.amount)),
  ].reduce((a, b) => a + b, 0)

  const hasPaid   = (transactions ?? []).length > 0 || (legacyPayments ?? []).length > 0
  const hasBalance = balanceEnrolments.length > 0

  return (
    <div className="space-y-6 pb-12 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: T.navy }}>
          <CreditCard size={20} style={{ color: T.blue }} /> Payments
        </h1>
        {hasPaid && (
          <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
            Total paid: <span className="font-semibold" style={{ color: T.textPrimary }}>{formatINR(totalPaid)}</span>
          </p>
        )}
      </div>

      {/* ── Outstanding Balance Cards ─────────────────────────────────────── */}
      {hasBalance && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} style={{ color: T.amber }} />
            <h2 className="font-bold text-sm" style={{ color: T.amberDark }}>Outstanding Balance</h2>
          </div>

          {balanceEnrolments.map((e: any) => {
            const next = resolveNextPayment(e, e.lastTx)
            const balanceDue = Number(e.balance_due)

            return (
              <div key={e.id} className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${T.amberBorder}`, background: T.amberBg }}>

                {/* Header strip */}
                <div className="px-5 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: T.amberBorder, background: 'rgba(217,119,6,0.08)' }}>
                  <div>
                    <p className="font-bold text-sm" style={{ color: T.navy }}>{e.course_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: T.amber }}>{next.label}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-xl" style={{ color: T.amberDark }}>{formatINR(balanceDue)}</p>
                    <p className="text-xs" style={{ color: T.amber }}>balance due</p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-xs space-y-0.5" style={{ color: T.textSec }}>
                    <p>Already paid: <span className="font-semibold" style={{ color: T.textPrimary }}>{formatINR(Number(e.amount_paid))}</span></p>
                    <p>Total course fee: <span className="font-semibold" style={{ color: T.textPrimary }}>
                      {formatINR(Number(e.amount_paid) + balanceDue)}
                    </span></p>
                    <p style={{ color: T.textMuted }}>GST included · Invoice issued on payment</p>
                  </div>

                  {/* Razorpay payment button — client component */}
                  <BalancePaymentButton
                    enrolmentId={e.id}
                    balanceDue={balanceDue}
                    courseName={e.course_name}
                    paymentType={next.paymentType}
                    instalmentNumber={next.instalmentNumber}
                    totalInstalments={next.totalInstalments}
                    studentName={e.student_name ?? ''}
                    studentEmail={email}
                    studentMobile={e.student_mobile ?? ''}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Course payments with invoices ─────────────────────────────────── */}
      {(transactions ?? []).length > 0 && (
        <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: T.border }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: T.borderLight, background: T.blueLight }}>
            <h2 className="font-bold text-sm" style={{ color: T.navy }}>Payment History</h2>
            <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>GST tax invoice available for each payment</p>
          </div>
          <div className="divide-y" style={{ borderColor: T.borderLight }}>
            {(transactions ?? []).map((t: any) => (
              <div key={t.invoice_number}
                className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
                    <CheckCircle size={16} style={{ color: T.green }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: T.textPrimary }}>{t.course_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                      {payTypeLabel(t.payment_type, t.instalment_number, t.total_instalments)}
                      {' · '}
                      {t.payment_date
                        ? new Date(t.payment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {t.payment_mode && ` · ${t.payment_mode.replace(/_/g, ' ')}`}
                    </p>
                    {t.payment_reference && (
                      <p className="text-xs font-mono mt-0.5" style={{ color: T.textMuted }}>{t.payment_reference}</p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                      Taxable ₹{Math.round(Number(t.net_taxable)).toLocaleString('en-IN')} + GST ₹{Math.round(Number(t.gst_amount)).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-black text-base" style={{ color: T.textPrimary }}>{formatINR(Number(t.amount_paid))}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}>
                      Paid
                    </span>
                  </div>
                  <a
                    href={`/dashboard/invoice/${t.invoice_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-sm"
                    style={{
                      background: T.blueLight, color: T.blue,
                      border: `1px solid ${T.bluePale}`,
                      textDecoration: 'none', whiteSpace: 'nowrap',
                    }}>
                    <FileText size={12} /> GST Invoice
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Legacy payments ───────────────────────────────────────────────── */}
      {(legacyPayments ?? []).length > 0 && (
        <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: T.border }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: T.borderLight, background: '#f8faff' }}>
            <h2 className="font-bold text-sm" style={{ color: T.navy }}>Previous Payments</h2>
            <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>Pre-platform payments — invoices not available</p>
          </div>
          <div className="divide-y" style={{ borderColor: T.borderLight }}>
            {(legacyPayments ?? []).map((p: any) => (
              <div key={p.id}
                className="px-5 py-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
                    <CreditCard size={16} style={{ color: T.blue }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: T.textPrimary }}>{p.course ?? 'AI Course Payment'}</p>
                    {p.payment_date && (
                      <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
                        {new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {p.razorpay_payment_id && (
                      <p className="text-xs font-mono mt-0.5" style={{ color: T.textMuted }}>{p.razorpay_payment_id}</p>
                    )}
                  </div>
                </div>
                <p className="font-black" style={{ color: T.textPrimary }}>{formatINR(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasPaid && !hasBalance && (
        <div className="rounded-2xl border py-20 text-center bg-white" style={{ borderColor: T.border }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
            <CreditCard size={26} style={{ color: T.bluePale }} />
          </div>
          <p className="font-semibold" style={{ color: T.textSec }}>No payment records</p>
          <p className="text-sm mt-1" style={{ color: T.textMuted }}>
            Your payment history and GST invoices will appear here after enrolment
          </p>
        </div>
      )}

    </div>
  )
}
