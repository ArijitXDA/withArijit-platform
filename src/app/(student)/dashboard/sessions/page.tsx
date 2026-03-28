import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Calendar, Video, ExternalLink, Clock } from 'lucide-react'

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()

  const { data: legacyUser } = await service
    .from('users')
    .select('batch_id')
    .eq('email', user.email!)
    .maybeSingle()

  const today = new Date().toISOString().split('T')[0]

  let upcoming: any[] = []
  let past: any[] = []

  if (legacyUser?.batch_id) {
    const { data: all } = await service
      .from('session_master_table')
      .select('session_id, session_title, session_date, session_start_time, session_link, study_material_link')
      .eq('batch_id', legacyUser.batch_id)
      .order('session_date', { ascending: false })

    upcoming = (all ?? []).filter(s => s.session_date >= today).reverse()
    past     = (all ?? []).filter(s => s.session_date <  today)
  }

  const total = upcoming.length + past.length

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Sessions</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total · {upcoming.length} upcoming · {past.length} completed</p>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-white font-bold flex items-center gap-2">
              <Calendar size={16} className="text-green-400" /> Upcoming Sessions
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {upcoming.map(s => (
              <div key={s.session_id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <Calendar size={15} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{s.session_title ?? `Upcoming Session`}</p>
                    <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {fmt(s.session_date)}{s.session_start_time ? ` · ${fmtTime(s.session_start_time)} IST` : ''}
                    </p>
                  </div>
                </div>
                {s.session_link && (
                  <a href={s.session_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                    Join <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-white font-bold flex items-center gap-2">
            <Video size={16} className="text-purple-400" /> Past Sessions & Recordings
          </h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {past.length > 0 ? past.map(s => (
            <div key={s.session_id} className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <Video size={15} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{s.session_title ?? `Session`}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{fmt(s.session_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.session_link ? (
                  <a href={s.session_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <Video size={11} /> Recording
                  </a>
                ) : (
                  <span className="text-xs text-gray-600 px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    Processing…
                  </span>
                )}
                {s.study_material_link && (
                  <a href={s.study_material_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    Slides <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          )) : (
            <div className="px-5 py-10 text-center">
              <Video size={28} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Past sessions and recordings will appear here</p>
            </div>
          )}
        </div>
      </div>

      {total === 0 && (
        <div className="rounded-2xl border py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <Calendar size={36} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-semibold">No sessions yet</p>
          <p className="text-gray-600 text-sm mt-1">Sessions will appear here once your batch starts</p>
        </div>
      )}
    </div>
  )
}
