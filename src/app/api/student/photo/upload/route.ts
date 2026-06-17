import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// ────────────────────────────────────────────────────────────────────────────
// POST /api/student/photo/upload
//
// Authenticated profile-photo upload for the student dashboard. Accepts
// multipart/form-data with a single `file` field (the client already resizes
// to a ~512px JPEG). Stores at `student-profiles/{user_id}/avatar-*.jpg`
// (public bucket) via the SERVICE ROLE — so it never depends on storage RLS,
// which is why the previous client-side upload failed ("violates RLS"). Writes
// the public URL to student_profiles.profile_photo_url and returns it.
// ────────────────────────────────────────────────────────────────────────────

const BUCKET   = 'student-profiles'
const MAX_SIZE = 6 * 1024 * 1024 // 6 MB — generous; the client sends a small JPEG

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // ── Auth (cookies → user) ─────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse form ────────────────────────────────────────────────────────────
  let form: FormData
  try { form = await req.formData() }
  catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }) }

  const file = form.get('file') as File | null
  if (!file || typeof file !== 'object' || !('arrayBuffer' in file) || file.size === 0) {
    return NextResponse.json({ error: 'No image uploaded' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type || 'unknown'}` }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({
      error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_SIZE / 1024 / 1024} MB.`,
    }, { status: 400 })
  }

  const service = createServiceClient()
  const userId  = user.id
  const email   = user.email

  // ── Clean up older avatars so the folder doesn't accumulate ───────────────
  const { data: existingFiles } = await service.storage.from(BUCKET).list(userId, { limit: 50 })
  const stale = (existingFiles ?? []).map(f => `${userId}/${f.name}`)
  if (stale.length) {
    const { error: delErr } = await service.storage.from(BUCKET).remove(stale)
    if (delErr) console.warn('[photo/upload] cleanup warning:', delErr.message)
  }

  // ── Upload (service role bypasses storage RLS) ────────────────────────────
  const storagePath = `${userId}/avatar-${Date.now()}.jpg`
  const bytes       = new Uint8Array(await file.arrayBuffer())
  const { error: uploadErr } = await service.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType: file.type || 'image/jpeg',
    upsert:      true,
    cacheControl: '3600',
  })
  if (uploadErr) {
    console.error('[photo/upload] upload failed:', uploadErr)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  const { data: { publicUrl } } = service.storage.from(BUCKET).getPublicUrl(storagePath)
  const url = `${publicUrl}?v=${Date.now()}` // cache-bust so the new pic shows immediately

  // ── Persist on the profile (email is the only required column) ────────────
  const { error: saveErr } = await service
    .from('student_profiles')
    .upsert(
      { email, user_id: userId, profile_photo_url: url, updated_at: new Date().toISOString() },
      { onConflict: 'email' },
    )
  if (saveErr) {
    console.error('[photo/upload] profile save failed:', saveErr)
    return NextResponse.json({ error: 'Could not save the photo reference' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, url })
}
