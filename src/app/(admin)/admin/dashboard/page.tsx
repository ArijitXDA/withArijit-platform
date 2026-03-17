import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CreditCard, Mail, AlertCircle } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = createServiceClient()

  const [
    { count: studentCount },
    { count: paymentCount },
    { data: emailHealth },
  ] = await Promise.all([
    (supabase as any).from('student_master_table').select('*', { count: 'exact', head: true }),
    (supabase as any).from('payments').select('*', { count: 'exact', head: true }).eq('status', 'captured'),
    (supabase as any).from('email_queue').select('status').in('status', ['pending', 'failed']),
  ])

  const pendingEmails = (emailHealth ?? []).filter((e: any) => e.status === 'pending').length
  const failedEmails = (emailHealth ?? []).filter((e: any) => e.status === 'failed').length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2"><Users size={14} /> Students</CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{studentCount ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2"><CreditCard size={14} /> Payments</CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{paymentCount ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2"><Mail size={14} /> Email Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingEmails}</p>
            {failedEmails > 0 && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1"><AlertCircle size={12} /> {failedEmails} failed</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold text-green-600">Operational</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
