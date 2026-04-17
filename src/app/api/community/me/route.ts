import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/community/me?member_id=xxx
// Returns fresh points/rank/badges for a member — used to sync localStorage on load
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('member_id')
  if (!id) return NextResponse.json({ error: 'member_id required' }, { status: 400 })

  const { data, error } = await db()
    .from('community_members')
    .select('id, display_name, tier, expires_at, points, rank, badges, is_banned')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (data.is_banned) return NextResponse.json({ error: 'Banned' }, { status: 403 })
  if (data.expires_at && new Date(data.expires_at) < new Date())
    return NextResponse.json({ expired: true }, { status: 200 })

  return NextResponse.json({ member: data })
}
