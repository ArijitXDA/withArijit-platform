import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createServiceClient } from '@/lib/supabase/service'

// ─────────────────────────────────────────────────────────────────────────
// /auth/callback — OAuth return URL (Google, etc.)
//
// 1. Exchange auth code for session
// 2. If `next` contains a resume_token, link the pending resume_submission
//    to the authenticated user before redirecting.
// 3. Redirect to `next` (with resume_token stripped so it doesn't linger
//    in the browser URL).
// ─────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextRaw = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=oauth_failed`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=oauth_failed`)
  }

  // ── Parse `next` to detect + strip resume_token ───────────────────────
  let nextClean = nextRaw
  let resumeToken: string | null = null
  try {
    // `next` is a relative path (e.g. /dashboard/profile?onboarding=true&resume_token=xxx)
    // Parse against origin to get searchParams safely.
    const nextUrl = new URL(nextRaw, origin)
    resumeToken = nextUrl.searchParams.get('resume_token')
    if (resumeToken) {
      nextUrl.searchParams.delete('resume_token')
      // Reconstruct relative URL
      nextClean = `${nextUrl.pathname}${nextUrl.search}`
    }
  } catch {
    // If parsing fails, fall through — don't block the redirect
  }

  // ── Link pending resume submission (best-effort, non-blocking) ────────
  if (resumeToken && session?.user?.email) {
    try {
      const service = createServiceClient()
      const { data: submission } = await service
        .from('resume_submissions')
        .select('id, email, user_id, status, parse_status, resume_file_url, resume_text_pasted')
        .eq('submission_token', resumeToken)
        .maybeSingle()

      if (submission && submission.email.toLowerCase() === session.user.email.toLowerCase()) {
        const now = new Date().toISOString()
        await service
          .from('resume_submissions')
          .update({
            user_id:       session.user.id,
            status:        'signed_up',
            verified_at:   submission.status === 'new' ? now : undefined,
            signed_up_at:  now,
          })
          .eq('id', submission.id)

        void service.from('resume_events').insert({
          submission_id: submission.id,
          email:         session.user.email,
          user_id:       session.user.id,
          event_type:    'signup_complete',
          metadata:      { via: 'oauth' },
        })

        // Trigger parser if pending
        const hasContent = !!submission.resume_file_url || !!submission.resume_text_pasted
        if (hasContent && submission.parse_status === 'pending') {
          const parserUrl    = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resume-parser`
          const parserSecret = process.env.NEWS_BOT_SECRET ?? ''
          fetch(parserUrl, {
            method:  'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${parserSecret}`,
            },
            body: JSON.stringify({ submission_id: submission.id }),
          }).catch(err => console.warn('[auth/callback] parser trigger failed:', err.message))
        }
      }
    } catch (e: any) {
      // Swallow linking errors — don't break signup
      console.warn('[auth/callback] resume link failed:', e?.message ?? e)
    }
  }

  return NextResponse.redirect(`${origin}${nextClean}`)
}
