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

export default async function AdminSessionLinksPage() {
  const supabase = createServiceClient()

  let items: any[] = []
  let tableExists = true

  try {
    const { data, error } = await (supabase as any)
      .from('batch_session_links')
      .select('*')
      .order('session_date', { ascending: false })
      .limit(100)

    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      tableExists = false
    } else {
      items = data ?? []
    }
  } catch {
    tableExists = false
  }

  if (!tableExists) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Session Links</h1>
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">Session links table is not yet set up.</p>
          <p className="text-sm text-gray-400 mt-1">This feature will be available once the <code className="font-mono">batch_session_links</code> table is created.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Session Links</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch ID</TableHead>
            <TableHead>Session Date</TableHead>
            <TableHead>Link URL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item: any) => (
            <TableRow key={item.id ?? `${item.batch_id}-${item.session_date}`}>
              <TableCell>{item.batch_id ?? '—'}</TableCell>
              <TableCell>{item.session_date ? formatDate(item.session_date) : '—'}</TableCell>
              <TableCell>
                {item.link_url ? (
                  <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate max-w-xs block">
                    {item.link_url}
                  </a>
                ) : '—'}
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-gray-500 py-8">No session links found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
