import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, ExternalLink } from 'lucide-react'

const T = {
  navy: '#0f1f3d', blue: '#2563eb', blueLight: '#eff6ff', bluePale: '#dbeafe',
  border: '#dce6f5', borderLight: '#e8f0fc',
  textPrimary: '#0f1f3d', textSec: '#475569', textMuted: '#94a3b8',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBorder: '#ddd6fe',
}

export default async function CareerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  return (
    <div className="space-y-5 pb-12 max-w-2xl">
      <div>
        <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: T.navy }}>
          <Briefcase size={20} style={{ color: T.blue }} /> Career
        </h1>
        <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>AI job opportunities and career resources for oStaran students</p>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${T.border}` }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
              <Briefcase size={18} style={{ color: T.blue }} />
            </div>
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: T.textPrimary }}>AI Job Board</h3>
              <p className="text-sm mb-3" style={{ color: T.textSec }}>Explore AI roles from our hiring partner network.</p>
              <Link href="/find-ai-job"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
                style={{ background: T.blueLight, color: T.blue, border: `1px solid ${T.bluePale}` }}>
                Browse Jobs <ExternalLink size={11} />
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${T.border}` }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: T.purpleBg, border: `1px solid ${T.purpleBorder}` }}>
              <Briefcase size={18} style={{ color: T.purple }} />
            </div>
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: T.textPrimary }}>Resume Repository</h3>
              <p className="text-sm mb-2" style={{ color: T.textSec }}>Upload your resume to be discovered by hiring partners.</p>
              <p className="text-xs font-medium px-3 py-1.5 rounded-lg inline-block"
                style={{ background: T.purpleBg, color: T.purple, border: `1px solid ${T.purpleBorder}` }}>
                Coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
