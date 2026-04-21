'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, FileText, Upload, X, ChevronRight } from 'lucide-react'
import {
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_FILE_SIZE,
  AUDIENCE_SEGMENTS,
  type AudienceSegment,
} from '@/lib/validations/resume'

// ── Tokens (matches oStaran palette) ───────────────────────────────────────
const T = {
  navy:       '#0f1f3d',
  indigo:     '#4f46e5',
  purple:     '#7c3aed',
  border:     '#e5e7eb',
  borderSoft: '#f3f4f6',
  textSec:    '#64748b',
  textMuted:  '#94a3b8',
  danger:     '#dc2626',
  focus:      '#6366f1',
}

// ── Industry options (common Indian market categories) ────────────────────
const INDUSTRIES = [
  'Information Technology',
  'Banking & Financial Services',
  'Consulting',
  'Healthcare & Pharma',
  'Manufacturing',
  'Retail & E-commerce',
  'Education & EdTech',
  'Media & Entertainment',
  'Telecom',
  'FMCG',
  'Real Estate',
  'Government / PSU',
  'Student / Not working',
  'Other',
]

// ── Preferred work-location options (India-first) ────────────────────────
const INDIA_METROS = [
  'Mumbai', 'Bengaluru', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune',
  'Kolkata', 'Ahmedabad', 'Remote (India)', 'Open to relocate',
  'Outside India',
]

const AUDIENCE_LABELS: Record<AudienceSegment, string> = {
  college: 'College student / Final-year',
  fresher: 'Fresher (0–2 years)',
  working_pro: 'Working professional',
  senior_consultant: 'Senior consultant / Leader',
  returner: 'Career returner / Pivoter',
}

