import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'
import { Upload, Users, Briefcase, ArrowRight, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'Find AI Jobs',
  description: 'Share your resume and get discovered by AI-hiring partners in our network.',
  alternates: { canonical: 'https://www.ostaran.com/find-ai-job' },
}

const BENEFITS = [
  {
    icon: Upload,
    title: 'One resume, many opportunities',
    desc: 'Upload once. We match you against AI roles opening across our hiring partner network.',
  },
  {
    icon: Sparkles,
    title: 'AI-tailored course recommendations',
    desc: 'Based on your background, we point you to the oStaran programmes that bridge the gap.',
  },
  {
    icon: Users,
    title: 'Community access',
    desc: 'Join India\'s most active AI learning community. Daily discussions, events, and job leads.',
  },
]

export default function FindAIJobPage() {
  return (
    <div>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
               style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
            <Briefcase size={12} /> AI Jobs · India-first, global roles welcome
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Find AI roles that fit<br />where you are today.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Share your resume with oStaran. We&apos;ll match you to AI, agentic AI, and quantum roles from our hiring partner network — and recommend the programme that gets you there.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/resume/apply"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'bg-indigo-600 hover:bg-indigo-500 text-white px-8'
              )}
            >
              <Upload className="mr-2 h-4 w-4" />
              Submit your resume now
            </Link>
            <Link
              href="/courses"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-white/20 text-white hover:bg-white/10'
              )}
            >
              Browse courses first
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Takes about 2 minutes · No payment needed · Your data stays private
          </p>
        </div>
      </section>

      {/* ── What you get ───────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Why share your resume with oStaran?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {BENEFITS.map(b => {
              const Icon = b.icon
              return (
                <div key={b.title} className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
                    <Icon size={20} className="text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{b.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{b.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Already a student CTA ──────────────────────────────────────── */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Already have an oStaran account?</h3>
              <p className="text-sm text-gray-600">
                Sign in to update the resume on your profile — your existing CV will be replaced.
              </p>
            </div>
            <Link
              href="/dashboard/career"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition-colors shrink-0"
            >
              Update my CV <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-br from-indigo-900 to-gray-950 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Your next AI role starts with a resume.</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            No guarantees, no gimmicks — just a focused channel between you, the right course, and hiring partners who need AI-ready talent.
          </p>
          <Link
            href="/resume/apply"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'bg-indigo-500 hover:bg-indigo-400 text-white px-10'
            )}
          >
            Submit your resume →
          </Link>
        </div>
      </section>
    </div>
  )
}
