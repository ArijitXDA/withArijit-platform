import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getRecordingDownloadUrl } from '@/lib/msGraph'

// GET /api/student/recording/<batchId>/<n>
// Enrolment-gated recording source for the in-page player. Verifies the student
// is actively enrolled in the batch, then returns a SHORT-LIVED playback URL —
// the permanent SharePoint URL is never sent to the client. Prefers the private
// OneDrive item (Graph download URL); falls back to any pasted public link.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ batchId: string; n: string }> }) {
  const { batchId, n } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })

  const service = createServiceClient()

  // Enrolment check — the student must be actively enrolled in THIS batch.
  const { data: enrolment } = await service
    .from('student_enrolments')
    .select('id')
    .eq('student_email', user.email)
    .eq('batch_id', batchId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (!enrolment) return NextResponse.json({ error: 'You are not enrolled in this batch' }, { status: 403 })

  const { data: link } = await service
    .from('awa_session_links')
    .select('recording_item_id, recording_drive_id, recording_link')
    .eq('batch_id', batchId)
    .eq('session_number', Number(n))
    .maybeSingle()
  if (!link) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Private item (URL hidden) → short-lived Graph download URL.
  if (link.recording_item_id && link.recording_drive_id) {
    try {
      const url = await getRecordingDownloadUrl(link.recording_drive_id, link.recording_item_id)
      if (url) return NextResponse.json({ url })
    } catch (e: any) {
      return NextResponse.json({ error: `Could not load recording: ${e.message}` }, { status: 502 })
    }
  }
  // Fallback: a link an admin pasted manually (not URL-hidden, but still gated here).
  if (link.recording_link) return NextResponse.json({ url: link.recording_link })

  return NextResponse.json({ error: 'Recording not available yet' }, { status: 404 })
}