// ══════════════════════════════════════════════════════════════════════════
//  Main export wraps Suspense boundary around the useSearchParams-dependent form
// ══════════════════════════════════════════════════════════════════════════
export default function ResumeApplyForm() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <FormInner />
    </Suspense>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#e5e7eb' }} />
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
function FormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Attribution params (captured from URL) ────────────────────────────
  const [utmFields, setUtmFields] = useState<Record<string, string>>({})
  useEffect(() => {
    const fields: Record<string, string> = {}
    for (const key of ['partner', 'partner_slug', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const v = searchParams.get(key)
      if (v) fields[key === 'partner' ? 'partner_slug' : key] = v
    }
    if (typeof document !== 'undefined' && document.referrer) fields.referer = document.referrer
    setUtmFields(fields)
  }, [searchParams])

  // ── Form state ────────────────────────────────────────────────────────
  const [fullName, setFullName]       = useState('')
  const [email, setEmail]             = useState(searchParams.get('email') ?? '')
  const [mobile, setMobile]           = useState('')
  const [city, setCity]               = useState('')
  const [industry, setIndustry]       = useState('')
  const [jobRole, setJobRole]         = useState('')
  const [company, setCompany]         = useState('')
  const [yearsExp, setYearsExp]       = useState('')
  const [education, setEducation]     = useState('')
  const [eduInstitution, setEduInstitution] = useState('')
  const [eduGradYear, setEduGradYear] = useState('')
  const [targetRole, setTargetRole]   = useState('')
  const [audience, setAudience]       = useState<AudienceSegment | ''>('')
  const [preferredLocs, setPreferredLocs] = useState<string[]>([])
  const [pastedText, setPastedText]   = useState('')
  const [pasteMode, setPasteMode]     = useState(false)

  const [file, setFile]               = useState<File | null>(null)
  const [fileError, setFileError]     = useState<string | null>(null)
  const fileInputRef                  = useRef<HTMLInputElement | null>(null)

  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Handlers ──────────────────────────────────────────────────────────
  const pickFile = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const f = e.target.files?.[0]
    if (!f) return
    if (!(ALLOWED_RESUME_MIME_TYPES as readonly string[]).includes(f.type)) {
      setFileError('Please upload a PDF or Word document.')
      return
    }
    if (f.size > MAX_RESUME_FILE_SIZE) {
      setFileError(`File too large. Max ${MAX_RESUME_FILE_SIZE / 1024 / 1024} MB.`)
      return
    }
    setFile(f)
    setPasteMode(false)
    setPastedText('')
  }

  const clearFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleLocation = (loc: string) => {
    setPreferredLocs(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    )
  }

  const validate = (): string | null => {
    if (fullName.trim().length < 2) return 'Please enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.'
    if (mobile.replace(/\D/g, '').length < 7) return 'Please enter a valid mobile number.'
    if (!file && pastedText.trim().length < 30) {
      return 'Please upload your résumé or paste the text (at least a few sentences).'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const err = validate()
    if (err) {
      setSubmitError(err)
      toast.error(err)
      return
    }

    setSubmitting(true)
    const fd = new FormData()
    fd.append('full_name', fullName.trim())
    fd.append('email',     email.trim())
    fd.append('mobile',    mobile.trim())
    if (city)           fd.append('current_city',        city.trim())
    if (industry)       fd.append('industry',            industry)
    if (jobRole)        fd.append('current_job_role',    jobRole.trim())
    if (company)        fd.append('current_company',     company.trim())
    if (yearsExp)       fd.append('years_experience',    yearsExp)
    if (education)      fd.append('highest_education',   education.trim())
    if (eduInstitution) fd.append('edu_institution',     eduInstitution.trim())
    if (eduGradYear)    fd.append('edu_graduation_year', eduGradYear)
    if (targetRole)     fd.append('target_job_role',     targetRole.trim())
    if (audience)       fd.append('audience_segment',    audience)
    for (const loc of preferredLocs) fd.append('preferred_locations', loc)
    if (file)           fd.append('resume_file', file)
    else if (pastedText) fd.append('resume_text_pasted', pastedText.trim())

    for (const [k, v] of Object.entries(utmFields)) fd.append(k, v)

    try {
      const res = await fetch('/api/resume/submit', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        const msg = data.error ?? 'Something went wrong. Please try again.'
        setSubmitError(msg)
        toast.error(msg)
        setSubmitting(false)
        return
      }

      toast.success('Résumé received! Let\'s get you signed up.')
      // Small delay so the toast is visible
      setTimeout(() => {
        router.push(data.redirect_to ?? `/signup?email=${encodeURIComponent(email.trim())}&resume_token=${data.submission_token}`)
      }, 500)
    } catch (err: any) {
      const msg = 'Network error. Please check your connection and try again.'
      setSubmitError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  // ── Reusable field wrappers ────────────────────────────────────────────
  const input = 'w-full px-4 py-3 rounded-xl border text-sm transition-colors outline-none bg-white'
  const inputFocus = `focus:border-[${T.focus}] focus:ring-2 focus:ring-indigo-100`
  const label = 'block text-sm font-semibold mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ═══ Contact Details ═══════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl p-6 border" style={{ borderColor: T.border }}>
        <h2 className="font-bold text-base mb-4" style={{ color: T.navy }}>Contact details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={label} style={{ color: T.navy }}>
              Full name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                   placeholder="e.g. Priya Sharma"
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }}
                   autoComplete="name" required maxLength={150} />
          </div>
          <div>
            <label className={label} style={{ color: T.navy }}>
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                   placeholder="you@example.com"
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }}
                   autoComplete="email" required maxLength={255} />
          </div>
          <div>
            <label className={label} style={{ color: T.navy }}>
              Mobile <span className="text-red-500">*</span>
            </label>
            <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)}
                   placeholder="+91 98765 43210"
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }}
                   autoComplete="tel" required maxLength={20} />
          </div>
        </div>
      </section>

      {/* ═══ About You ═════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl p-6 border" style={{ borderColor: T.border }}>
        <h2 className="font-bold text-base mb-1" style={{ color: T.navy }}>About you</h2>
        <p className="text-xs mb-4" style={{ color: T.textMuted }}>All fields below are optional — but the more you share, the better we can tailor your pathway.</p>

        {/* Audience self-classification */}
        <div className="mb-5">
          <label className={label} style={{ color: T.navy }}>Which best describes you?</label>
          <div className="grid grid-cols-2 gap-2">
            {AUDIENCE_SEGMENTS.map(a => (
              <button key={a} type="button" onClick={() => setAudience(a)}
                      className={`px-3 py-2.5 text-xs rounded-xl border text-left font-medium transition-all ${
                        audience === a ? 'ring-2' : ''
                      }`}
                      style={{
                        borderColor: audience === a ? T.indigo : T.border,
                        background: audience === a ? '#eef2ff' : '#fff',
                        color: audience === a ? T.indigo : '#1e293b',
                      }}>
                {AUDIENCE_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={label} style={{ color: T.navy }}>Current role</label>
            <input type="text" value={jobRole} onChange={e => setJobRole(e.target.value)}
                   placeholder="e.g. Business Analyst, Student, Homemaker"
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }} maxLength={150} />
          </div>
          <div>
            <label className={label} style={{ color: T.navy }}>Current company</label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                   placeholder="e.g. Infosys (or 'Not applicable')"
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }} maxLength={200} />
          </div>
          <div>
            <label className={label} style={{ color: T.navy }}>Industry</label>
            <select value={industry} onChange={e => setIndustry(e.target.value)}
                    className={`${input} ${inputFocus}`} style={{ borderColor: T.border }}>
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className={label} style={{ color: T.navy }}>Years of experience</label>
            <input type="number" value={yearsExp} onChange={e => setYearsExp(e.target.value)}
                   placeholder="0" min={0} max={60}
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }} />
          </div>
          <div>
            <label className={label} style={{ color: T.navy }}>Highest education</label>
            <input type="text" value={education} onChange={e => setEducation(e.target.value)}
                   placeholder="e.g. B.E. Mechanical, MBA Finance"
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }} maxLength={200} />
          </div>
          <div>
            <label className={label} style={{ color: T.navy }}>Institution</label>
            <input type="text" value={eduInstitution} onChange={e => setEduInstitution(e.target.value)}
                   placeholder="e.g. IIT Bombay"
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }} maxLength={200} />
          </div>
          <div>
            <label className={label} style={{ color: T.navy }}>Graduation year</label>
            <input type="number" value={eduGradYear} onChange={e => setEduGradYear(e.target.value)}
                   placeholder="2022" min={1960} max={2040}
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }} />
          </div>
          <div>
            <label className={label} style={{ color: T.navy }}>Current city</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)}
                   placeholder="e.g. Mumbai"
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }} maxLength={100} />
          </div>
          <div className="md:col-span-2">
            <label className={label} style={{ color: T.navy }}>Target role in AI (if known)</label>
            <input type="text" value={targetRole} onChange={e => setTargetRole(e.target.value)}
                   placeholder="e.g. AI Engineer, Product Manager using AI, Agentic AI specialist"
                   className={`${input} ${inputFocus}`} style={{ borderColor: T.border }} maxLength={200} />
          </div>
          <div className="md:col-span-2">
            <label className={label} style={{ color: T.navy }}>Preferred work locations</label>
            <div className="flex flex-wrap gap-2">
              {INDIA_METROS.map(loc => {
                const active = preferredLocs.includes(loc)
                return (
                  <button key={loc} type="button" onClick={() => toggleLocation(loc)}
                          className="px-3 py-1.5 text-xs rounded-full border font-medium transition-all"
                          style={{
                            borderColor: active ? T.indigo : T.border,
                            background:  active ? '#eef2ff' : '#fff',
                            color:       active ? T.indigo : T.textSec,
                          }}>
                    {active ? '✓ ' : ''}{loc}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Résumé ════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl p-6 border" style={{ borderColor: T.border }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base" style={{ color: T.navy }}>
            Your résumé <span className="text-red-500">*</span>
          </h2>
          <button type="button" onClick={() => setPasteMode(!pasteMode)}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: T.indigo }}>
            {pasteMode ? '← Upload file instead' : 'Paste text instead →'}
          </button>
        </div>

        {!pasteMode ? (
          <>
            {!file ? (
              <button type="button" onClick={pickFile}
                      className="w-full rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:bg-indigo-50/40"
                      style={{ borderColor: '#cbd5e1' }}>
                <Upload size={26} className="mx-auto mb-2" style={{ color: T.indigo }} />
                <p className="font-semibold text-sm" style={{ color: T.navy }}>Click to upload</p>
                <p className="text-xs mt-1" style={{ color: T.textMuted }}>PDF, DOCX, DOC or TXT · max 5 MB</p>
              </button>
            ) : (
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#f8faff', border: `1px solid ${T.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: '#eef2ff', border: '1px solid #e0e7ff' }}>
                  <FileText size={18} style={{ color: T.indigo }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: T.navy }}>{file.name}</p>
                  <p className="text-xs" style={{ color: T.textMuted }}>{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" onClick={clearFile}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                        style={{ color: '#94a3b8' }}>
                  <X size={16} />
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file"
                   accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                   className="hidden" onChange={handleFileChange} />
            {fileError && <p className="text-xs mt-2 font-medium" style={{ color: T.danger }}>{fileError}</p>}
          </>
        ) : (
          <>
            <textarea value={pastedText} onChange={e => setPastedText(e.target.value)}
                      rows={10} maxLength={50000}
                      placeholder="Paste your résumé text here..."
                      className={`${input} ${inputFocus} resize-y`} style={{ borderColor: T.border }} />
            <p className="text-xs mt-1.5" style={{ color: T.textMuted }}>
              {pastedText.length.toLocaleString()} / 50,000 characters
            </p>
          </>
        )}
      </section>

      {/* ═══ Submit ═════════════════════════════════════════════════════ */}
      <div className="pt-2">
        {submitError && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium"
               style={{ background: '#fef2f2', color: T.danger, border: '1px solid #fecaca' }}>
            {submitError}
          </div>
        )}

        <button type="submit" disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${T.indigo} 0%, ${T.purple} 100%)`, boxShadow: '0 6px 24px rgba(79,70,229,0.28)' }}>
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Continue to Sign Up
              <ChevronRight size={18} />
            </>
          )}
        </button>

        <p className="text-xs text-center mt-4" style={{ color: T.textMuted }}>
          By continuing, you agree to our <a href="/terms" className="underline hover:opacity-80">Terms</a> and <a href="/privacy" className="underline hover:opacity-80">Privacy Policy</a>.
          We&apos;ll never sell your data.
        </p>
      </div>
    </form>
  )
}
