import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/community/best-answer
// Body: { thread_id, message_id, member_id }
// Only the thread creator can mark best answer. Awards +50 to message author.
export async function POST(req: NextRequest) {
  try {
    const { thread_id, message_id, member_id } = await req.json()
    if (!thread_id || !message_id || !member_id)
      return NextResponse.json({ error: 'thread_id, message_id, member_id required' }, { status: 400 })

    const supabase = db()

    // Verify the caller is the thread creator
    const { data: thread } = await supabase
      .from('community_threads')
      .select('id, created_by, best_answer_id')
      .eq('id', thread_id)
      .single()

    if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    if (thread.created_by !== member_id) return NextResponse.json({ error: 'Only the question author can mark best answer' }, { status: 403 })

    // Clear previous best answer (if any)
    if (thread.best_answer_id) {
      await supabase.from('community_messages').update({ is_best_answer: false }).eq('id', thread.best_answer_id)
    }

    // Mark new best answer
    await supabase.from('community_messages').update({ is_best_answer: true }).eq('id', message_id)
    await supabase.from('community_threads').update({ best_answer_id: message_id }).eq('id', thread_id)

    // Award +50 to the author of the best answer
    const { data: msg } = await supabase.from('community_messages').select('member_id').eq('id', message_id).single()
    if (msg?.member_id && msg.member_id !== member_id) {
      await supabase.rpc('community_award_points', {
        p_member_id: msg.member_id,
        p_action: 'best_answer',
        p_points: 50,
        p_ref_id: message_id,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
