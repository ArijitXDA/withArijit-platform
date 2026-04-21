import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// ────────────────────────────────────────────────────────────────────────────
// POST /api/resume/link
// ────────────────────────────────────────────────────────────────────────────
// Called from the signup page right after OTP verification (or Google OAuth
// callback) if the user arrived via the resume flow with a ?resume_token=.
//
// Flow:
//   1. Require an authenticated user (Supabase session cookie)
//   2. Look up the submission by token
//   3. Verify the email on the submission matches the authenticated user's
//      email OR the submission is still unclaimed (user_id IS NULL)
//   4. Update submission with user_id + status='signed_up'
//   5. Kick off the resume-parser edge function (fire-and-forget)
//   6. Log the event
// ────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const NEWS_BOT_SECRET = process.env.NEWS_BOT_SECRET ?? ''

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  // Accept either 'token' or 'submission_token' for backwards compatibility
  const token = (typeof body.token === 'string' && body.token)
    || (typeof body.submission_token === 'string' && body.submission_token)
    || null
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const service = createServiceClient()

  // Look up submission
  const { data: submission, error: lookupErr } = await service
    .from('resume_submissions')
    .select('id, email, user_id, status, parse_status, resume_file_url, resume_text_pasted')
    .eq('submission_token', token)
    .maybeSingle()

  if (lookupErr || !submission) {
    return NextResponse.json({ error: 'Submission not found or token expired' }, { status: 404 })
  }

  // Prevent hijacking: the authenticated user's email must match the
  // submission's email (unless the submission is unclaimed and the email
  // matches closely enough — we use exact match for safety).
  const userEmail = user.email.toLowerCase()
  const submissionEmail = submission.email.toLowerCase()

  if (submissionEmail !== userEmail) {
    return NextResponse.json({
      error: 'This submission belongs to a different email address. Please sign up with the email you used on the form.',
    }, { status: 403 })
  }

  // If already linked to THIS user, idempotent no-op
  if (submission.user_id === user.id) {
    return NextResponse.json({ ok: true, already_linked: true, submission_id: submission.id })
  }

  // If linked to a different user, refuse
  if (submission.user_id && submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Submission already linked to a different account.' }, { status: 409 })
  }

  // Link + promote status
  const { error: updateErr } = await service
    .from('resume_submissions')
    .update({
      user_id: user.id,
      status: 'signed_up',
      verified_at: new Date().toISOString(),
      signed_up_at: new Date().toISOString(),
    })
    .eq('id', submission.id)

  if (updateErr) {
    console.error('[resume/link] update failed:', updateErr)
    return NextResponse.json({ error: 'Failed to link submission' }, { status: 500 })
  }

  // Log event
  void service.from('resume_events').insert({
    submission_id: submission.id,
    email: userEmail,
    user_id: user.id,
    event_type: 'signup_complete',
  })

  // Kick off resume parser (fire-and-forget; runs async in edge function)
  // Only trigger if we actually have resume content to parse
  const hasContent = submission.resume_file_url || submission.resume_text_pasted
  if (hasContent && submission.parse_status === 'pending' && NEWS_BOT_SECRET) {
    void fetch(`${SUPABASE_URL}/functions/v1/resume-parser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEWS_BOT_SECRET}`,
      },
      body: JSON.stringify({ submission_id: submission.id }),
    }).catch((e) => {
      console.error('[resume/link] failed to kick off parser:', e)
    })
  }

  return NextResponse.json({
    ok: true,
    submission_id: submission.id,
    parse_kicked_off: hasContent,
  })
}
