import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/community/upvote
// Body: { message_id, member_id }
// Toggles upvote. Awards +1 point to message author on upvote.
export async function POST(req: NextRequest) {
  try {
    const { message_id, member_id } = await req.json()
    if (!message_id || !member_id) return NextResponse.json({ error: 'message_id and member_id required' }, { status: 400 })

    const supabase = db()

    // Verify member
    const { data: member } = await supabase
      .from('community_members')
      .select('id, is_banned, expires_at')
      .eq('id', member_id)
      .single()

    if (!member || member.is_banned) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
    if (member.expires_at && new Date(member.expires_at) < new Date()) return NextResponse.json({ expired: true })

    // Check existing upvote
    const { data: existing } = await supabase
      .from('community_upvotes')
      .select('id')
      .eq('message_id', message_id)
      .eq('member_id', member_id)
      .maybeSingle()

    if (existing) {
      // Toggle off — remove upvote
      await supabase.from('community_upvotes').delete().eq('id', existing.id)
      await supabase.from('community_messages').update({ upvote_count: supabase.rpc as any }).eq('id', message_id)
      // Decrement manually
      const { data: msg } = await supabase.from('community_messages').select('upvote_count, member_id').eq('id', message_id).single()
      if (msg) {
        const newCount = Math.max(0, (msg.upvote_count ?? 0) - 1)
        await supabase.from('community_messages').update({ upvote_count: newCount }).eq('id', message_id)
        // Deduct point from author
        if (msg.member_id && msg.member_id !== member_id) {
          await supabase.rpc('community_award_points', {
            p_member_id: msg.member_id,
            p_action: 'upvote_received',
            p_points: -1,
            p_ref_id: message_id,
          })
        }
      }
      return NextResponse.json({ upvoted: false })
    } else {
      // Add upvote
      await supabase.from('community_upvotes').insert({ message_id, member_id })
      const { data: msg } = await supabase.from('community_messages').select('upvote_count, member_id').eq('id', message_id).single()
      if (msg) {
        const newCount = (msg.upvote_count ?? 0) + 1
        await supabase.from('community_messages').update({ upvote_count: newCount }).eq('id', message_id)
        // Award +1 to author (not to self)
        if (msg.member_id && msg.member_id !== member_id) {
          await supabase.rpc('community_award_points', {
            p_member_id: msg.member_id,
            p_action: 'upvote_received',
            p_points: 1,
            p_ref_id: message_id,
          })
        }
      }
      return NextResponse.json({ upvoted: true })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
