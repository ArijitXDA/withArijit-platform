import { z } from 'zod'

// ───────────────────────────────────────────────────────────────────────────
// Resume module validation schemas
// ───────────────────────────────────────────────────────────────────────────

// Audience self-classification — matches landing page CTAs
export const AUDIENCE_SEGMENTS = [
  'college',           // college-goer / final-year student
  'fresher',           // 0-2 years experience
  'working_pro',       // professional pivoting to AI / upskilling
  'senior_consultant', // 10+ years, leadership / consulting
  'returner',          // career returner / pivoter from non-AI field
] as const

export type AudienceSegment = typeof AUDIENCE_SEGMENTS[number]

// ───────────────────────────────────────────────────────────────────────────
// Form input schema (client + server share this)
// All non-required fields are optional strings that coerce empty-string → undefined
// ───────────────────────────────────────────────────────────────────────────
export const resumeSubmitSchema = z.object({
  // Required contact info
  full_name: z.string().min(2, 'Please enter your full name').max(150),
  email:     z.string().email('Please enter a valid email address').max(255).toLowerCase(),
  mobile:    z.string().min(7, 'Please enter a valid mobile number').max(20),

  // Optional profile context — all fields allowed blank, server treats empty as null
  current_city:        z.string().max(100).optional(),
  preferred_locations: z.array(z.string().max(100)).max(10).optional(),
  industry:            z.string().max(100).optional(),
  current_job_role:    z.string().max(150).optional(),
  current_company:     z.string().max(200).optional(),
  years_experience:    z.number().int().min(0).max(60).optional(),
  highest_education:   z.string().max(200).optional(),
  edu_institution:     z.string().max(200).optional(),
  edu_graduation_year: z.number().int().min(1960).max(2040).optional(),
  target_job_role:     z.string().max(200).optional(),
  audience_segment:    z.enum(AUDIENCE_SEGMENTS).optional(),

  // Resume content — at least one of (file | pasted text) required; enforced in server
  resume_text_pasted:  z.string().max(50000).optional(),
  // File is handled outside Zod via FormData; server validates it

  // UTM / attribution — filled automatically from URL params
  partner_slug:  z.string().max(100).optional(),
  utm_source:    z.string().max(100).optional(),
  utm_medium:    z.string().max(100).optional(),
  utm_campaign:  z.string().max(100).optional(),
  utm_term:      z.string().max(100).optional(),
  utm_content:   z.string().max(100).optional(),
  referer:       z.string().max(500).optional(),

  // Anti-bot token (Cloudflare Turnstile or similar) — optional for now,
  // enforced server-side when enabled
  turnstile_token: z.string().optional(),
})

export type ResumeSubmitInput = z.infer<typeof resumeSubmitSchema>

// ───────────────────────────────────────────────────────────────────────────
// Allowed MIME types + max file size (must match Supabase bucket config)
// ───────────────────────────────────────────────────────────────────────────
export const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',                                                       // .doc (legacy)
  'text/plain',
] as const

export const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024 // 5 MB — matches bucket

export function mimeToExtension(mime: string): string {
  switch (mime) {
    case 'application/pdf': return 'pdf'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return 'docx'
    case 'application/msword': return 'doc'
    case 'text/plain': return 'txt'
    default: return 'bin'
  }
}
