'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  User, Phone, Briefcase, GraduationCap, MapPin, Link2,
  Upload, Save, CheckCircle, AlertCircle, Loader2, Camera,
  BookOpen, FileText, Shield,
} from 'lucide-react'
import CvUploadCard from '@/components/student/CvUploadCard'

// ── Light-theme tokens ────────────────────────────────────────────────────────
const T = {
  surface: '#ffffff', border: '#dce6f5', borderLight: '#e8f0fc',
  navy: '#0f1f3d', blue: '#2563eb', blueLight: '#eff6ff', bluePale: '#dbeafe',
  textPrimary: '#0f1f3d', textSec: '#475569', textMuted: '#94a3b8',
  green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#bbf7d0',
  amber: '#d97706', amberBg: '#fffbeb', amberBorder: '#fde68a',
  indigo: '#4f46e5', indigoBg: '#eef2ff', indigoBorder: '#c7d2fe',
  red: '#dc2626', redBg: '#fef2f2', redBorder: '#fecaca',
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBorder: '#ddd6fe',
}

// Input + label styles (light theme)
const inp = [
  'w-full bg-white rounded-xl px-3 py-2.5 text-sm',
  'text-[#0f1f3d] placeholder-[#94a3b8]',
  'border border-[#dce6f5]',
  'focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100',
  'transition-colors',
].join(' ')

