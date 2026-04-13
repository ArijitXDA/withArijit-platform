import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/community/threads?channel_id=xxx&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const channel_id = searchParams.get('channel_id')
  const limit      = Math.min(Number(searchParams.get('limit') ?? 20), 50)

  if (!channel_id) return NextResponse.json({ error: 'channel_id required' }, { status: 400 })

  const db = admin()
  const { data, error } = await db
    .from('community_threads')
    .select(`
      id, title, is_pinned, reply_count, last_msg_at, created_at,
      creator:community_members!community_threads_created_by_fkey(display_name, tier)
    `)
    .eq('channel_id', channel_id)
    .eq('is_locked', false)
    .order('is_pinned', { ascending: false })
    .order('last_msg_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ threads: data })
}

// POST /api/community/threads
// Body: { channel_id, title, member_id }
export async function POST(req: NextRequest) {
  try {
    const { channel_id, title, member_id } = await req.json()
    if (!channel_id || !title?.trim() || !member_id) {
      return NextResponse.json({ error: 'channel_id, title, member_id required' }, { status: 400 })
    }

    const db = admin()

    // Verify member exists and is not banned/expired
    const { data: member } = await db
      .from('community_members')
      .select('id, is_banned, expires_at')
      .eq('id', member_id)
      .single()

    if (!member || member.is_banned) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
    }
    if (member.expires_at && new Date(member.expires_at) < new Date()) {
      return NextResponse.json({ expired: true }, { status: 200 })
    }

    const { data: thread, error } = await db
      .from('community_threads')
      .insert({ channel_id, title: title.trim(), created_by: member_id })
      .select('id, title, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ thread })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
