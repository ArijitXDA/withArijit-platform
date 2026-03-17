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
import { formatDate } from '@/lib/utils'

export default async function AdminLibraryPage() {
  const supabase = createServiceClient()
  const { data: items } = await (supabase as any)
    .from('library_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Library</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(items ?? []).map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.title ?? '—'}</TableCell>
              <TableCell>{item.type ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={item.is_public ? 'default' : 'secondary'}>
                  {item.is_public ? 'Public' : 'Private'}
                </Badge>
              </TableCell>
              <TableCell>{item.created_at ? formatDate(item.created_at) : '—'}</TableCell>
            </TableRow>
          ))}
          {(items ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500 py-8">No library items found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
