import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const ARI_EVERY_N  = 3

// GET /api/community/messages?thread_id=xxx&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const thread_id  = searchParams.get('thread_id')
  const limit      = Math.min(Number(searchParams.get('limit') ?? 60), 100)
  const member_id  = searchParams.get('member_id') // optional — to get caller's upvotes

  if (!thread_id) return NextResponse.json({ error: 'thread_id required' }, { status: 400 })

  const db = admin()
  const { data, error } = await db
    .from('community_messages')
    .select(`
      id, content, is_ask_ari, created_at, upvote_count, is_best_answer,
      member:community_members!community_messages_member_id_fkey(id, display_name, tier, points, rank)
    `)
    .eq('thread_id', thread_id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch caller's upvotes for these messages
  let myUpvotes: Set<string> = new Set()
  if (member_id && data?.length) {
    const ids = data.map(m => m.id)
    const { data: uvData } = await db
      .from('community_upvotes')
      .select('message_id')
      .eq('member_id', member_id)
      .in('message_id', ids)
    myUpvotes = new Set((uvData ?? []).map((u: any) => u.message_id))
  }

  const messages = (data ?? []).map(m => ({ ...m, my_upvote: myUpvotes.has(m.id) }))
  return NextResponse.json({ messages })
}

// POST /api/community/messages
export async function POST(req: NextRequest) {
  try {
    const { thread_id, member_id, content } = await req.json()
    if (!thread_id || !member_id || !content?.trim())
      return NextResponse.json({ error: 'thread_id, member_id, content required' }, { status: 400 })
    if (content.length > 2000)
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })

    const db = admin()

    const { data: member } = await db
      .from('community_members')
      .select('id, is_banned, expires_at, message_count')
      .eq('id', member_id)
      .single()

    if (!member || member.is_banned) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
    if (member.expires_at && new Date(member.expires_at) < new Date())
      return NextResponse.json({ expired: true }, { status: 200 })

    const { data: msg, error: msgErr } = await db
      .from('community_messages')
      .insert({ thread_id, member_id, content: content.trim() })
      .select('id, content, created_at')
      .single()

    if (msgErr) throw msgErr

    const newCount = (member.message_count ?? 0) + 1
    await db.from('community_members')
      .update({ message_count: newCount, last_seen_at: new Date().toISOString() })
      .eq('id', member_id)

    // Award +10 points for answering
    await db.rpc('community_award_points', {
      p_member_id: member_id,
      p_action: 'answer',
      p_points: 10,
      p_ref_id: msg.id,
    })

    // Ask Ari trigger
    const mentionsAri = content.toLowerCase().includes('@askari') || content.toLowerCase().includes('@ask ari')
    const shouldAriReply = mentionsAri || (newCount % ARI_EVERY_N === 0)
    if (shouldAriReply) {
      fetch(`${SUPABASE_URL}/functions/v1/community-ask-ari`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ trigger_message_id: msg.id, is_proactive: false }),
      }).catch(console.error)
    }

    return NextResponse.json({ message: msg })
  } catch (err: any) {
    console.error('[community/messages]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
