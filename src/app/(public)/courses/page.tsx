import { createClient } from '@/lib/supabase/server'
import { CourseCard } from '@/components/marketing/CourseCard'

export const revalidate = 3600

export default async function CoursesPage() {
  const supabase = await createClient()
  const { data: courses, error } = await supabase
    .from('awa_courses')
    .select('id, name, slug, description, mrp')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('Failed to fetch courses:', error.message)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Our Courses</h1>
        <p className="text-gray-600 text-lg">
          Enterprise AI programs built for working professionals.
        </p>
      </div>
      {(courses ?? []).length === 0 ? (
        <p className="text-center text-gray-500 py-12">Courses coming soon.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(courses ?? []).map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}
