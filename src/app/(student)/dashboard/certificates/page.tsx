import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Award, Download } from 'lucide-react'

export default async function CertificatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: certificates } = await (supabase as any)
    .from('certificates')
    .select('*')
    .eq('user_email', user.email)
    .order('issued_date', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Certificates</h1>

      {(certificates ?? []).length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Award size={48} className="mx-auto mb-4 opacity-30" />
          <p>No certificates issued yet. Complete your course to earn one.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {(certificates ?? []).map((cert: any) => (
            <div key={cert.id} className="p-6 border rounded-2xl flex items-start gap-4">
              <Award className="text-indigo-600 flex-shrink-0 mt-1" size={28} />
              <div className="flex-1">
                <p className="font-semibold">{cert.course_name}</p>
                <p className="text-sm text-gray-500">Issued: {cert.issued_date ? formatDate(cert.issued_date) : '—'}</p>
              </div>
              {cert.certificate_url && (
                <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                  <Download size={18} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
