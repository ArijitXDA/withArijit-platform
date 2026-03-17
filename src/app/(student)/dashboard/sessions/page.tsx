import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Video } from 'lucide-react'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: student } = await (supabase as any).from('users').select('batch_id').eq('email', user.email).single()

  const { data: sessions } = await (supabase as any)
    .from('session_master_table')
    .select('*')
    .eq('batch_id', student?.batch_id ?? '')
    .order('session_date', { ascending: false })

  const today = new Date().toISOString().split('T')[0]
  const upcoming = (sessions ?? []).filter((s: any) => s.session_date >= today)
  const past = (sessions ?? []).filter((s: any) => s.session_date < today)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Sessions</h1>

      {upcoming.length > 0 && (
        <div>
          <h2 className="font-semibold mb-4 text-gray-700">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-4 border rounded-xl bg-indigo-50 border-indigo-100">
                <div>
                  <p className="font-semibold">{s.session_title}</p>
                  <p className="text-sm text-gray-500">{formatDate(s.session_date)}{s.session_time ? ` at ${formatTime(s.session_time)}` : ''}</p>
                </div>
                {s.session_link && (
                  <a href={s.session_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-indigo-600 hover:underline">
                    Join <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="font-semibold mb-4 text-gray-700">Past Sessions</h2>
          <div className="space-y-3">
            {past.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <p className="font-medium">{s.session_title}</p>
                  <p className="text-sm text-gray-500">{formatDate(s.session_date)}</p>
                </div>
                {s.recording_link ? (
                  <a href={s.recording_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600">
                    <Video size={14} /> Recording
                  </a>
                ) : (
                  <Badge variant="secondary">Processing</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(!sessions || sessions.length === 0) && (
        <p className="text-gray-500">No sessions found for your batch yet.</p>
      )}
    </div>
  )
}
