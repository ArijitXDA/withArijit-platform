import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const ASK_ARI_ID    = '00000000-0000-0000-0000-000000000001'
// Only trigger Ask Ari on every Nth message (to avoid spamming)
const ARI_EVERY_N   = 3

// GET /api/community/messages?thread_id=xxx&limit=50&before=<iso>
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const thread_id = searchParams.get('thread_id')
  const limit     = Math.min(Number(searchParams.get('limit') ?? 50), 100)
  const before    = searchParams.get('before')

  if (!thread_id) return NextResponse.json({ error: 'thread_id required' }, { status: 400 })

  const db = admin()
  let query = db
    .from('community_messages')
    .select(`
      id, content, is_ask_ari, created_at,
      member:community_members!community_messages_member_id_fkey(id, display_name, tier)
    `)
    .eq('thread_id', thread_id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}

// POST /api/community/messages
// Body: { thread_id, member_id, content }
export async function POST(req: NextRequest) {
  try {
    const { thread_id, member_id, content } = await req.json()
    if (!thread_id || !member_id || !content?.trim()) {
      return NextResponse.json({ error: 'thread_id, member_id, content required' }, { status: 400 })
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })
    }

    const db = admin()

    // Verify member
    const { data: member } = await db
      .from('community_members')
      .select('id, is_banned, expires_at, message_count, tier')
      .eq('id', member_id)
      .single()

    if (!member || member.is_banned) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
    }
    if (member.expires_at && new Date(member.expires_at) < new Date()) {
      return NextResponse.json({ expired: true }, { status: 200 })
    }

    // Insert message
    const { data: msg, error: msgErr } = await db
      .from('community_messages')
      .insert({ thread_id, member_id, content: content.trim() })
      .select('id, content, created_at')
      .single()

    if (msgErr) throw msgErr

    // Increment member message_count
    const newCount = (member.message_count ?? 0) + 1
    await db.from('community_members')
      .update({ message_count: newCount, last_seen_at: new Date().toISOString() })
      .eq('id', member_id)

    // Decide if Ask Ari should reply
    // Ari always replies to @AskAri mentions; otherwise every ARI_EVERY_N messages
    const mentionsAri = content.toLowerCase().includes('@askari') || content.toLowerCase().includes('@ask ari')
    const shouldAriReply = mentionsAri || (newCount % ARI_EVERY_N === 0)

    if (shouldAriReply) {
      // Fire-and-forget Edge Function call
      fetch(
        `${SUPABASE_URL}/functions/v1/community-ask-ari`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
          body: JSON.stringify({ trigger_message_id: msg.id, is_proactive: false }),
        }
      ).catch(console.error)
    }

    return NextResponse.json({ message: msg })
  } catch (err: any) {
    console.error('/api/community/messages POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
