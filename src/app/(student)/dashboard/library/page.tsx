import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Library, FileText, Video, ExternalLink, BookOpen } from 'lucide-react'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()

  // Get student's batch_id from legacy users table
  const { data: legacyUser } = await service
    .from('users')
    .select('batch_id, course_name')
    .eq('email', user.email!)
    .maybeSingle()

  // Fetch all sessions with study materials for this batch
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

  // Also get sessions with recordings
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

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Library size={22} className="text-indigo-400" /> Study Library
        </h1>
        <p className="text-gray-500 text-sm mt-1">All your study materials and session recordings in one place</p>
      </div>

      {/* Study Materials */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-white font-bold flex items-center gap-2">
            <FileText size={16} className="text-blue-400" /> Study Materials & Slides
          </h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {materials.length > 0 ? materials.map(m => (
            <div key={m.session_id} className="px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(59,130,246,0.1)' }}>
                  <FileText size={14} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{m.session_title ?? `Session ${m.session_id} Materials`}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(m.session_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <a href={m.study_material_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold">
                Open <ExternalLink size={12} />
              </a>
            </div>
          )) : (
            <div className="px-6 py-10 text-center">
              <FileText size={28} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Study materials will appear here after each session</p>
            </div>
          )}
        </div>
      </div>

      {/* Session Recordings */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-white font-bold flex items-center gap-2">
            <Video size={16} className="text-purple-400" /> Session Recordings
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">Recordings are uploaded within 24–48 hours of each live session</p>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {recordings.length > 0 ? recordings.map(r => (
            <div key={r.session_id} className="px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <Video size={14} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{r.session_title ?? `Session Recording — ${r.session_id}`}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(r.session_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <a href={r.session_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold">
                Watch <ExternalLink size={12} />
              </a>
            </div>
          )) : (
            <div className="px-6 py-10 text-center">
              <Video size={28} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Recordings will appear here after each live session</p>
            </div>
          )}
        </div>
      </div>

      {/* External resources */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-white font-bold flex items-center gap-2">
            <BookOpen size={16} className="text-green-400" /> Staran&apos;s eBook Library
          </h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-gray-400 text-sm mb-4">
            Access Arijit&apos;s curated collection of AI eBooks, guides, and resources — free for all enrolled students.
          </p>
          <a href="https://www.aiwitharijit.com/library" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
            <BookOpen size={14} /> Open eBook Library →
          </a>
        </div>
      </div>
    </div>
  )
}