const lbl = 'text-xs font-semibold text-[#475569] uppercase tracking-wide block mb-1.5'

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color, colorBg, children }: {
  title: string; icon: any; color: string; colorBg: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${T.border}` }}>
      <div className="px-5 py-4 border-b flex items-center gap-2.5"
        style={{ borderColor: T.borderLight, background: colorBg }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: color + '22', border: `1px solid ${color}44` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <h2 className="font-bold text-sm" style={{ color: T.navy }}>{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':'); const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

// ── Enrolment card (read-only) ────────────────────────────────────────────────
function EnrolmentCard({ enrolment, webinarReg }: { enrolment: any; webinarReg: any }) {
  if (!enrolment && !webinarReg) return null
  const course  = enrolment?.course
  const batch   = enrolment?.batch
  const partner = enrolment?.partner

  const infoRow = (label: string, children: React.ReactNode) => (
    <div>
      <p className={lbl}>{label}</p>
      {children}
    </div>
  )

  return (
    <Section title="My Course & Enrolment" icon={BookOpen} color={T.indigo} colorBg={T.indigoBg}>
      <div className="grid sm:grid-cols-2 gap-4">
        {course?.name && infoRow('Course',
          <div>
            <p className="font-semibold text-sm" style={{ color: T.textPrimary }}>{course.name}</p>
            {(batch?.total_sessions ?? course.total_sessions) && (
              <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                {batch?.variant === 'rolling'
                  ? `Weekly · ${batch?.duration_mins ?? course.session_duration_mins ?? 60} mins each · ongoing`
                  : `${batch?.total_sessions ?? course.total_sessions} sessions · ${batch?.duration_mins ?? course.session_duration_mins ?? 60} mins each`}
              </p>
            )}
          </div>
        )}
        {batch?.label && infoRow('Batch / Timeslot',
          <div>
            <p className="font-semibold text-sm" style={{ color: T.textPrimary }}>{batch.label}</p>
            <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
              {batch.day_of_week} {fmtTime(batch.start_time)} IST
              {batch.start_date ? ` · Starts ${fmtDate(batch.start_date)}` : ''}
            </p>
          </div>
        )}
        {batch?.meeting_link && infoRow('Join Link',
          <a href={batch.meeting_link} target="_blank" rel="noopener noreferrer"
            className="text-sm font-medium flex items-center gap-1 hover:underline"
            style={{ color: T.blue }}>
            <Link2 size={12} /> {batch.meeting_platform ?? 'Join Class'}
          </a>
        )}
        {batch?.instructor_name && infoRow('Trainer',
          <p className="font-semibold text-sm" style={{ color: T.textPrimary }}>{batch.instructor_name}</p>
        )}
        {enrolment?.amount_paid && infoRow('Amount Paid',
          <div>
            <p className="font-bold" style={{ color: T.green }}>
              ₹{Math.round(Number(enrolment.amount_paid)).toLocaleString('en-IN')}
            </p>
            {enrolment.payment_date && (
              <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{fmtDate(enrolment.payment_date)}</p>
            )}
          </div>
        )}
        {webinarReg?.created_at && infoRow('Webinar Registration',
          <p className="font-semibold text-sm" style={{ color: T.textPrimary }}>{fmtDate(webinarReg.created_at)}</p>
        )}
        {partner && (
          <div className="sm:col-span-2 rounded-xl p-3"
            style={{ background: T.indigoBg, border: `1px solid ${T.indigoBorder}` }}>
            <p className={lbl}>Referred / Enrolled by Partner</p>
            <p className="font-semibold text-sm mt-1" style={{ color: T.textPrimary }}>{partner.full_name}</p>
            <p className="text-xs mt-0.5" style={{ color: T.textSec }}>
              Code: <span className="font-mono" style={{ color: T.indigo }}>{partner.partner_code}</span>
            </p>
            {partner.mobile && <p className="text-xs" style={{ color: T.textMuted }}>{partner.mobile}</p>}
            {partner.email  && <p className="text-xs" style={{ color: T.textMuted }}>{partner.email}</p>}
          </div>
        )}
      </div>
    </Section>
  )
}

// ── Security section ────────────────────────────────────────────────────────
function SecuritySection({ email }: { email: string }) {
  const [pwState, setPwState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  async function sendReset() {
    setPwState('loading')
    try {
      const res = await fetch('/api/auth/send-password-reset', { method: 'POST' })
      setPwState(res.ok ? 'sent' : 'error')
    } catch {
      setPwState('error')
    }
  }

  return (
    <Section title="Account Security" icon={Shield} color="#7c3aed" colorBg="#f5f3ff">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>Password</p>
          <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
            Sign-in email: <span className="font-mono" style={{ color: T.blue }}>{email}</span>
          </p>
          <p className="text-xs mt-1" style={{ color: T.textSec }}>
            If you signed in with Google or Magic Link, you may not have a password yet.
            Click below to set or change your password via a secure email link.
          </p>
        </div>
        <div className="shrink-0">
          {pwState === 'idle' && (
            <button
              onClick={sendReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-sm"
              style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}
            >
              <Shield size={14} /> Set / Change Password
            </button>
          )}
          {pwState === 'loading' && (
            <button disabled className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold opacity-60"
              style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
              <Loader2 size={14} className="animate-spin" /> Sending...
            </button>
          )}
          {pwState === 'sent' && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}>
              <CheckCircle size={14} /> Reset link sent!
            </div>
          )}
          {pwState === 'error' && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}` }}>
              <AlertCircle size={14} /> Failed — try again
            </div>
          )}
        </div>
      </div>
      {pwState === 'sent' && (
        <p className="text-xs mt-3 rounded-xl px-3 py-2" style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}>
          📧 Check your inbox at <strong>{email}</strong> for the password reset link.
          Click it and follow the instructions to set your new password.
          The link expires in 1 hour.
        </p>
      )}
    </Section>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Profile {
  full_name?: string; mobile?: string; date_of_birth?: string; gender?: string
  profile_photo_url?: string; occupation?: string; industry?: string
  work_experience_years?: number; current_company?: string; job_title?: string
  key_skills?: string[]; highest_education?: string; edu_institution?: string
  edu_graduation_year?: number; address_line1?: string; address_line2?: string
  city?: string; state?: string; pincode?: string; country?: string
  linkedin_url?: string; github_url?: string; instagram_url?: string
  facebook_url?: string; portfolio_url?: string; cv_url?: string
}

