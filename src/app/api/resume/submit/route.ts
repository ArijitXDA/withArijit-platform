import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  resumeSubmitSchema,
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_FILE_SIZE,
  mimeToExtension,
} from '@/lib/validations/resume'

// ───────────────────────────────────────────────────────────────────────────
// POST /api/resume/submit
// ───────────────────────────────────────────────────────────────────────────
// Accepts multipart/form-data from /resume/apply form:
//   - text fields (name, email, mobile, etc.)
//   - optional `resume_file` (PDF/DOCX/DOC/TXT, ≤5MB)
//   - optional `resume_text_pasted` if no file uploaded
//
// Flow:
//   1. Validate fields with Zod
//   2. If file present: validate mime + size, upload to `resumes` bucket
//   3. Resolve partner_id from partner_slug if provided
//   4. Insert row into resume_submissions (status='new', parse_status='pending')
//   5. Log 'form_submit' event to resume_events
//   6. Return { submission_token, redirect_to: /signup?... }
//
// Parsing runs asynchronously after signup verification (separate edge fn).
// ───────────────────────────────────────────────────────────────────────────

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const maxDuration = 30

function json(body: any, init?: ResponseInit) {
  return NextResponse.json(body, init)
}

export async function POST(req: NextRequest) {
  let form: FormData
  try {
    form = await req.formData()
  } catch (e: any) {
    return json({ error: 'Invalid form data' }, { status: 400 })
  }

  // ── 1. Build payload from FormData ──────────────────────────────────────
  const raw: Record<string, any> = {
    full_name:           (form.get('full_name') as string | null) ?? '',
    email:               (form.get('email') as string | null)     ?? '',
    mobile:              (form.get('mobile') as string | null)    ?? '',
    current_city:        (form.get('current_city') as string | null)        || undefined,
    industry:            (form.get('industry') as string | null)            || undefined,
    current_job_role:    (form.get('current_job_role') as string | null)    || undefined,
    current_company:     (form.get('current_company') as string | null)     || undefined,
    years_experience:    form.get('years_experience')      ? Number(form.get('years_experience'))      : undefined,
    highest_education:   (form.get('highest_education') as string | null)   || undefined,
    edu_institution:     (form.get('edu_institution') as string | null)     || undefined,
    edu_graduation_year: form.get('edu_graduation_year')   ? Number(form.get('edu_graduation_year'))   : undefined,
    target_job_role:     (form.get('target_job_role') as string | null)     || undefined,
    audience_segment:    (form.get('audience_segment') as string | null)    || undefined,
    resume_text_pasted:  (form.get('resume_text_pasted') as string | null)  || undefined,

    partner_slug:        (form.get('partner_slug') as string | null)        || undefined,
    utm_source:          (form.get('utm_source') as string | null)          || undefined,
    utm_medium:          (form.get('utm_medium') as string | null)          || undefined,
    utm_campaign:        (form.get('utm_campaign') as string | null)        || undefined,
    utm_term:            (form.get('utm_term') as string | null)            || undefined,
    utm_content:         (form.get('utm_content') as string | null)         || undefined,
    referer:             (form.get('referer') as string | null)             || undefined,

    turnstile_token:     (form.get('turnstile_token') as string | null)     || undefined,
  }

  // preferred_locations may arrive as repeated form entries OR JSON string
  const locationsEntry = form.getAll('preferred_locations')
  if (locationsEntry.length > 0) {
    raw.preferred_locations = locationsEntry
      .flatMap(v => {
        if (typeof v !== 'string') return []
        // Support JSON-encoded array OR plain repeated values
        if (v.startsWith('[')) {
          try { return JSON.parse(v) } catch { return [] }
        }
        return [v]
      })
      .filter(Boolean)
      .slice(0, 10)
  }

  // ── 2. Validate ────────────────────────────────────────────────────────
  const parsed = resumeSubmitSchema.safeParse(raw)
  if (!parsed.success) {
    return json({
      error: 'Validation failed',
      issues: parsed.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    }, { status: 400 })
  }
  const data = parsed.data

  // ── 3. File validation (if present) ────────────────────────────────────
  const file = form.get('resume_file') as File | null
  let hasFile = false
  if (file && typeof file === 'object' && 'arrayBuffer' in file && file.size > 0) {
    hasFile = true
    if (!(ALLOWED_RESUME_MIME_TYPES as readonly string[]).includes(file.type)) {
      return json({ error: `Unsupported file type: ${file.type}. Please upload PDF or Word document.` }, { status: 400 })
    }
    if (file.size > MAX_RESUME_FILE_SIZE) {
      return json({ error: `File too large. Maximum size is ${MAX_RESUME_FILE_SIZE / 1024 / 1024} MB.` }, { status: 400 })
    }
  }

  // Must provide either a file or pasted text
  if (!hasFile && !data.resume_text_pasted) {
    return json({ error: 'Please upload your resume or paste the text.' }, { status: 400 })
  }

  // ── 4. Supabase service client ─────────────────────────────────────────
  const supabase = createServiceClient()

  // Resolve partner_id from partner_slug if provided
  let partner_id: string | null = null
  if (data.partner_slug) {
    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('slug', data.partner_slug)
      .maybeSingle()
    if (partner) partner_id = partner.id
  }

  // ── 5. Create submission row first (we need the id to scope the storage path) ──
  const { data: inserted, error: insertErr } = await supabase
    .from('resume_submissions')
    .insert({
      email:               data.email,
      mobile:              data.mobile,
      full_name:           data.full_name,
      current_city:        data.current_city        ?? null,
      preferred_locations: data.preferred_locations ?? [],
      industry:            data.industry            ?? null,
      current_job_role:    data.current_job_role    ?? null,
      current_company:     data.current_company     ?? null,
      years_experience:    data.years_experience    ?? null,
      highest_education:   data.highest_education   ?? null,
      edu_institution:     data.edu_institution     ?? null,
      edu_graduation_year: data.edu_graduation_year ?? null,
      target_job_role:     data.target_job_role     ?? null,
      audience_segment:    data.audience_segment    ?? null,
      resume_text_pasted:  data.resume_text_pasted  ?? null,
      partner_id,
      utm_source:   data.utm_source   ?? null,
      utm_medium:   data.utm_medium   ?? null,
      utm_campaign: data.utm_campaign ?? null,
      utm_term:     data.utm_term     ?? null,
      utm_content:  data.utm_content  ?? null,
      referer:      data.referer      ?? null,
      parse_status: hasFile || data.resume_text_pasted ? 'pending' : 'skipped',
      status: 'new',
    })
    .select('id, submission_token')
    .single()

  if (insertErr || !inserted) {
    console.error('[resume/submit] insert failed:', insertErr)
    return json({ error: 'Could not save your submission. Please try again.' }, { status: 500 })
  }

  // ── 6. Upload file (if present) ────────────────────────────────────────
  if (hasFile && file) {
    const ext       = mimeToExtension(file.type)
    const storagePath = `${inserted.id}/resume.${ext}`
    const bytes = new Uint8Array(await file.arrayBuffer())

    const { error: uploadErr } = await supabase
      .storage
      .from('resumes')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadErr) {
      console.error('[resume/submit] upload failed:', uploadErr)
      // Don't reject — mark parse as failed but accept the submission
      await supabase
        .from('resume_submissions')
        .update({
          parse_status: data.resume_text_pasted ? 'pending' : 'failed',
          parse_error:  `upload_failed: ${uploadErr.message}`.slice(0, 500),
        })
        .eq('id', inserted.id)
    } else {
      await supabase
        .from('resume_submissions')
        .update({
          resume_file_url:  storagePath,
          resume_file_size: file.size,
          resume_file_mime: file.type,
        })
        .eq('id', inserted.id)
    }
  }

  // ── 7. Log event (fire-and-forget) ─────────────────────────────────────
  void supabase.from('resume_events').insert({
    submission_id: inserted.id,
    email:         data.email,
    event_type:    'form_submit',
    metadata: {
      has_file: hasFile,
      has_pasted_text: !!data.resume_text_pasted,
      partner_slug: data.partner_slug ?? null,
      utm_source:   data.utm_source   ?? null,
      utm_campaign: data.utm_campaign ?? null,
    },
  })

  // ── 8. Return token + redirect ─────────────────────────────────────────
  const redirectTo = `/signup?email=${encodeURIComponent(data.email)}&resume_token=${encodeURIComponent(inserted.submission_token)}`

  return json({
    ok: true,
    submission_token: inserted.submission_token,
    redirect_to: redirectTo,
  })
}
