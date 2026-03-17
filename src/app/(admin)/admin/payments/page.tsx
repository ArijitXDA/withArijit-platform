import { createServiceClient } from '@/lib/supabase/service'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'captured': return 'default'
    case 'failed': return 'destructive'
    case 'pending': return 'secondary'
    default: return 'outline'
  }
}

export default async function AdminPaymentsPage() {
  const supabase = createServiceClient()
  const { data: payments } = await (supabase as any)
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Razorpay ID</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(payments ?? []).map((payment: any) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">
                {payment.amount != null ? formatCurrency(payment.amount) : '—'}
              </TableCell>
              <TableCell>{payment.payment_date ? formatDate(payment.payment_date) : '—'}</TableCell>
              <TableCell className="font-mono text-xs text-gray-500">{payment.razorpay_payment_id ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(payment.status)}>
                  {payment.status ?? '—'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {(payments ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500 py-8">No payments found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
