import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { CourseCard } from './CourseCard'

interface CoursesSectionProps {
  courses: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    mrp: number | null
  }>
}

export function CoursesSection({ courses }: CoursesSectionProps) {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">AI Courses &amp; Programs</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            From foundational skills to advanced certifications — programs for every career stage.
          </p>
        </div>
        {courses.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Courses coming soon. Check back shortly.</p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.slice(0, 6).map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            {courses.length > 6 && (
              <div className="text-center mt-12">
                <Link href="/courses" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                  View All Courses
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
