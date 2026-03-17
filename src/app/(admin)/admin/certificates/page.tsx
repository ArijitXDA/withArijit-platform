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

export default async function AdminCertificatesPage() {
  const supabase = createServiceClient()
  const { data: certificates } = await (supabase as any)
    .from('certificates')
    .select('*')
    .order('issued_date', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Certificates</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User Email</TableHead>
            <TableHead>Course Name</TableHead>
            <TableHead>Issued Date</TableHead>
            <TableHead>Certificate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(certificates ?? []).map((cert: any) => (
            <TableRow key={cert.id}>
              <TableCell>{cert.user_email ?? '—'}</TableCell>
              <TableCell>{cert.course_name ?? '—'}</TableCell>
              <TableCell>{cert.issued_date ? formatDate(cert.issued_date) : '—'}</TableCell>
              <TableCell>
                {cert.certificate_url ? (
                  <a
                    href={cert.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline text-sm"
                  >
                    Download
                  </a>
                ) : '—'}
              </TableCell>
            </TableRow>
          ))}
          {(certificates ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500 py-8">No certificates found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
