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

export default async function AdminAiSpotsPage() {
  const supabase = createServiceClient()
  const { data: spots } = await (supabase as any)
    .from('aispot_master')
    .select('*')
    .order('city', { ascending: true })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI Spots</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(spots ?? []).map((spot: any) => (
            <TableRow key={spot.id}>
              <TableCell className="font-medium">{spot.name ?? '—'}</TableCell>
              <TableCell>{spot.city ?? '—'}</TableCell>
              <TableCell>{spot.state ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={spot.is_approved ? 'default' : 'secondary'}>
                  {spot.is_approved ? 'Approved' : 'Pending'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {(spots ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500 py-8">No AI spots found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
