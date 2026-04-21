'use client'

import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Upload, Loader2, X, FileText, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { AUDIENCE_SEGMENTS, type AudienceSegment, MAX_RESUME_FILE_SIZE, ALLOWED_RESUME_MIME_TYPES } from '@/lib/validations/resume'

// ── Mirrors audience options on the landing page ──────────────────────────
const AUDIENCE_LABELS: Record<AudienceSegment, string> = {
  college:           'College / final-year student',
  fresher:           'Fresher (0–2 years experience)',
  working_pro:       'Working professional pivoting to AI',
  senior_consultant: 'Senior consultant or leader',
  returner:          'Career returner or switcher',
}

const INDUSTRIES = [
  'Banking & Financial Services', 'IT Services', 'Product / SaaS', 'Consulting',
  'Manufacturing', 'Healthcare / Pharma', 'E-commerce / Retail', 'Media / Entertainment',
  'Education / EdTech', 'Government / Public Sector', 'Startup / Entrepreneurship',
  'Student / Not working yet', 'Other',
]

const POPULAR_CITIES = [
  'Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
  'Ahmedabad', 'Remote / WFH',
]

const EDUCATION_LEVELS = [
  'High School', 'Bachelor\'s', 'Master\'s', 'MBA', 'PhD / Doctorate', 'Diploma / Certificate', 'Other',
]

