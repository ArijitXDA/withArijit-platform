import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { PaymentModalTrigger } from '@/components/shared/PaymentModalTrigger'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface EnrollPageProps {
  params:      Promise<{ slug: string }>
  searchParams: Promise<{
    email?:      string
    name?:       string
    mobile?:     string
    partner?:    string
    utm_source?: string
    ref?:        string
  }>
}

export default async function EnrollPage({ params, searchParams }: EnrollPageProps) {
  const { slug }  = await params
  const sp        = await searchParams
  const supabase  = createServiceClient()

  // Find course by slug
  const { data: course } = await supabase
    .from('awa_courses')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!course) notFound()

  // Resolve partner code: ?partner= wins, then ?utm_source=, then ?ref= lookup
  let partnerCode = sp.partner || sp.utm_source || ''
  if (!partnerCode && sp.ref) {
    // ?ref= is the student's email from the join page invite — look up their partner code
    const { data: reg } = await supabase
      .from('qr_landing_registrations')
      .select('utm_source')
      .eq('email', sp.ref)
      .not('utm_source', 'is', null)
      .order('registered_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (reg?.utm_source) partnerCode = reg.utm_source
  }

  // If student email was passed, check if already registered / enrolled
  let studentName   = sp.name   || ''
  let studentEmail  = sp.email  || ''
  let studentMobile = sp.mobile || ''

  if (studentEmail && !studentName) {
    const { data: reg } = await supabase
      .from('qr_landing_registrations')
      .select('full_name, mobile')
      .eq('email', studentEmail)
      .order('registered_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (reg) {
      studentName   = reg.full_name  || ''
      studentMobile = reg.mobile     || ''
    }
  }

  const mrp            = Number(course.mrp)
  const hasPartner     = !!partnerCode

  // Benefit lines per course slug
  const BENEFITS: Record<string, string[]> = {
    'ai-mastery-programme': [
      '🤖 Python, ML & Generative AI from scratch',
      '📜 Industry-recognised AI Certificate',
      '🛠️ 20+ real-world projects in your portfolio',
      '🎓 Live weekend sessions + lifetime recordings',
      '💼 Career support & AI job placement guidance',
    ],
    'agentic-ai-development': [
      '⚡ Build production-grade AI Agents & pipelines',
      '🚀 LangChain, CrewAI, LLMs & RAG systems',
      '💻 Vibe Coding & Advanced Prompting mastery',
      '☁️ Deploy AI apps to cloud (live projects)',
      '📜 Globally recognised AI Developer certificate',
    ],
  }
  const benefits = BENEFITS[slug] ?? [
    '🤖 Hands-on AI training from industry expert',
    '📜 Globally recognised certificate',
    '🛠️ Real projects — no theory-only learning',
    '🎓 Live sessions + lifetime recording access',
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          {hasPartner && (
            <Badge className="bg-green-600/20 text-green-400 border border-green-600/30 mb-2">
              🎓 Exclusive offer from your AI Partner
            </Badge>
          )}
          <p className="text-indigo-300 text-sm font-semibold uppercase tracking-widest">
            You attended the FREE webinar — now take the next step
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            Enrol in<br />
            <span className="text-indigo-400">{course.name}</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            {course.description}
          </p>

          {/* Price */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <span className="text-4xl font-black text-white">{formatCurrency(mrp)}</span>
            <div className="text-left">
              <p className="text-gray-400 text-xs">+ 18% GST</p>
              <p className="text-green-400 text-xs font-semibold">50-50 plan available</p>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <PaymentModalTrigger
              courseId={course.id}
              courseName={course.name}
              price={mrp}
              label="Enrol Now — Secure My Seat →"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-base px-8 py-4 h-auto"
              defaultName={studentName}
              defaultEmail={studentEmail}
              defaultMobile={studentMobile}
              defaultPartnerCode={partnerCode}
            />
          </div>
          <p className="text-gray-500 text-xs">
            Secured by Razorpay · GST invoice issued automatically · 100% safe
          </p>
        </div>
      </div>

      {/* What you get */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        {/* Benefits */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What you get with this programme</h2>
          <ul className="space-y-3">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="text-lg leading-none">{b.split(' ')[0]}</span>
                <span>{b.split(' ').slice(1).join(' ')}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trainer */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
          <img
            src="/trainer-arijit.jpg"
            alt="Arijit Chowdhury"
            className="w-20 h-20 rounded-full object-cover shrink-0 border-2 border-indigo-200"
          />
          <div>
            <p className="font-bold text-gray-900">Arijit Chowdhury</p>
            <p className="text-gray-500 text-sm mt-0.5">
              AI Researcher & Trainer — Agentic AI & Quantum Computing<br />
              IIT Bombay · Star Analytix · NLDIBM
            </p>
            <a
              href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 text-xs font-medium hover:underline mt-1 inline-block"
            >
              LinkedIn Profile →
            </a>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Common questions</h2>
          {[
            ['Is this the same as the free webinar?', 'No — the webinar was a 90-minute taster. The full programme is 4 months of live weekend sessions, hands-on projects, mentorship, and a certificate.'],
            ['Can I pay in instalments?', 'Yes — choose the 50-50 plan: pay half now and the other half later. No interest, no hidden fees.'],
            ['What if I already attended the webinar?', "You're already halfway there! Your learning continues from where the webinar ended — no repetition."],
            ['Will I get a certificate?', 'Yes — an industry-recognised AI certificate you can add to your LinkedIn and resume.'],
          ].map(([q, a]) => (
            <div key={q} className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="font-semibold text-gray-900 text-sm">{q}</p>
              <p className="text-gray-600 text-sm mt-1.5">{a}</p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Ready to transform your career?</h2>
          <p className="text-gray-600 text-sm">
            Join thousands of professionals who have already taken this step.
          </p>
          <PaymentModalTrigger
            courseId={course.id}
            courseName={course.name}
            price={mrp}
            label={`Enrol in ${course.name} →`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
            defaultName={studentName}
            defaultEmail={studentEmail}
            defaultMobile={studentMobile}
            defaultPartnerCode={partnerCode}
          />
          <p className="text-gray-400 text-xs">
            Questions? WhatsApp us at{' '}
            <a href="https://wa.me/919930051053" className="text-indigo-600 hover:underline">
              +91 99300 51053
            </a>
          </p>
        </div>

        {/* Back link */}
        <p className="text-center">
          <Link href="/courses" className="text-sm text-gray-400 hover:text-gray-600">
            ← View all courses
          </Link>
        </p>
      </div>
    </div>
  )
}
