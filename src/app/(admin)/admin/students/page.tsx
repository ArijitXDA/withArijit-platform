import { createServiceClient } from '@/lib/supabase/service'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function AdminStudentsPage() {
  const supabase = createServiceClient()
  const { data: students } = await (supabase as any)
    .from('student_master_table')
    .select('*')
    .order('enrollment_date', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Students</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Enrolled</TableHead>
            <TableHead>Amount Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(students ?? []).map((s: any) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name ?? '—'}</TableCell>
              <TableCell>{s.email ?? '—'}</TableCell>
              <TableCell>{s.mobile ?? '—'}</TableCell>
              <TableCell>{s.course_name ?? '—'}</TableCell>
              <TableCell>{s.enrollment_date ? formatDate(s.enrollment_date) : '—'}</TableCell>
              <TableCell>{s.total_amount_paid != null ? formatCurrency(s.total_amount_paid) : '—'}</TableCell>
            </TableRow>
          ))}
          {(students ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500 py-8">No students found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
