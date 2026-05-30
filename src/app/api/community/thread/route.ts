import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/community/thread?id=<threadId>
// Resolves a single thread (id, title, channel_id, created_by, is_question)
// so a ?thread=<id> deep link can open it directly in the right channel.
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await admin()
    .from('community_threads')
    .select('id, title, channel_id, created_by, is_question')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ thread: null }, { status: 404 })
  return NextResponse.json({ thread: data })
}
