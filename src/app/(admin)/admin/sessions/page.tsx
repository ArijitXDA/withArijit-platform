import { createServiceClient } from '@/lib/supabase/service'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'

export default async function AdminSessionsPage() {
  const supabase = createServiceClient()
  const { data: sessions } = await (supabase as any)
    .from('session_master_table')
    .select('*')
    .order('session_date', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-500 cursor-not-allowed opacity-60">
          + Add Session
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session Title</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Batch ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(sessions ?? []).map((s: any) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.session_title ?? '—'}</TableCell>
              <TableCell>{s.session_date ? formatDate(s.session_date) : '—'}</TableCell>
              <TableCell>{s.session_time ?? '—'}</TableCell>
              <TableCell>{s.batch_id ?? '—'}</TableCell>
            </TableRow>
          ))}
          {(sessions ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500 py-8">No sessions found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