export default function ResumeApplyClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read URL params (audience, UTM, partner) once on mount
  const audienceFromUrl = searchParams.get('audience') as AudienceSegment | null
  const initAudience = audienceFromUrl && AUDIENCE_SEGMENTS.includes(audienceFromUrl as AudienceSegment)
    ? (audienceFromUrl as AudienceSegment)
    : ''

  // ── Form state ──────────────────────────────────────────────────────────
  const [fullName,          setFullName]          = useState('')
  const [email,             setEmail]             = useState('')
  const [mobile,            setMobile]            = useState('')
  const [currentCity,       setCurrentCity]       = useState('')
  const [preferredLocations, setPreferredLocations] = useState<string[]>([])
  const [industry,          setIndustry]          = useState('')
  const [currentJobRole,    setCurrentJobRole]    = useState('')
  const [currentCompany,    setCurrentCompany]    = useState('')
  const [yearsExperience,   setYearsExperience]   = useState<string>('')
  const [highestEducation,  setHighestEducation]  = useState('')
  const [eduInstitution,    setEduInstitution]    = useState('')
  const [eduGraduationYear, setEduGraduationYear] = useState<string>('')
  const [targetJobRole,     setTargetJobRole]     = useState('')
  const [audienceSegment,   setAudienceSegment]   = useState<AudienceSegment | ''>(initAudience)

  const [resumeFile,        setResumeFile]        = useState<File | null>(null)
  const [resumeTextPasted,  setResumeTextPasted]  = useState('')
  const [resumeMode,        setResumeMode]        = useState<'upload' | 'paste'>('upload')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // ── Derived / helpers ───────────────────────────────────────────────────
  const togglePreferredLocation = (city: string) => {
    setPreferredLocations(prev => prev.includes(city)
      ? prev.filter(c => c !== city)
      : prev.length >= 10 ? prev : [...prev, city]
    )
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setErrorMsg(null)
    if (!f) { setResumeFile(null); return }
    if (!(ALLOWED_RESUME_MIME_TYPES as readonly string[]).includes(f.type)) {
      setErrorMsg(`Unsupported file type. Please upload a PDF or Word document.`)
      setResumeFile(null)
      return
    }
    if (f.size > MAX_RESUME_FILE_SIZE) {
      setErrorMsg(`File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`)
      setResumeFile(null)
      return
    }
    setResumeFile(f)
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setFieldErrors({})

    // Light client-side validation
    const errors: Record<string, string> = {}
    if (fullName.trim().length < 2)    errors.full_name = 'Please enter your full name'
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.email     = 'Please enter a valid email'
    if (mobile.trim().length < 7)      errors.mobile    = 'Please enter a valid mobile number'
    if (resumeMode === 'upload' && !resumeFile)                errors.resume = 'Please upload your resume'
    if (resumeMode === 'paste'  && resumeTextPasted.trim().length < 50) errors.resume = 'Please paste at least 50 characters of your resume'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setErrorMsg('Please fix the highlighted fields.')
      return
    }

    setSubmitting(true)

    try {
      const fd = new FormData()
      fd.set('full_name', fullName.trim())
      fd.set('email',     email.trim().toLowerCase())
      fd.set('mobile',    mobile.trim())
      if (currentCity)       fd.set('current_city', currentCity.trim())
      if (industry)          fd.set('industry', industry)
      if (currentJobRole)    fd.set('current_job_role', currentJobRole.trim())
      if (currentCompany)    fd.set('current_company', currentCompany.trim())
      if (yearsExperience)   fd.set('years_experience', yearsExperience)
      if (highestEducation)  fd.set('highest_education', highestEducation)
      if (eduInstitution)    fd.set('edu_institution', eduInstitution.trim())
      if (eduGraduationYear) fd.set('edu_graduation_year', eduGraduationYear)
      if (targetJobRole)     fd.set('target_job_role', targetJobRole.trim())
      if (audienceSegment)   fd.set('audience_segment', audienceSegment)

      preferredLocations.forEach(city => fd.append('preferred_locations', city))

      if (resumeMode === 'upload' && resumeFile) {
        fd.set('resume_file', resumeFile)
      } else if (resumeMode === 'paste' && resumeTextPasted.trim()) {
        fd.set('resume_text_pasted', resumeTextPasted.trim())
      }

      // Attribution
      const partnerSlug  = searchParams.get('partner') ?? searchParams.get('p')
      if (partnerSlug)                     fd.set('partner_slug', partnerSlug)
      if (searchParams.get('utm_source'))  fd.set('utm_source',   searchParams.get('utm_source')!)
      if (searchParams.get('utm_medium'))  fd.set('utm_medium',   searchParams.get('utm_medium')!)
      if (searchParams.get('utm_campaign'))fd.set('utm_campaign', searchParams.get('utm_campaign')!)
      if (searchParams.get('utm_term'))    fd.set('utm_term',     searchParams.get('utm_term')!)
      if (searchParams.get('utm_content')) fd.set('utm_content',  searchParams.get('utm_content')!)
      if (typeof document !== 'undefined' && document.referrer) fd.set('referer', document.referrer)

      const res = await fetch('/api/resume/submit', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        if (data.issues?.length) {
          const fe: Record<string, string> = {}
          for (const i of data.issues) fe[i.field] = i.message
          setFieldErrors(fe)
        }
        throw new Error(data.error ?? 'Submission failed. Please try again.')
      }

      // Redirect to thank-you page, which will then auto-hand-off to signup
      router.push(`/resume/thank-you?token=${encodeURIComponent(data.submission_token)}`)
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/resume" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Share your resume</h1>
        <p className="text-gray-600">Takes about 2 minutes. Fields marked <span className="text-red-500">*</span> are required — everything else is optional and helps us tailor recommendations.</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Section 1: Contact ────────────────────────────────────── */}
        <section className="p-6 rounded-2xl bg-white border border-gray-200">
          <h2 className="font-bold text-lg mb-4">Contact</h2>

          <div className="space-y-4">
            <Field label="Full name" required error={fieldErrors.full_name}>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Arijit Chowdhury"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                maxLength={150}
              />
            </Field>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Email" required error={fieldErrors.email}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  maxLength={255}
                />
              </Field>

              <Field label="Mobile" required error={fieldErrors.mobile}>
                <input
                  type="tel"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  maxLength={20}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* ── Section 2: About you ──────────────────────────────────── */}
        <section className="p-6 rounded-2xl bg-white border border-gray-200">
          <h2 className="font-bold text-lg mb-1">About you</h2>
          <p className="text-sm text-gray-500 mb-4">Helps us recommend the right path. All optional.</p>

          <div className="space-y-4">
            <Field label="Which best describes you?">
              <select
                value={audienceSegment}
                onChange={e => setAudienceSegment(e.target.value as AudienceSegment | '')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="">— Select —</option>
                {AUDIENCE_SEGMENTS.map(s => (
                  <option key={s} value={s}>{AUDIENCE_LABELS[s]}</option>
                ))}
              </select>
            </Field>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Industry">
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">— Select —</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>

              <Field label="Years of experience">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={yearsExperience}
                  onChange={e => setYearsExperience(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Current role">
                <input
                  type="text"
                  value={currentJobRole}
                  onChange={e => setCurrentJobRole(e.target.value)}
                  placeholder="e.g. Product Manager"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  maxLength={150}
                />
              </Field>

              <Field label="Current company">
                <input
                  type="text"
                  value={currentCompany}
                  onChange={e => setCurrentCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  maxLength={200}
                />
              </Field>
            </div>

            <Field label="Target role (what you'd like to move into)">
              <input
                type="text"
                value={targetJobRole}
                onChange={e => setTargetJobRole(e.target.value)}
                placeholder="e.g. AI Product Manager, ML Engineer, AI Consultant"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                maxLength={200}
              />
            </Field>
          </div>
        </section>

        {/* ── Section 3: Location ───────────────────────────────────── */}
        <section className="p-6 rounded-2xl bg-white border border-gray-200">
          <h2 className="font-bold text-lg mb-1">Location</h2>
          <p className="text-sm text-gray-500 mb-4">All optional.</p>

          <div className="space-y-4">
            <Field label="Current city">
              <input
                type="text"
                value={currentCity}
                onChange={e => setCurrentCity(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                maxLength={100}
              />
            </Field>

            <Field label="Preferred work locations (pick up to 10)">
              <div className="flex flex-wrap gap-2">
                {POPULAR_CITIES.map(c => {
                  const active = preferredLocations.includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => togglePreferredLocation(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>
        </section>

        {/* ── Section 4: Education ──────────────────────────────────── */}
        <section className="p-6 rounded-2xl bg-white border border-gray-200">
          <h2 className="font-bold text-lg mb-1">Education</h2>
          <p className="text-sm text-gray-500 mb-4">All optional.</p>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Highest qualification">
                <select
                  value={highestEducation}
                  onChange={e => setHighestEducation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">— Select —</option>
                  {EDUCATION_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </Field>

              <Field label="Graduation year">
                <input
                  type="number"
                  min={1960}
                  max={2040}
                  value={eduGraduationYear}
                  onChange={e => setEduGraduationYear(e.target.value)}
                  placeholder="e.g. 2018"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </Field>
            </div>

            <Field label="Institution">
              <input
                type="text"
                value={eduInstitution}
                onChange={e => setEduInstitution(e.target.value)}
                placeholder="e.g. IIT Bombay"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                maxLength={200}
              />
            </Field>
          </div>
        </section>

        {/* ── Section 5: Resume ──────────────────────────────────────── */}
        <section className="p-6 rounded-2xl bg-white border border-gray-200">
          <h2 className="font-bold text-lg mb-1">Your resume <span className="text-red-500">*</span></h2>
          <p className="text-sm text-gray-500 mb-4">Upload a PDF/DOCX or paste the text. Max 5 MB.</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setResumeMode('upload')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                resumeMode === 'upload'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setResumeMode('paste')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                resumeMode === 'paste'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Paste text
            </button>
          </div>

          {resumeMode === 'upload' ? (
            <div>
              {!resumeFile ? (
                <label className="flex flex-col items-center justify-center gap-3 py-10 px-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                  <Upload size={28} className="text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">Click to upload</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOCX, DOC or TXT — max 5 MB</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 p-4 border border-green-200 bg-green-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{resumeFile.name}</p>
                    <p className="text-xs text-gray-500">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResumeFile(null)}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
                    aria-label="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={resumeTextPasted}
              onChange={e => setResumeTextPasted(e.target.value)}
              placeholder="Paste your resume text here — plain text from your CV works fine. Minimum 50 characters."
              rows={10}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-sm"
              maxLength={50000}
            />
          )}

          {fieldErrors.resume && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} /> {fieldErrors.resume}
            </p>
          )}
        </section>

        {/* ── Privacy note ─────────────────────────────────────────── */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex gap-3">
          <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            By submitting, you agree to our <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link> and <Link href="/terms" className="text-indigo-600 hover:underline">Terms</Link>. Your resume is used to tailor recommendations and onboard you to oStaran — we don&apos;t share it with recruiters or third parties.
          </p>
        </div>

        {/* ── Submit ───────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Submitting…
            </>
          ) : (
            <>Submit — continue to sign up →</>
          )}
        </button>
      </form>
    </div>
  )
}

// ── Small labelled-field wrapper ────────────────────────────────────────────
function Field({ label, required, error, children }: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  )
}