export default function ProfileClient({ email, userId, profile, enrolment, webinarReg, legacyUser }: {
  email: string; userId: string; profile: Profile | null
  enrolment: any; webinarReg: any; legacyUser: any
}) {
  const supabase = createClient()
  const photoRef = useRef<HTMLInputElement>(null)

  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [error,          setError]          = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [skillInput,     setSkillInput]     = useState('')

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
    if (s && !form.key_skills.includes(s)) setForm(f => ({ ...f, key_skills: [...f.key_skills, s] }))
    setSkillInput('')
  }
  function removeSkill(s: string) {
    setForm(f => ({ ...f, key_skills: f.key_skills.filter(x => x !== s) }))
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingPhoto(true)
    const path = `${userId}/avatar-${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('student-profiles').upload(path, file, { upsert: true })
    if (upErr) { setError('Photo upload failed'); setUploadingPhoto(false); return }
    const { data: { publicUrl } } = supabase.storage.from('student-profiles').getPublicUrl(path)
    set('profile_photo_url', publicUrl)
    setUploadingPhoto(false)
  }

  // ── CV upload is handled by the CvUploadCard + /api/student/cv/upload ──────
  // (authenticated, writes storage path directly to student_profiles.cv_url).

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const payload = {
        email, user_id: userId,
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
        // NOTE: cv_url is written by the CV upload API (/api/student/cv/upload);
        // we no longer include it in this save payload so an empty form value
        // can never overwrite an uploaded resume.
        updated_at:            new Date().toISOString(),
      }
      const { error: upsertErr } = await (supabase as any)
        .from('student_profiles').upsert(payload, { onConflict: 'email' })
      if (upsertErr) throw new Error(upsertErr.message)
      await (supabase as any).from('users')
        .update({ name: form.full_name, mobile_no: form.mobile }).eq('email', email)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const SaveBtn = ({ bottom = false }: { bottom?: boolean }) => (
    <button onClick={handleSave} disabled={saving}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
      style={{ background: saved ? T.green : `linear-gradient(135deg, ${T.blue}, ${T.indigo})` }}>
      {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
      {saving ? 'Saving…' : saved ? (bottom ? 'All Changes Saved!' : 'Saved!') : (bottom ? 'Save All Changes' : 'Save Profile')}
    </button>
  )

  return (
    <div className="space-y-5 pb-16 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: T.navy }}>My Profile</h1>
          <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
            Keep your details updated for certificates, AI-Kit delivery and personalised support
          </p>
        </div>
        <SaveBtn />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs"
          style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red }}>
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* ── Basic Information ──────────────────────────────────────────── */}
      <Section title="Basic Information" icon={User} color={T.blue} colorBg={T.blueLight}>
        <div className="flex items-start gap-6 mb-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2"
              style={{ background: T.blueLight, borderColor: T.bluePale }}>
              {form.profile_photo_url
                ? <Image src={form.profile_photo_url} alt="Profile" width={80} height={80} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ color: T.blue }}>
                    {(form.full_name || email)[0].toUpperCase()}
                  </div>
              }
            </div>
            <button onClick={() => photoRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white"
              style={{ background: T.blue }}>
              {uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg" style={{ color: T.textPrimary }}>{form.full_name || 'Your Name'}</p>
            <p className="text-sm" style={{ color: T.textMuted }}>{email}</p>
            <p className="text-xs mt-1" style={{ color: T.textMuted }}>Click the camera icon to update your photo</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Full Name *</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" className={inp} />
          </div>
          <div>
            <label className={lbl}>Mobile Number *</label>
            <input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+91 98765 43210" className={inp} />
          </div>
          <div>
            <label className={lbl}>Date of Birth</label>
            <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Gender</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inp + ' appearance-none'}>
              <option value="">Select…</option>
              {['Male','Female','Non-binary','Prefer not to say'].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* ── Professional ─────────────────────────────────────────────── */}
      <Section title="Professional Details" icon={Briefcase} color={T.green} colorBg={T.greenBg}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={lbl}>Occupation</label>
            <input value={form.occupation} onChange={e => set('occupation', e.target.value)} placeholder="Software Engineer" className={inp} />
          </div>
          <div><label className={lbl}>Industry</label>
            <input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Information Technology" className={inp} />
          </div>
          <div><label className={lbl}>Current Company</label>
            <input value={form.current_company} onChange={e => set('current_company', e.target.value)} placeholder="TechCorp Pvt Ltd" className={inp} />
          </div>
          <div><label className={lbl}>Job Title / Designation</label>
            <input value={form.job_title} onChange={e => set('job_title', e.target.value)} placeholder="Senior Manager" className={inp} />
          </div>
          <div><label className={lbl}>Work Experience (Years)</label>
            <input type="number" min="0" max="50" value={form.work_experience_years}
              onChange={e => set('work_experience_years', e.target.value)} placeholder="5" className={inp} />
          </div>
        </div>
        {/* Skills */}
        <div className="mt-4">
          <label className={lbl}>Key Skills</label>
          <div className="flex gap-2 mb-2">
            <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="Type skill, press Enter" className={inp + ' flex-1'} />
            <button onClick={addSkill}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: T.blue }}>Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.key_skills.map(s => (
              <span key={s} onClick={() => removeSkill(s)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full cursor-pointer font-medium"
                style={{ background: T.indigoBg, color: T.indigo, border: `1px solid ${T.indigoBorder}` }}>
                {s} ×
              </span>
            ))}
            {form.key_skills.length === 0 && (
              <p className="text-xs" style={{ color: T.textMuted }}>No skills added yet</p>
            )}
          </div>
        </div>
      </Section>

      {/* ── Education ─────────────────────────────────────────────────── */}
      <Section title="Education" icon={GraduationCap} color={T.amber} colorBg={T.amberBg}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={lbl}>Highest Education</label>
            <select value={form.highest_education} onChange={e => set('highest_education', e.target.value)} className={inp + ' appearance-none'}>
              <option value="">Select…</option>
              {["Class 10 (SSC)","Class 12 (HSC)","Diploma","Bachelor's Degree","Master's Degree","PhD / Doctorate","Post-Doctoral","Other"].map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Institution / University</label>
            <input value={form.edu_institution} onChange={e => set('edu_institution', e.target.value)} placeholder="IIT Bombay / Mumbai University" className={inp} />
          </div>
          <div><label className={lbl}>Graduation Year</label>
            <input type="number" min="1970" max="2030" value={form.edu_graduation_year}
              onChange={e => set('edu_graduation_year', e.target.value)} placeholder="2018" className={inp} />
          </div>
        </div>
      </Section>

      {/* ── Address ───────────────────────────────────────────────────── */}
      <Section title="Delivery Address (for AI-Kit & Certificate Courier)" icon={MapPin} color="#db2777" colorBg="#fdf2f8">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={lbl}>Address Line 1</label>
            <input value={form.address_line1} onChange={e => set('address_line1', e.target.value)} placeholder="Flat / House No, Street Name" className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Address Line 2</label>
            <input value={form.address_line2} onChange={e => set('address_line2', e.target.value)} placeholder="Locality / Area / Landmark" className={inp} />
          </div>
          <div><label className={lbl}>City</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" className={inp} />
          </div>
          <div><label className={lbl}>State</label>
            <input value={form.state} onChange={e => set('state', e.target.value)} placeholder="Maharashtra" className={inp} />
          </div>
          <div><label className={lbl}>PIN Code</label>
            <input value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="400001" className={inp} />
          </div>
          <div><label className={lbl}>Country</label>
            <input value={form.country} onChange={e => set('country', e.target.value)} placeholder="India" className={inp} />
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: T.textMuted }}>
          📦 Your AI-Kit and physical certificate will be couriered to this address once your course is completed.
        </p>
      </Section>

      {/* ── Social Links ──────────────────────────────────────────────── */}
      <Section title="Social & Portfolio Links" icon={Link2} color={T.blue} colorBg={T.blueLight}>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { key: 'linkedin_url',  label_: 'LinkedIn',          ph: 'https://linkedin.com/in/yourname', icon: '🔗' },
            { key: 'github_url',    label_: 'GitHub',            ph: 'https://github.com/yourname',      icon: '🐙' },
            { key: 'instagram_url', label_: 'Instagram',         ph: 'https://instagram.com/yourname',   icon: '📸' },
            { key: 'facebook_url',  label_: 'Facebook',          ph: 'https://facebook.com/yourname',    icon: '👤' },
            { key: 'portfolio_url', label_: 'Portfolio/Website', ph: 'https://yourname.com',            icon: '🌐' },
          ].map(({ key, label_, ph, icon }) => (
            <div key={key}>
              <label className={lbl}>{icon} {label_}</label>
              <input value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={ph} className={inp} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── CV / Resume ──────────────────────────────────────────────── */}
      <Section title="CV / Resume" icon={FileText} color={T.purple} colorBg={T.purpleBg}>
        <CvUploadCard
          variant="inline"
          initialCvPath={form.cv_url || null}
          onChange={(path) => set('cv_url', path ?? '')}
          showStructuredFormCta={false}
        />
        <p className="text-xs mt-3" style={{ color: T.textMuted }}>
          Accepted formats: PDF, DOC, DOCX. Max 10 MB. Your resume stays private — only you and oStaran staff can access it.
        </p>
      </Section>

      {/* ── Account Security ─────────────────────────────────────────── */}
      <SecuritySection email={email} />

      {/* Enrolment info */}
      <EnrolmentCard enrolment={enrolment} webinarReg={webinarReg} />

      {/* Bottom save */}
      <div className="flex justify-end pt-2">
        <SaveBtn bottom />
      </div>
    </div>
  )
}


