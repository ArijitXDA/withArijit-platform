import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// POST /api/revalidate  { secret, paths: ['/courses', '/courses/<slug>'] }
// Called by the partner app (dev-admin publish) to refresh ISR pages immediately.
// Secret = the shared cross-app secret (both apps have it server-side).
const SECRET = process.env.IMPERSONATION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: NextRequest) {
  const { secret, paths } = await req.json().catch(() => ({}))
  if (!SECRET || secret !== SECRET) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const list: string[] = Array.isArray(paths) && paths.length ? paths.slice(0, 20) : ['/courses']
  for (const p of list) { try { revalidatePath(p) } catch {} }
  return NextResponse.json({ ok: true, revalidated: list })
}
