import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET /api/impersonate/student/exit
// Ends an impersonation session: signs out of the (impersonated) student session
// and clears the marker cookie.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin
  const supabase = await createClient()
  try { await supabase.auth.signOut() } catch {}
  const jar = await cookies()
  jar.delete('ostaran_impersonation')
  return NextResponse.redirect(`${origin}/signin?impersonation=ended`)
}
