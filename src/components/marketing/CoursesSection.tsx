import Link from 'next/link'
import { CourseCard } from './CourseCard'

interface CoursesSectionProps {
  courses: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    mrp: number | null
    target_audience?: string | null
    total_sessions?: number | null
    session_duration_mins?: number | null
  }>
}

export function CoursesSection({ courses }: CoursesSectionProps) {
  return (
    <section className="py-20 px-4" style={{ background: 'var(--os-page)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border mb-4" style={{ background: 'var(--os-surface)', color: 'var(--os-accent-soft)', borderColor: 'var(--os-pill-line)' }}>
            {courses.length} Programmes Available
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: 'var(--os-ink)' }}>
            AI Programmes & Certifications
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--os-muted)' }}>
            From foundational skills to advanced certifications — live classes, global certificates, lifetime access.
          </p>
        </div>

        {courses.length === 0 ? (
          <p className="text-center py-12" style={{ color: 'var(--os-muted)' }}>Courses coming soon.</p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.slice(0, 6).map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            <div className="text-center mt-12 flex flex-wrap gap-4 justify-center">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border transition-colors"
                style={{ background: 'var(--os-surface)', color: 'var(--os-accent)', borderColor: 'var(--os-pill-line)', boxShadow: 'var(--os-sh-sm)' }}
              >
                View All {courses.length} Programmes
              </Link>
              <Link
                href="/group-enrol"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)' }}
              >
                👥 Enrol Your Team / Group →
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
