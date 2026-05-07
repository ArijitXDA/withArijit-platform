import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromToken, canAccess } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/lifecycle/toggle-sequence
 *
 * Body: { sequence_key: string, target_state: boolean }
 *
 * Flips lifecycle_sequences.is_active for the named sequence.
 * Restricted to admins with lifecycle-status access (super_admin / dev_admin).
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken()
  if (!canAccess(admin, 'lifecycle-status')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const sequenceKey: unknown = body?.sequence_key
  const targetState: boolean = body?.target_state === true

  if (typeof sequenceKey !== 'string' || sequenceKey.length === 0 || sequenceKey.length > 100) {
    return NextResponse.json({ error: 'invalid sequence_key' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('lifecycle_sequences')
    .update({ is_active: targetState })
    .eq('sequence_key', sequenceKey)
    .select('sequence_key, is_active')
    .maybeSingle()

  if (error) {
    console.error('[toggle-sequence]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'sequence not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    sequence_key: data.sequence_key,
    is_active: data.is_active,
    actor: admin?.email ?? null,
  })
}
