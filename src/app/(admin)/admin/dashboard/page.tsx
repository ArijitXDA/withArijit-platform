import { createServiceClient } from '@/lib/supabase/service'
import { getAdminFromToken } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CreditCard, Mail, AlertCircle, ShieldOff } from 'lucide-react'

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>
}) {
  const admin = await getAdminFromToken()
  if (!admin) redirect('/admin')

  const sp = await searchParams
  const wasDenied = sp.denied === '1'

  const supabase = createServiceClient()

  const [
    { count: studentCount },
    { count: paymentCount },
    { data: emailHealth },
  ] = await Promise.all([
    (supabase as any).from('student_master_table').select('*', { count: 'exact', head: true }),
    (supabase as any).from('payments').select('*', { count: 'exact', head: true }),
    (supabase as any).from('email_queue').select('status').in('status', ['pending', 'failed']),
  ])

  const pendingEmails = (emailHealth ?? []).filter((e: any) => e.status === 'pending').length
  const failedEmails  = (emailHealth ?? []).filter((e: any) => e.status === 'failed').length

  // Role display info
  const roleLabels: Record<string, string> = {
    dev_admin:          'Developer · God Mode',
    super_admin:        'Super Administrator',
    channel_admin:      'Channel Administrator',
    root_partner_admin: 'Partner Administrator',
  }

  return (
    <div className="space-y-6">

      {/* Access-denied banner */}
      {wasDenied && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <ShieldOff size={16} className="shrink-0" />
          <p className="text-sm font-medium">
            You don't have permission to access that page. Contact a dev_admin if you need access.
          </p>
        </div>
      )}

      {/* Identity header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Signed in as <span className="font-medium text-gray-700">{admin.email}</span>
            {' · '}
            <span className="text-indigo-600 font-medium">{roleLabels[admin.role] ?? admin.role}</span>
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Users size={14} /> Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{studentCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <CreditCard size={14} /> Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{paymentCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Mail size={14} /> Email Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingEmails}</p>
            {failedEmails > 0 && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle size={12} /> {failedEmails} failed
              </p>
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
