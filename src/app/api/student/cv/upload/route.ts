import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// ────────────────────────────────────────────────────────────────────────────
// POST /api/student/cv/upload
//
// Authenticated CV upload for the student dashboard.
// Accepts multipart/form-data with a single `file` field.
// Stores at `student-cvs/{user_id}/cv.{ext}` (private bucket).
// Updates `student_profiles.cv_url` with the STORAGE PATH (not a public URL).
// Deletes any previous CV file for the same user before writing.
//
// Returns: { ok: true, path: string, size: number, mime: string, filename: string }
// ────────────────────────────────────────────────────────────────────────────

const BUCKET   = 'student-cvs'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB — matches bucket config

const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Given either a storage path or a public URL stored in cv_url, return the
// storage path so we can delete it. (Legacy rows contain public URLs from
// `getPublicUrl`; newer rows contain raw paths like `{uid}/cv.pdf`.)
function extractStoragePath(cvUrl: string | null | undefined, bucket: string): string | null {
  if (!cvUrl) return null
  // Raw storage path (no protocol)
  if (!cvUrl.startsWith('http')) return cvUrl
  // Legacy public URL: …/storage/v1/object/public/student-cvs/{uid}/cv-xxx.pdf
  // or signed URL: …/storage/v1/object/sign/student-cvs/{uid}/cv-xxx.pdf?token=...
  const marker = `/${bucket}/`
  const idx = cvUrl.indexOf(marker)
  if (idx === -1) return null
  const afterMarker = cvUrl.slice(idx + marker.length)
  // Strip any query string
  return afterMarker.split('?')[0]
}

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse form ──────────────────────────────────────────────────────────
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = form.get('file') as File | null
  if (!file || typeof file !== 'object' || !('arrayBuffer' in file) || file.size === 0) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  if (!(file.type in ALLOWED_MIME)) {
    return NextResponse.json({
      error: `Unsupported file type: ${file.type || 'unknown'}. Please upload a PDF or Word document.`,
    }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_SIZE / 1024 / 1024} MB.`,
    }, { status: 400 })
  }

  const ext       = ALLOWED_MIME[file.type]
  const service   = createServiceClient()
  const userId    = user.id
  const email     = user.email

  // ── Delete any previous CV for this user ────────────────────────────────
  // Look up the existing cv_url path, and attempt to delete it. Also remove
  // any stray `cv.*` files under the user's folder to avoid duplicates with
  // mismatched extensions from earlier uploads.
  const { data: existingProfile } = await service
    .from('student_profiles')
    .select('id, cv_url')
    .eq('email', email)
    .maybeSingle()

  const prevPath = extractStoragePath(existingProfile?.cv_url, BUCKET)
  const pathsToDelete: string[] = []
  if (prevPath) pathsToDelete.push(prevPath)

  // Also list the folder to catch leftovers from older upload paths with
  // timestamps like `{uid}/cv-1234567890.pdf`.
  const { data: existingFiles } = await service
    .storage
    .from(BUCKET)
    .list(userId, { limit: 20, sortBy: { column: 'created_at', order: 'desc' } })
  for (const f of existingFiles ?? []) {
    const fullPath = `${userId}/${f.name}`
    if (!pathsToDelete.includes(fullPath)) pathsToDelete.push(fullPath)
  }

  if (pathsToDelete.length > 0) {
    const { error: delErr } = await service.storage.from(BUCKET).remove(pathsToDelete)
    if (delErr) console.warn('[cv/upload] cleanup delete warning:', delErr.message)
  }

  // ── Upload new file ─────────────────────────────────────────────────────
  const storagePath = `${userId}/cv.${ext}`
  const bytes       = new Uint8Array(await file.arrayBuffer())

  const { error: uploadErr } = await service
    .storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadErr) {
    console.error('[cv/upload] upload failed:', uploadErr)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  // ── Save path to student_profiles (upsert; keep other fields intact) ────
  const nowIso = new Date().toISOString()

  if (existingProfile) {
    const { error: updErr } = await service
      .from('student_profiles')
      .update({ cv_url: storagePath, updated_at: nowIso })
      .eq('id', existingProfile.id)
    if (updErr) {
      console.error('[cv/upload] profile update failed:', updErr)
      return NextResponse.json({ error: 'Could not save CV reference' }, { status: 500 })
    }
  } else {
    const { error: insErr } = await service
      .from('student_profiles')
      .insert({ email, user_id: userId, cv_url: storagePath })
    if (insErr) {
      console.error('[cv/upload] profile insert failed:', insErr)
      return NextResponse.json({ error: 'Could not save CV reference' }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok:       true,
    path:     storagePath,
    size:     file.size,
    mime:     file.type,
    filename: file.name,
  })
}
