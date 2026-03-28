import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Award, Download, ExternalLink } from 'lucide-react'

export default async function CertificatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()

  // Correct column names: certificate_name, date_of_issuing, certificate_image_link
  const { data: certs } = await service
    .from('certificates')
    .select('id, certificate_name, date_of_issuing, certificate_image_link')
    .eq('user_email', user.email!)
    .eq('is_active', true)
    .order('date_of_issuing', { ascending: false })

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Award size={22} className="text-yellow-400" /> Certificates
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {(certs ?? []).length} certificate{(certs ?? []).length !== 1 ? 's' : ''} earned
        </p>
      </div>

      {(certs ?? []).length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {(certs ?? []).map((c: any) => (
            <div key={c.id} className="rounded-2xl border overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              {/* Certificate preview card */}
              <div className="px-6 py-5 flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <Award size={26} className="text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base leading-tight">{c.certificate_name}</p>
                  {c.date_of_issuing && (
                    <p className="text-gray-500 text-xs mt-1.5">
                      Issued: {new Date(c.date_of_issuing).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  )}
                  <p className="text-gray-600 text-xs mt-0.5">withArijit × oStaran Edu Pvt Ltd</p>
                </div>
              </div>
              {c.certificate_image_link && (
                <div className="px-6 pb-5 flex items-center gap-3">
                  <a href={c.certificate_image_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                    <ExternalLink size={12} /> View Certificate
                  </a>
                  <a href={c.certificate_image_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Download size={12} /> Download
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border py-20 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <Award size={28} className="text-yellow-700" />
          </div>
          <p className="text-gray-400 font-semibold">No certificates yet</p>
          <p className="text-gray-600 text-sm mt-2 max-w-xs mx-auto">
            Complete your AI certification course to earn your globally recognised certificate
          </p>
        </div>
      )}
    </div>
  )
}
