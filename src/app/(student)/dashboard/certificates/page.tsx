import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Award, Download, ExternalLink } from 'lucide-react'

const T = {
  surface: '#ffffff', border: '#dce6f5', borderLight: '#e8f0fc',
  navy: '#0f1f3d', blue: '#2563eb', blueLight: '#eff6ff', bluePale: '#dbeafe',
  textPrimary: '#0f1f3d', textSec: '#475569', textMuted: '#94a3b8',
  amber: '#b45309', amberBg: '#fffbeb', amberBorder: '#fde68a',
}

export default async function CertificatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()

  const { data: certs } = await service
    .from('certificates')
    .select('id, certificate_name, date_of_issuing, certificate_image_link')
    .eq('user_email', user.email!)
    .eq('is_active', true)
    .order('date_of_issuing', { ascending: false })

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: T.navy }}>
          <Award size={20} style={{ color: T.amber }} /> Certificates
        </h1>
        <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
          {(certs ?? []).length} certificate{(certs ?? []).length !== 1 ? 's' : ''} earned
        </p>
      </div>

      {(certs ?? []).length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {(certs ?? []).map((c: any) => (
            <div key={c.id} className="rounded-2xl border overflow-hidden bg-white"
              style={{ borderColor: T.border }}>
              <div className="px-6 py-5 flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}` }}>
                  <Award size={26} style={{ color: T.amber }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base leading-tight" style={{ color: T.textPrimary }}>{c.certificate_name}</p>
                  {c.date_of_issuing && (
                    <p className="text-xs mt-1.5" style={{ color: T.textSec }}>
                      Issued: {new Date(c.date_of_issuing).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>withArijit × oStaran Edu Pvt Ltd</p>
                </div>
              </div>
              {c.certificate_image_link && (
                <div className="px-6 pb-5 flex items-center gap-2 border-t"
                  style={{ borderColor: T.borderLight }}>
                  <a href={c.certificate_image_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-sm"
                    style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}>
                    <ExternalLink size={12} /> View Certificate
                  </a>
                  <a href={c.certificate_image_link} download target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-blue-50"
                    style={{ background: T.blueLight, color: T.blue, border: `1px solid ${T.bluePale}` }}>
                    <Download size={12} /> Download
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border py-20 text-center bg-white" style={{ borderColor: T.border }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}` }}>
            <Award size={28} style={{ color: '#fcd34d' }} />
          </div>
          <p className="font-semibold" style={{ color: T.textSec }}>No certificates yet</p>
          <p className="text-sm mt-2 max-w-xs mx-auto" style={{ color: T.textMuted }}>
            Complete your AI certification course to earn your globally recognised certificate
          </p>
        </div>
      )}
    </div>
  )
}
