import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: payments } = await (supabase as any)
    .from('payments')
    .select('*')
    .eq('email', user.email)
    .order('payment_date', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payment History</h1>

      {(payments ?? []).length === 0 ? (
        <p className="text-gray-500">No payment records found.</p>
      ) : (
        <div className="space-y-3">
          {(payments ?? []).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-4 border rounded-xl">
              <div>
                <p className="font-medium">{formatCurrency(p.amount)}</p>
                <p className="text-sm text-gray-500">{p.payment_date ? formatDate(p.payment_date) : '—'}</p>
                {p.razorpay_payment_id && (
                  <p className="text-xs text-gray-400 font-mono mt-1">{p.razorpay_payment_id}</p>
                )}
              </div>
              <Badge variant={p.status === 'captured' ? 'default' : 'secondary'}>
                {p.status ?? 'Unknown'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
