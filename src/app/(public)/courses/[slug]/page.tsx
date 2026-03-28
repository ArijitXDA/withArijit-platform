import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { PaymentModalTrigger } from '@/components/shared/PaymentModalTrigger'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

export const revalidate = 3600

export async function generateStaticParams() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('awa_courses').select('slug').eq('is_active', true)
  return (data ?? []).map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServiceClient()
  const { data: course } = await supabase
    .from('awa_courses')
    .select('name, description')
    .eq('slug', slug)
    .single()
  if (!course) return {}
  return {
    title: course.name,
    description: course.description ?? undefined,
  }
}

const BENEFITS = [
  { icon: '🎓', label: 'Globally Recognised Certificate', sub: 'Add to LinkedIn immediately' },
  { icon: '🖥️', label: 'Live Interactive Classes', sub: 'With Arijit — not pre-recorded' },
  { icon: '♾️', label: 'Lifetime Access', sub: 'All recordings, forever' },
  { icon: '🔧', label: 'Real Project Portfolio', sub: 'Build AI tools you can show employers' },
  { icon: '📅', label: 'Weekend Sessions Only', sub: 'No weekday disruption' },
  { icon: '🤝', label: 'Career Support & Alumni Network', sub: 'Community of AI professionals' },
]

const TRAINER = {
  name:   'Arijit Chowdhury',
  title:  'IIT Bombay · AI Educator · Entrepreneur',
  bio:    'Arijit has trained 10,000+ professionals across India and globally in AI, Data Science, and Agentic AI. He brings real-world industry experience into every live session — no slides, just hands-on building.',
}

const FAQS = [
  { q: 'Do I need a coding background?',               a: 'No prior coding experience needed. We start from zero and build up progressively.' },
  { q: 'When are the classes?',                         a: 'Weekend live sessions — Saturday and/or Sunday, so your weekdays are unaffected.' },
  { q: 'What if I miss a class?',                       a: 'All sessions are recorded. You get lifetime access to every recording.' },
  { q: 'What certificate do I receive?',                a: 'A globally recognised AI Certification that you can add directly to your LinkedIn profile.' },
  { q: 'Is there a payment plan?',                      a: 'Yes — you can pay 50% now and the remaining 50% later via the 50-50 Plan in the enrolment form.' },
  { q: 'Will fees increase?',                           a: 'Yes — the fee increases approximately 10% each month. Enrol today to lock in the current price.' },
]

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ partner?: string; email?: string; name?: string; mobile?: string; enrol?: string }>
}) {
  const { slug }                                                    = await params
  const { partner, email: sqEmail, name: sqName, mobile: sqMobile } = await searchParams
  const supabase                                                    = createServiceClient()

  const { data: course } = await supabase
    .from('awa_courses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!course) notFound()

  const mrp              = Number(course.mrp)
  const gstPct           = Number(course.gst_percent ?? 18) / 100
  const netBeforeGst     = Math.round(mrp / (1 + gstPct))
  const gstAmount        = mrp - netBeforeGst

  return (
    <div className="min-h-screen bg-[#080e1e] text-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-10 text-center">
        <Badge className="mb-4 text-xs px-3 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
          🔴 Live Hands-on AI Course
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
          {course.name}
        </h1>
        {course.description && (
          <p className="text-slate-300 text-lg mb-6 max-w-2xl mx-auto">{course.description}</p>
        )}

        {/* Urgency */}
        <div className="inline-block bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3 mb-8 text-sm text-amber-300">
          ⚠️ <strong>Fee increases ~10% every month</strong> — enrol now to lock in today's price
        </div>

        {/* Price + CTA */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-black text-white">{formatCurrency(mrp)}</span>
            <div className="text-left text-xs text-slate-400 leading-relaxed">
              <div>incl. 18% GST (₹{gstAmount.toLocaleString('en-IN')})</div>
              <div>net taxable: ₹{netBeforeGst.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <PaymentModalTrigger
            courseId={course.id}
            courseName={course.name}
            price={mrp}
            label="🎓 Enrol Now — Lock Today's Price →"
            className="text-base px-8 py-4 font-bold shadow-lg shadow-indigo-500/30"
            defaultPartnerCode={partner ?? ''}
            defaultEmail={sqEmail ?? ''}
            defaultName={sqName ?? ''}
            defaultMobile={sqMobile ?? ''}
          />

          <p className="text-xs text-slate-500">
            Secured by Razorpay · 256-bit SSL · GST invoice issued · 50-50 payment plan available
          </p>

          {partner && (
            <p className="text-xs text-indigo-400">
              🤝 Referred by partner: <span className="font-mono font-semibold">{partner}</span>
            </p>
          )}
        </div>
      </section>

      {/* ── Benefits grid ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">What You Get</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {BENEFITS.map(b => (
            <div key={b.label}
              className="rounded-2xl p-5 border border-white/8 text-left"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-3xl mb-2">{b.icon}</div>
              <p className="font-semibold text-sm">{b.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{b.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Subjects (if present) ────────────────────────────────────────── */}
      {course.subjects && Array.isArray(course.subjects) && course.subjects.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold text-center mb-6">Curriculum Highlights</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {(course.subjects as string[]).map((s: string) => (
              <span key={s} className="text-sm px-3 py-1.5 rounded-full font-medium"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Trainer ──────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">Your Trainer</h2>
        <div className="rounded-2xl border border-white/8 p-6 flex gap-5 items-start"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <Image src="/arijit-image.png" alt="Arijit Chowdhury" width={64} height={64}
            className="w-16 h-16 rounded-full object-cover object-top shrink-0 border-2 border-indigo-500/30" />
          <div>
            <p className="font-bold text-lg">{TRAINER.name}</p>
            <p className="text-indigo-300 text-sm mb-2">{TRAINER.title}</p>
            <p className="text-slate-400 text-sm leading-relaxed">{TRAINER.bio}</p>
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map(faq => (
            <details key={faq.q} className="rounded-xl border border-white/8 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <summary className="px-5 py-4 cursor-pointer font-semibold text-sm text-slate-200 hover:text-white transition-colors select-none">
                {faq.q}
              </summary>
              <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-extrabold mb-4">Ready to Transform Your Career with AI?</h2>
        <p className="text-slate-400 mb-8">
          Join thousands of professionals, students, and entrepreneurs who have already started their AI journey with Arijit.
        </p>
        <PaymentModalTrigger
          courseId={course.id}
          courseName={course.name}
          price={mrp}
          label="🎓 Enrol Now →"
          className="text-base px-8 py-4 font-bold"
          defaultPartnerCode={partner ?? ''}
          defaultEmail={sqEmail ?? ''}
          defaultName={sqName ?? ''}
          defaultMobile={sqMobile ?? ''}
        />
        <p className="text-xs text-slate-600 mt-4">
          50-50 payment plan available · GST invoice issued · Secured by Razorpay
        </p>
      </section>

    </div>
  )
}
