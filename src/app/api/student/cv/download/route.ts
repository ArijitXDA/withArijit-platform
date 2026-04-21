import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// ────────────────────────────────────────────────────────────────────────────
// GET /api/student/cv/download
//
// Authenticated CV download for the logged-in student.
// Looks up `student_profiles.cv_url` and returns a short-TTL signed URL.
//
// Query params:
//   ?redirect=1  → respond with a 302 redirect to the signed URL (useful for
//                   target="_blank" links). Default: return JSON.
//   ?disposition=attachment → force download rather than inline view
//
// Response (JSON mode):
//   { ok: true, url: string, expires_in: number, filename: string }
// ────────────────────────────────────────────────────────────────────────────

const BUCKET   = 'student-cvs'
const TTL_SECS = 15 * 60  // 15 min

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function extractStoragePath(cvUrl: string | null | undefined, bucket: string): string | null {
  if (!cvUrl) return null
  if (!cvUrl.startsWith('http')) return cvUrl
  const marker = `/${bucket}/`
  const idx = cvUrl.indexOf(marker)
  if (idx === -1) return null
  return cvUrl.slice(idx + marker.length).split('?')[0]
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const asRedirect   = searchParams.get('redirect') === '1'
  const asAttachment = searchParams.get('disposition') === 'attachment'

  const service = createServiceClient()

  const { data: profile } = await service
    .from('student_profiles')
    .select('cv_url, full_name')
    .eq('email', user.email)
    .maybeSingle()

  const storagePath = extractStoragePath(profile?.cv_url, BUCKET)
  if (!storagePath) {
    return NextResponse.json({ error: 'No CV on file' }, { status: 404 })
  }

  // Build a nice filename for download headers
  const ext = storagePath.split('.').pop() ?? 'pdf'
  const nameSlug = (profile?.full_name ?? user.email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'resume'
  const downloadName = `${nameSlug}-resume.${ext}`

  const signOptions: any = { download: asAttachment ? downloadName : false }

  const { data: signed, error } = await service
    .storage
    .from(BUCKET)
    .createSignedUrl(storagePath, TTL_SECS, signOptions)

  if (error || !signed?.signedUrl) {
    console.error('[cv/download] sign failed:', error)
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
  }

  if (asRedirect) {
    return NextResponse.redirect(signed.signedUrl, 302)
  }

  return NextResponse.json({
    ok:         true,
    url:        signed.signedUrl,
    expires_in: TTL_SECS,
    filename:   downloadName,
  })
}
