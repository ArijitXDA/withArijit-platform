import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CourseCard } from '@/components/marketing/CourseCard'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'AI Certification Programmes | oStaran',
  description: 'Enterprise-grade AI certification programmes for working professionals, students, entrepreneurs, leaders, and tech developers. Live classes, globally recognised certificates.',
  keywords: ['AI certification India', 'AI courses online', 'AI training professionals', 'live AI classes', 'oStaran courses'],
}

export default async function CoursesPage() {
  const supabase = await createClient()
  const { data: courses, error } = await supabase
    .from('awa_courses')
    .select('id, name, slug, description, mrp, target_audience, total_sessions, session_duration_mins')
    .eq('is_active', true)
    .order('sort_order')

  if (error) console.error('Failed to fetch courses:', error.message)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-5">
            9 Programmes Available
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-5">
            AI Certification<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #a78bfa, #60a5fa)' }}>
              Built for Every Career Stage
            </span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            From foundational to advanced — live classes, globally recognised certificates,
            and lifetime access to recordings. No coding background needed.
          </p>
        </div>
      </section>

      {/* ── Course grid ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        {(courses ?? []).length === 0 ? (
          <p className="text-center text-gray-500 py-12">Programmes coming soon.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">All Programmes</h2>
                <p className="text-gray-500 text-sm mt-1">Select the programme built for your profile</p>
              </div>
              <span className="text-sm text-gray-400">{(courses ?? []).length} programmes</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(courses ?? []).map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </>
        )}

        {/* ── Free webinar CTA ─────────────────────────────────────── */}
        <div className="mt-20 text-center p-10 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Not sure which programme to choose?</h3>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            Join our FREE 90-minute AI Certification Webinar first.
            Experience the teaching style and decide with confidence.
          </p>
          <a href="/free-webinar"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            Join Free Webinar →
          </a>
        </div>
      </section>
    </div>
  )
}
