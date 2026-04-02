'use client'
import { useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, Send } from 'lucide-react'

type EnquiryType = 'student' | 'corporate' | 'partner' | 'investor' | 'media' | 'support' | 'career' | 'other' | ''

const ENQUIRY_TYPES = [
  { value: 'student',   label: '🎓 Student / Course Enquiry'        },
  { value: 'corporate', label: '🏢 Corporate Training'               },
  { value: 'partner',   label: '🤝 Partnership / Become a Partner'   },
  { value: 'investor',  label: '📈 Investor Relations'               },
  { value: 'media',     label: '📰 Media & Press Enquiry'            },
  { value: 'support',   label: '🛠 Technical / Platform Support'     },
  { value: 'career',    label: '💼 Career at oStaran'                },
  { value: 'other',     label: '💬 Other'                            },
]

const COURSES = [
  'AI Mastery Programme',
  'AI Mastery for Working Professionals',
  'AI Mastery for Students & Graduates',
  'AI Mastery for Entrepreneurs',
  'AI Mastery for Leaders & CXOs',
  'AI Mastery for School Students',
  'AI Mastery for Homemakers',
  'Master of Agentic AI Development',
  'Master of Quantum Computing & AI',
]

const BATCH_PREFS = ['Weekend Morning (8–10 AM)', 'Weekend Afternoon (1–4 PM)', 'Weekend Evening (5–8 PM)', 'Weekday Evening (7–9 PM)', 'Flexible']
const TEAM_SIZES  = ['1–5', '6–20', '21–50', '51–100', '100+']

export function ContactForm() {
  const [form, setForm] = useState({
    name: '', email: '', mobile: '', enquiry_type: '' as EnquiryType, message: '',
    // student extras
    course_interest: '', batch_preference: '',
    // corporate extras
    company_name: '', team_size: '', training_topic: '',
    // partner extras
    org_type: '', city: '',
    // investor/media extras
    organisation: '', brief: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function f(key: string, val: string) { setForm(prev => ({ ...prev, [key]: val })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.enquiry_type) return
    setStatus('submitting')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Submission failed')
      setStatus('success')
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Message sent!</h3>
        <p className="text-gray-600 text-sm max-w-sm mx-auto">
          Thank you for reaching out. Our team will respond within 1 business day.
          A confirmation has been sent to <strong>{form.email}</strong>.
        </p>
        <button onClick={() => setStatus('idle')} className="text-sm text-indigo-600 hover:underline mt-2">
          Send another message
        </button>
      </div>
    )
  }

  const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
  const sel = inp + " appearance-none"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Name + Email */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
          <input type="text" required value={form.name} onChange={e => f('name', e.target.value)}
            placeholder="Your full name" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address *</label>
          <input type="email" required value={form.email} onChange={e => f('email', e.target.value)}
            placeholder="you@example.com" className={inp} />
        </div>
      </div>

      {/* Mobile */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mobile Number</label>
        <div className="flex gap-2">
          <span className="flex items-center px-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-600 font-medium shrink-0">+91</span>
          <input type="tel" value={form.mobile} onChange={e => f('mobile', e.target.value)}
            placeholder="9876543210" className={inp} maxLength={10} />
        </div>
      </div>

      {/* Enquiry type */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Enquiry Type *</label>
        <select required value={form.enquiry_type} onChange={e => f('enquiry_type', e.target.value)} className={sel}>
          <option value="">Select what best describes your enquiry…</option>
          {ENQUIRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* ── Dynamic fields by enquiry type ── */}

      {form.enquiry_type === 'student' && (
        <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
          <div>
            <label className="block text-xs font-semibold text-indigo-700 mb-1.5">Course Interest</label>
            <select value={form.course_interest} onChange={e => f('course_interest', e.target.value)} className={sel}>
              <option value="">Select a programme…</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-indigo-700 mb-1.5">Preferred Batch Timing</label>
            <select value={form.batch_preference} onChange={e => f('batch_preference', e.target.value)} className={sel}>
              <option value="">Any timing</option>
              {BATCH_PREFS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      )}

      {form.enquiry_type === 'corporate' && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1.5">Company Name</label>
              <input type="text" value={form.company_name} onChange={e => f('company_name', e.target.value)}
                placeholder="Acme Corp" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1.5">Team Size</label>
              <select value={form.team_size} onChange={e => f('team_size', e.target.value)} className={sel}>
                <option value="">Select size…</option>
                {TEAM_SIZES.map(s => <option key={s} value={s}>{s} people</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-700 mb-1.5">Training Topic / Objective</label>
            <input type="text" value={form.training_topic} onChange={e => f('training_topic', e.target.value)}
              placeholder="e.g. AI for HR teams, Generative AI for marketing…" className={inp} />
          </div>
        </div>
      )}

      {form.enquiry_type === 'partner' && (
        <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
          <div>
            <label className="block text-xs font-semibold text-amber-700 mb-1.5">Organisation / Role</label>
            <input type="text" value={form.org_type} onChange={e => f('org_type', e.target.value)}
              placeholder="e.g. Educator, Coach, Entrepreneur…" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-700 mb-1.5">City</label>
            <input type="text" value={form.city} onChange={e => f('city', e.target.value)}
              placeholder="Mumbai, Delhi…" className={inp} />
          </div>
        </div>
      )}

      {(form.enquiry_type === 'investor' || form.enquiry_type === 'media') && (
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-purple-700 mb-1.5">Organisation</label>
            <input type="text" value={form.organisation} onChange={e => f('organisation', e.target.value)}
              placeholder="Fund / Media house / Company name" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-purple-700 mb-1.5">Brief note</label>
            <textarea value={form.brief} onChange={e => f('brief', e.target.value)} rows={2}
              placeholder="What would you like to discuss or cover?" className={inp + ' resize-none'} />
          </div>
        </div>
      )}

      {/* Message */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message</label>
        <textarea value={form.message} onChange={e => f('message', e.target.value)} rows={4}
          placeholder="Tell us more about what you need…"
          className={inp + ' resize-none'} />
      </div>

      {/* Honeypot (hidden) */}
      <input type="text" name="_honey" className="hidden" tabIndex={-1} autoComplete="off" />

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={15} /> {errorMsg || 'Something went wrong. Please try again.'}
        </div>
      )}

      <button type="submit" disabled={status === 'submitting'}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
        {status === 'submitting'
          ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
          : <><Send size={16} /> Send Message</>}
      </button>

      <p className="text-xs text-center text-gray-400">
        By submitting, you agree to our{' '}
        <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>.
        We never sell your data.
      </p>
    </form>
  )
}
