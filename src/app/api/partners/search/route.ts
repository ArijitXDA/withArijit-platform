import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/partners/search?q=... — powers the "who referred you?" picker shown to a first-time app
// installer during onboarding.
//
// Deliberately narrow, because this is the only place partner identities are exposed to students:
//   * sign-in required — never public
//   * minimum viable payload: partner_code + first name + last initial. Enough to recognise the
//     person who referred you, not enough to harvest a partner directory. No email, no mobile, no
//     city, no earnings.
//   * a query is REQUIRED and must be >= 2 chars, so the endpoint cannot be used to page through
//     every partner
//   * suspended/inactive partners are excluded — they must not receive new referrals
//   * hard cap of 8 results

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_RESULTS = 8

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ partners: [] })

  // Escape LIKE metacharacters: an unescaped '%' would match every partner and turn this into the
  // directory dump the length check is there to prevent.
  const safe = q.replace(/[\\%_]/g, (m) => '\\' + m)

  const svc = createServiceClient()
  const { data } = await svc
    .from('partners')
    .select('partner_code, full_name, status')
    .or(`partner_code.ilike.%${safe}%,full_name.ilike.%${safe}%`)
    .limit(MAX_RESULTS * 3) // over-fetch, then filter status in code

  const partners = (data ?? [])
    .filter((p: any) => p.status !== 'suspended' && p.status !== 'inactive')
    .slice(0, MAX_RESULTS)
    .map((p: any) => {
      const parts = String(p.full_name || '').trim().split(/\s+/)
      const display = parts.length > 1
        ? `${parts[0]} ${parts[parts.length - 1][0]}.`
        : (parts[0] || 'Partner')
      return { partner_code: p.partner_code, display_name: display }
    })

  return NextResponse.json({ partners })
}
