import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyImpersonationToken } from '@/lib/impersonationToken'
import { cookies } from 'next/headers'

// GET /api/impersonate/student/start?t=<handoff token>
// Verifies the partner-admin handoff token, then mints a REAL student session
// (service-role magic-link → verifyOtp, no email sent) so the admin sees the
// exact full student experience. Sets a marker cookie for the banner.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin
  const token  = new URL(req.url).searchParams.get('t')
  const claim  = verifyImpersonationToken(token)
  if (!claim) return NextResponse.redirect(`${origin}/signin?error=impersonation_invalid`)

  const service = createServiceClient()

  // One-time magic link (no email sent) → exchange for a session.
  const { data: link, error: genErr } = await service.auth.admin.generateLink({
    type: 'magiclink', email: claim.studentEmail,
  })
  if (genErr || !link?.properties?.hashed_token) {
    return NextResponse.redirect(`${origin}/signin?error=impersonation_user&detail=${encodeURIComponent(genErr?.message || 'no token')}`)
  }

  const supabase = await createClient()
  const { error: vErr } = await supabase.auth.verifyOtp({
    type: 'email', token_hash: link.properties.hashed_token,
  })
  if (vErr) {
    return NextResponse.redirect(`${origin}/signin?error=impersonation_verify&detail=${encodeURIComponent(vErr.message)}`)
  }

  // Marker cookie (server-read) so the dashboard shows the impersonation banner.
  const jar = await cookies()
  jar.set('ostaran_impersonation', JSON.stringify({ studentEmail: claim.studentEmail, adminEmail: claim.adminEmail }), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 2,
  })

  return NextResponse.redirect(`${origin}/dashboard`)
}
