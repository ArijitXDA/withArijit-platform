'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  User, Phone, Briefcase, GraduationCap, MapPin, Link2,
  Upload, Save, CheckCircle, AlertCircle, Loader2, Camera,
  Calendar, BookOpen, Users, CreditCard, Star, FileText,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  full_name?: string; mobile?: string; date_of_birth?: string; gender?: string
  profile_photo_url?: string; occupation?: string; industry?: string
  work_experience_years?: number; current_company?: string; job_title?: string
  key_skills?: string[]; highest_education?: string; edu_institution?: string
  edu_graduation_year?: number; address_line1?: string; address_line2?: string
  city?: string; state?: string; pincode?: string; country?: string
  linkedin_url?: string; github_url?: string; instagram_url?: string
  facebook_url?: string; portfolio_url?: string; cv_url?: string
  timezone?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':'); const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/40 placeholder-slate-600 transition-colors"
const label = "text-xs text-slate-400 uppercase tracking-wide block mb-1.5"

// ── Section wrapper ───────────────────────────────────────────────────────
function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Icon className="w-4 h-4" style={{ color }} />
        <h2 className="text-white font-bold text-sm">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

// ── Enrolment info card (read-only) ──────────────────────────────────────
function EnrolmentCard({ enrolment, webinarReg }: { enrolment: any; webinarReg: any }) {
  if (!enrolment && !webinarReg) return null
  const course  = enrolment?.course
  const batch   = enrolment?.batch
  const partner = enrolment?.partner

  return (
    <Section title="My Course & Enrolment" icon={BookOpen} color="#818cf8">
      <div className="grid sm:grid-cols-2 gap-4">
        {course?.name && (
          <div>
            <p className={label}>Course</p>
            <p className="text-white font-semibold">{course.name}</p>
            {course.total_sessions && (
              <p className="text-slate-500 text-xs mt-0.5">{course.total_sessions} sessions · {course.session_duration_mins ?? 90} mins each</p>
            )}
          </div>
        )}
        {batch?.label && (
          <div>
            <p className={label}>Batch / Timeslot</p>
            <p className="text-white font-semibold">{batch.label}</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {batch.day_of_week} {fmtTime(batch.start_time)} IST
              {batch.start_date ? ` · Starts ${fmtDate(batch.start_date)}` : ''}
            </p>
            {batch.batch_code && (
              <p className="text-slate-600 text-xs font-mono mt-0.5">Batch: {batch.batch_code}</p>
            )}
          </div>
        )}
        {batch?.meeting_link && (
          <div>
            <p className={label}>Join Link</p>
            <a href={batch.meeting_link} target="_blank" rel="noopener noreferrer"
              className="text-indigo-400 text-sm hover:text-indigo-300 font-medium flex items-center gap-1">
              <Link2 className="w-3 h-3" /> {batch.meeting_platform ?? 'Join Class'}
            </a>
          </div>
        )}
        {batch?.instructor_name && (
          <div>
            <p className={label}>Trainer</p>
            <p className="text-white font-semibold">{batch.instructor_name}</p>
          </div>
        )}
        {enrolment?.amount_paid && (
          <div>
            <p className={label}>Amount Paid</p>
            <p className="text-green-400 font-bold">₹{Math.round(Number(enrolment.amount_paid)).toLocaleString('en-IN')}</p>
            {enrolment.payment_date && <p className="text-slate-500 text-xs mt-0.5">{fmtDate(enrolment.payment_date)}</p>}
          </div>
        )}
        {webinarReg?.created_at && (
          <div>
            <p className={label}>Webinar Registration Date</p>
            <p className="text-white font-semibold">{fmtDate(webinarReg.created_at)}</p>
          </div>
        )}
        {partner && (
          <div className="sm:col-span-2 rounded-xl p-3 border" style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
            <p className={label}>Referred / Enrolled by Partner</p>
            <div className="flex items-center gap-3 mt-1">
              <div>
                <p className="text-white font-semibold text-sm">{partner.full_name}</p>
                <p className="text-slate-400 text-xs">Code: <span className="font-mono text-indigo-300">{partner.partner_code}</span></p>
                {partner.mobile && <p className="text-slate-500 text-xs">{partner.mobile}</p>}
                {partner.email  && <p className="text-slate-500 text-xs">{partner.email}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}

// ── Main profile client ───────────────────────────────────────────────────
export default function ProfileClient({ email, userId, profile, enrolment, webinarReg, legacyUser }: {
  email: string; userId: string; profile: Profile | null
  enrolment: any; webinarReg: any; legacyUser: any
}) {
  const supabase = createClient()
  const photoRef = useRef<HTMLInputElement>(null)
  const cvRef    = useRef<HTMLInputElement>(null)

  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingCv,    setUploadingCv]    = useState(false)
  const [skillInput,  setSkillInput]  = useState('')

  // Form state — merge profile + legacy fallbacks
  const [form, setForm] = useState({
    full_name:             profile?.full_name     ?? legacyUser?.name        ?? '',
    mobile:                profile?.mobile        ?? legacyUser?.mobile_no   ?? '',
    date_of_birth:         profile?.date_of_birth ?? '',
    gender:                profile?.gender        ?? '',
    profile_photo_url:     profile?.profile_photo_url ?? '',
    occupation:            profile?.occupation    ?? legacyUser?.occupation  ?? '',
    industry:              profile?.industry      ?? '',
    work_experience_years: String(profile?.work_experience_years ?? ''),
    current_company:       profile?.current_company ?? '',
    job_title:             profile?.job_title     ?? '',
    key_skills:            profile?.key_skills    ?? [] as string[],
    highest_education:     profile?.highest_education ?? '',
    edu_institution:       profile?.edu_institution ?? '',
    edu_graduation_year:   String(profile?.edu_graduation_year ?? ''),
    address_line1:         profile?.address_line1 ?? '',
    address_line2:         profile?.address_line2 ?? '',
    city:                  profile?.city          ?? '',
    state:                 profile?.state         ?? '',
    pincode:               profile?.pincode       ?? '',
    country:               profile?.country       ?? 'India',
    linkedin_url:          profile?.linkedin_url  ?? '',
    github_url:            profile?.github_url    ?? '',
    instagram_url:         profile?.instagram_url ?? '',
    facebook_url:          profile?.facebook_url  ?? '',
    portfolio_url:         profile?.portfolio_url ?? '',
    cv_url:                profile?.cv_url        ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function addSkill() {
    const s = skillInput.trim()
    if (s && !form.key_skills.includes(s)) {
      setForm(f => ({ ...f, key_skills: [...f.key_skills, s] }))
    }
    setSkillInput('')
  }
  function removeSkill(s: string) {
    setForm(f => ({ ...f, key_skills: f.key_skills.filter(x => x !== s) }))
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const path = `${userId}/avatar-${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('student-profiles').upload(path, file, { upsert: true })
    if (upErr) { setError('Photo upload failed'); setUploadingPhoto(false); return }
    const { data: { publicUrl } } = supabase.storage.from('student-profiles').getPublicUrl(path)
    set('profile_photo_url', publicUrl)
    setUploadingPhoto(false)
  }

  async function uploadCv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCv(true)
    const path = `${userId}/cv-${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await (supabase as any).storage.from('student-cvs').upload(path, file, { upsert: true })
    if (upErr) { setError('CV upload failed'); setUploadingCv(false); return }
    const { data: { publicUrl } } = (supabase as any).storage.from('student-cvs').getPublicUrl(path)
    set('cv_url', publicUrl)
    setUploadingCv(false)
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const payload = {
        email,
        user_id:               userId,
        full_name:             form.full_name || null,
        mobile:                form.mobile || null,
        date_of_birth:         form.date_of_birth || null,
        gender:                form.gender || null,
        profile_photo_url:     form.profile_photo_url || null,
        occupation:            form.occupation || null,
        industry:              form.industry || null,
        work_experience_years: form.work_experience_years ? parseInt(form.work_experience_years) : null,
        current_company:       form.current_company || null,
        job_title:             form.job_title || null,
        key_skills:            form.key_skills.length > 0 ? form.key_skills : null,
        highest_education:     form.highest_education || null,
        edu_institution:       form.edu_institution || null,
        edu_graduation_year:   form.edu_graduation_year ? parseInt(form.edu_graduation_year) : null,
        address_line1:         form.address_line1 || null,
        address_line2:         form.address_line2 || null,
        city:                  form.city || null,
        state:                 form.state || null,
        pincode:               form.pincode || null,
        country:               form.country || 'India',
        linkedin_url:          form.linkedin_url || null,
        github_url:            form.github_url || null,
        instagram_url:         form.instagram_url || null,
        facebook_url:          form.facebook_url || null,
        portfolio_url:         form.portfolio_url || null,
        cv_url:                form.cv_url || null,
        updated_at:            new Date().toISOString(),
      }
      const { error: upsertErr } = await (supabase as any)
        .from('student_profiles')
        .upsert(payload, { onConflict: 'email' })
      if (upsertErr) throw new Error(upsertErr.message)

      // Also update legacy users table name/mobile if present
      await (supabase as any).from('users')
        .update({ name: form.full_name, mobile_no: form.mobile })
        .eq('email', email)

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 pb-16 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">My Profile</h1>
          <p className="text-slate-500 text-sm mt-0.5">Keep your details updated for certificates, AI-Kit delivery and personalised support</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
          style={{ background: saved ? '#16a34a' : 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs text-red-400"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── PROFILE PHOTO + BASIC INFO ────────────────────────────────── */}
      <Section title="Basic Information" icon={User} color="#818cf8">
        <div className="flex items-start gap-6 mb-5">
          {/* Photo */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              {form.profile_photo_url
                ? <Image src={form.profile_photo_url} alt="Profile" width={80} height={80} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl font-black text-slate-600">
                    {(form.full_name || email)[0].toUpperCase()}
                  </div>
              }
            </div>
            <button onClick={() => photoRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white transition-all"
              style={{ background: '#4f46e5' }}>
              {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg">{form.full_name || 'Your Name'}</p>
            <p className="text-slate-400 text-sm">{email}</p>
            <p className="text-slate-600 text-xs mt-1">Click the camera icon to update your photo</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Full Name *</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Arijit Chowdhury" className={inp} />
          </div>
          <div>
            <label className={label}>Mobile Number *</label>
            <input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+91 98765 43210" className={inp} />
          </div>
          <div>
            <label className={label}>Date of Birth</label>
            <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Gender</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inp + ' appearance-none'}>
              <option value="">Select…</option>
              {['Male','Female','Non-binary','Prefer not to say'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* ── PROFESSIONAL ─────────────────────────────────────────────── */}
      <Section title="Professional Details" icon={Briefcase} color="#34d399">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Occupation</label>
            <input value={form.occupation} onChange={e => set('occupation', e.target.value)} placeholder="Software Engineer" className={inp} />
          </div>
          <div>
            <label className={label}>Industry</label>
            <input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Information Technology" className={inp} />
          </div>
          <div>
            <label className={label}>Current Company / Organisation</label>
            <input value={form.current_company} onChange={e => set('current_company', e.target.value)} placeholder="TechCorp Pvt Ltd" className={inp} />
          </div>
          <div>
            <label className={label}>Job Title / Designation</label>
            <input value={form.job_title} onChange={e => set('job_title', e.target.value)} placeholder="Senior Manager" className={inp} />
          </div>
          <div>
            <label className={label}>Work Experience (Years)</label>
            <input type="number" min="0" max="50" value={form.work_experience_years}
              onChange={e => set('work_experience_years', e.target.value)} placeholder="5" className={inp} />
          </div>
        </div>

        {/* Key Skills */}
        <div className="mt-4">
          <label className={label}>Key Skills</label>
          <div className="flex gap-2 mb-2">
            <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="Type skill, press Enter" className={inp + ' flex-1'} />
            <button onClick={addSkill} className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: 'rgba(99,102,241,0.3)' }}>Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.key_skills.map(s => (
              <span key={s} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full cursor-pointer"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}
                onClick={() => removeSkill(s)}>
                {s} ×
              </span>
            ))}
            {form.key_skills.length === 0 && <p className="text-slate-600 text-xs">No skills added yet</p>}
          </div>
        </div>
      </Section>

      {/* ── EDUCATION ─────────────────────────────────────────────────── */}
      <Section title="Education" icon={GraduationCap} color="#fbbf24">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Highest Education</label>
            <select value={form.highest_education} onChange={e => set('highest_education', e.target.value)} className={inp + ' appearance-none'}>
              <option value="">Select…</option>
              {['Class 10 (SSC)','Class 12 (HSC)','Diploma','Bachelor\'s Degree','Master\'s Degree','PhD / Doctorate','Post-Doctoral','Other'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Institution / University</label>
            <input value={form.edu_institution} onChange={e => set('edu_institution', e.target.value)}
              placeholder="IIT Bombay / Mumbai University" className={inp} />
          </div>
          <div>
            <label className={label}>Graduation Year</label>
            <input type="number" min="1970" max="2030" value={form.edu_graduation_year}
              onChange={e => set('edu_graduation_year', e.target.value)} placeholder="2018" className={inp} />
          </div>
        </div>
      </Section>

      {/* ── DELIVERY ADDRESS ──────────────────────────────────────────── */}
      <Section title="Delivery Address (for AI-Kit & Certificate Courier)" icon={MapPin} color="#f472b6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={label}>Address Line 1</label>
            <input value={form.address_line1} onChange={e => set('address_line1', e.target.value)}
              placeholder="Flat / House No, Street Name" className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Address Line 2</label>
            <input value={form.address_line2} onChange={e => set('address_line2', e.target.value)}
              placeholder="Locality / Area / Landmark" className={inp} />
          </div>
          <div>
            <label className={label}>City</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" className={inp} />
          </div>
          <div>
            <label className={label}>State</label>
            <input value={form.state} onChange={e => set('state', e.target.value)} placeholder="Maharashtra" className={inp} />
          </div>
          <div>
            <label className={label}>PIN Code</label>
            <input value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="400001" className={inp} />
          </div>
          <div>
            <label className={label}>Country</label>
            <input value={form.country} onChange={e => set('country', e.target.value)} placeholder="India" className={inp} />
          </div>
        </div>
        <p className="text-slate-600 text-xs mt-3">
          📦 Your AI-Kit and physical certificate will be couriered to this address once your course is completed.
        </p>
      </Section>

      {/* ── SOCIAL & PORTFOLIO ────────────────────────────────────────── */}
      <Section title="Social & Portfolio Links" icon={Link2} color="#60a5fa">
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { key: 'linkedin_url',  label_: 'LinkedIn',   ph: 'https://linkedin.com/in/yourname', icon: '🔗' },
            { key: 'github_url',    label_: 'GitHub',     ph: 'https://github.com/yourname',      icon: '🐙' },
            { key: 'instagram_url', label_: 'Instagram',  ph: 'https://instagram.com/yourname',   icon: '📸' },
            { key: 'facebook_url',  label_: 'Facebook',   ph: 'https://facebook.com/yourname',    icon: '👤' },
            { key: 'portfolio_url', label_: 'Portfolio / Website', ph: 'https://yourname.com',    icon: '🌐' },
          ].map(({ key, label_, ph, icon }) => (
            <div key={key}>
              <label className={label}>{icon} {label_}</label>
              <input value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={ph} className={inp} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── CV UPLOAD ────────────────────────────────────────────────── */}
      <Section title="CV / Resume" icon={FileText} color="#a78bfa">
        <div className="flex items-center gap-4">
          {form.cv_url ? (
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(167,139,250,0.1)' }}>
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">CV uploaded</p>
                <a href={form.cv_url} target="_blank" rel="noopener noreferrer"
                  className="text-indigo-400 text-xs hover:text-indigo-300">View / Download →</a>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm flex-1">No CV uploaded yet</p>
          )}
          <button onClick={() => cvRef.current?.click()} disabled={uploadingCv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
            style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)' }}>
            {uploadingCv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {form.cv_url ? 'Update CV' : 'Upload CV'}
          </button>
          <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={uploadCv} />
        </div>
        <p className="text-slate-600 text-xs mt-3">Accepted formats: PDF, DOC, DOCX. Max 10 MB.</p>
      </Section>

      {/* ── ENROLMENT INFO ────────────────────────────────────────────── */}
      <EnrolmentCard enrolment={enrolment} webinarReg={webinarReg} />

      {/* Save button (bottom too) */}
      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
          style={{ background: saved ? '#16a34a' : 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : saved ? 'Profile Saved!' : 'Save All Changes'}
        </button>
      </div>
    </div>
  )
}
