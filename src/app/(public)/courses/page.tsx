import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CourseCard } from '@/components/marketing/CourseCard'
import { ConsultationCard } from '@/components/marketing/ConsultationCard'

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
    .select('id, name, slug, description, mrp, target_audience, total_sessions, session_duration_mins, course_format, owner_mentor_id, trainer_name, tenure_type')
    .eq('is_active', true)
    .order('sort_order')

  if (error) console.error('Failed to fetch courses:', error.message)

  const all = courses ?? []
  // Expert Consultation is a per-hour USD advisory, not a cohort course — keep it out of the
  // course grid and show it as a purpose-built card linking to its own booking flow.
  const consultation   = all.find((c: any) => c.tenure_type === 'consultation') ?? null
  const courseList     = all.filter((c: any) => c.tenure_type !== 'consultation')
  const ostaranCourses = courseList.filter((c: any) => !c.owner_mentor_id)
  const mentorCourses  = courseList.filter((c: any) => c.owner_mentor_id)

  // Live "starting from" rate for the consultation card — lowest fixed per-hour USD rate
  // (mirrors the /expert-consultation hero, so the two never drift). Quote-only → null.
  let consultationFromRate: number | null = null
  if (consultation) {
    const { data: cTypes } = await supabase
      .from('consultation_project_types')
      .select('price_per_hour_usd, is_dynamic')
      .eq('is_active', true)
    const fixed = (cTypes ?? [])
      .filter((t: any) => !t.is_dynamic && t.price_per_hour_usd != null)
      .map((t: any) => Number(t.price_per_hour_usd))
    consultationFromRate = fixed.length ? Math.min(...fixed) : null
  }

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
        {all.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Programmes coming soon.</p>
        ) : (
          <>
            {/* oStaran programmes */}
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">oStaran Programmes</h2>
                <p className="text-gray-500 text-sm mt-1">Live AI certifications taught by Arijit Chowdhury</p>
              </div>
              <span className="text-sm text-gray-400">{ostaranCourses.length} programmes</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ostaranCourses.map((course: any) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>

            {/* Mentor programmes */}
            {mentorCourses.length > 0 && (
              <div className="mt-20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Mentor Programmes</h2>
                    <p className="text-gray-500 text-sm mt-1">Courses by expert professors &amp; trainers on oStaran</p>
                  </div>
                  <span className="text-sm text-gray-400">{mentorCourses.length} programmes</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-7">
                  {mentorCourses.map((course: any) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 1:1 Expert Advisory (Consultation — not a cohort course) ── */}
        {consultation && (
          <div className="mt-20">
            <div className="mb-3">
              <h2 className="text-2xl font-bold text-gray-900">1:1 Expert Advisory</h2>
              <p className="text-gray-500 text-sm mt-1">
                Not a cohort course — book a live consultation on your own AI project, priced per hour, in your timezone
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-7">
              <ConsultationCard fromRate={consultationFromRate} />
            </div>
          </div>
        )}

        {/* ── Masterclass CTA ───────────────────────────────────────── */}
        <div className="mt-20 text-center p-10 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Want to experience it before committing?</h3>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            Join our 90-minute live AI Certification session this Sunday.
            Get certified, hands-on, and decide your next step with confidence.
          </p>
          <a href="/masterclass"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            Get Certified This Sunday →
          </a>
        </div>
      </section>
    </div>
  )
}
