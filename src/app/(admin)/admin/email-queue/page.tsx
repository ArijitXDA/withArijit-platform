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
import { formatDateTime } from '@/lib/utils'

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'sent': return 'default'
    case 'failed': return 'destructive'
    case 'pending': return 'secondary'
    default: return 'outline'
  }
}

export default async function AdminEmailQueuePage() {
  const supabase = createServiceClient()
  const { data: emails } = await (supabase as any)
    .from('email_queue')
    .select('*')
    .order('scheduled_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Email Queue</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recipient</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scheduled At</TableHead>
            <TableHead>Retries</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(emails ?? []).map((email: any) => (
            <TableRow
              key={email.id}
              className={email.status === 'failed' ? 'bg-red-50 hover:bg-red-100' : undefined}
            >
              <TableCell>{email.recipient_email ?? '—'}</TableCell>
              <TableCell>{email.template_name ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(email.status)}>
                  {email.status ?? '—'}
                </Badge>
              </TableCell>
              <TableCell>{email.scheduled_at ? formatDateTime(email.scheduled_at) : '—'}</TableCell>
              <TableCell>{email.retry_count ?? 0}</TableCell>
            </TableRow>
          ))}
          {(emails ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500 py-8">Email queue is empty.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
