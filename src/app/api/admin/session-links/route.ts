import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data } = await service
    .from('admin_users')
    .select('id')
    .eq('email', user.email!)
    .eq('is_active', true)
    .maybeSingle()
  return data ? user : null
}

// GET /api/admin/session-links?batch_id=uuid
// Returns all saved awa_session_links rows for a given batch
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const batchId = new URL(req.url).searchParams.get('batch_id')
  if (!batchId) return NextResponse.json({ error: 'batch_id required' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('awa_session_links')
    .select('*')
    .eq('batch_id', batchId)
    .order('session_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data ?? [] })
}

// POST /api/admin/session-links
// Upserts one session link row (keyed on batch_id + session_number)
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const {
    batch_id, session_number,
    session_title, recording_link, study_material_link, meeting_link, notes,
  } = body

  if (!batch_id || !session_number) {
    return NextResponse.json({ error: 'batch_id and session_number are required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('awa_session_links')
    .upsert({
      batch_id,
      session_number:      Number(session_number),
      session_title:       session_title       || null,
      recording_link:      recording_link      || null,
      study_material_link: study_material_link || null,
      meeting_link:        meeting_link        || null,
      notes:               notes               || null,
    }, { onConflict: 'batch_id,session_number' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, link: data })
}
