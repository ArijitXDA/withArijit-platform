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
import { formatCurrency } from '@/lib/utils'

export default async function AdminCoursesPage() {
  const supabase = createServiceClient()
  const { data: courses } = await (supabase as any)
    .from('awa_courses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Courses</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>MRP</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(courses ?? []).map((course: any) => (
            <TableRow key={course.id}>
              <TableCell className="font-medium">{course.name ?? '—'}</TableCell>
              <TableCell className="font-mono text-xs text-gray-500">{course.slug ?? '—'}</TableCell>
              <TableCell>{course.mrp != null ? formatCurrency(course.mrp) : '—'}</TableCell>
              <TableCell>
                <Badge variant={course.is_active ? 'default' : 'secondary'}>
                  {course.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {(courses ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500 py-8">No courses found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
