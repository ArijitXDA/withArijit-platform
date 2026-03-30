import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Library, FileText, Video, ExternalLink, BookOpen } from 'lucide-react'

const T = {
  surface: '#ffffff', border: '#dce6f5', borderLight: '#e8f0fc', surfaceHov: '#f0f6ff',
  navy: '#0f1f3d', blue: '#2563eb', blueLight: '#eff6ff', bluePale: '#dbeafe',
  textPrimary: '#0f1f3d', textSec: '#475569', textMuted: '#94a3b8',
  green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#bbf7d0',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBorder: '#ddd6fe',
}

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()

  const { data: legacyUser } = await service
    .from('users').select('batch_id, course_name').eq('email', user.email!).maybeSingle()

  let materials: any[] = []
  if (legacyUser?.batch_id) {
    const { data: sessions } = await service
      .from('session_master_table')
      .select('session_id, session_title, session_date, session_link, study_material_link')
      .eq('batch_id', legacyUser.batch_id)
      .not('study_material_link', 'is', null)
      .order('session_date', { ascending: false })
    materials = sessions ?? []
  }

  let recordings: any[] = []
  if (legacyUser?.batch_id) {
    const today = new Date().toISOString().split('T')[0]
    const { data: pastSessions } = await service
      .from('session_master_table')
      .select('session_id, session_title, session_date, session_link')
      .eq('batch_id', legacyUser.batch_id)
      .lt('session_date', today)
      .not('session_link', 'is', null)
      .order('session_date', { ascending: false })
      .limit(20)
    recordings = pastSessions ?? []
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-5 pb-12 max-w-3xl">

      <div>
        <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: T.navy }}>
          <Library size={20} style={{ color: T.blue }} /> Study Library
        </h1>
        <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
          All your study materials and session recordings in one place
        </p>
      </div>

      {/* ── Study Materials ──────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderColor: T.borderLight, background: T.blueLight }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#dbeafe', border: `1px solid ${T.bluePale}` }}>
            <FileText size={13} style={{ color: T.blue }} />
          </div>
          <h2 className="font-bold text-sm" style={{ color: T.navy }}>Study Materials & Slides</h2>
        </div>
        <div className="divide-y" style={{ borderColor: T.borderLight }}>
          {materials.length > 0 ? materials.map(m => (
            <div key={m.session_id}
              className="px-5 py-3.5 flex items-center justify-between hover:bg-blue-50/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
                  <FileText size={13} style={{ color: T.blue }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: T.textPrimary }}>
                    {m.session_title ?? `Session ${m.session_id} Materials`}
                  </p>
                  <p className="text-xs" style={{ color: T.textMuted }}>{fmtDate(m.session_date)}</p>
                </div>
              </div>
              <a href={m.study_material_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: T.blue }}>
                Open <ExternalLink size={11} />
              </a>
            </div>
          )) : (
            <div className="px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: T.blueLight }}>
                <FileText size={20} style={{ color: T.bluePale }} />
              </div>
              <p className="text-sm font-medium" style={{ color: T.textSec }}>Study materials will appear here after each session</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Session Recordings ───────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: T.borderLight, background: T.purpleBg }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: T.purpleBorder, border: `1px solid ${T.purpleBorder}` }}>
              <Video size={13} style={{ color: T.purple }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: T.navy }}>Session Recordings</h2>
              <p className="text-xs" style={{ color: T.textMuted }}>Uploaded within 24–48 hours after each live session</p>
            </div>
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: T.borderLight }}>
          {recordings.length > 0 ? recordings.map(r => (
            <div key={r.session_id}
              className="px-5 py-3.5 flex items-center justify-between hover:bg-purple-50/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: T.purpleBg, border: `1px solid ${T.purpleBorder}` }}>
                  <Video size={13} style={{ color: T.purple }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: T.textPrimary }}>
                    {r.session_title ?? `Recording — Session ${r.session_id}`}
                  </p>
                  <p className="text-xs" style={{ color: T.textMuted }}>{fmtDate(r.session_date)}</p>
                </div>
              </div>
              <a href={r.session_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: T.purple }}>
                Watch <ExternalLink size={11} />
              </a>
            </div>
          )) : (
            <div className="px-5 py-10 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: T.purpleBg }}>
                <Video size={20} style={{ color: T.purpleBorder }} />
              </div>
              <p className="text-sm font-medium" style={{ color: T.textSec }}>Recordings will appear here after each live session</p>
            </div>
          )}
        </div>
      </div>

      {/* ── eBook Library ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderColor: T.borderLight, background: T.greenBg }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: T.greenBorder }}>
            <BookOpen size={13} style={{ color: T.green }} />
          </div>
          <h2 className="font-bold text-sm" style={{ color: T.navy }}>Staran's eBook Library</h2>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm mb-4" style={{ color: T.textSec }}>
            Access Arijit's curated collection of AI eBooks, guides, and resources — free for all enrolled students.
          </p>
          <a href="https://www.aiwitharijit.com/library" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: T.green }}>
            <BookOpen size={14} /> Open eBook Library →
          </a>
        </div>
      </div>

    </div>
  )
}
