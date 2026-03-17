import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { PaymentModalTrigger } from '@/components/shared/PaymentModalTrigger'

export const revalidate = 3600

export async function generateStaticParams() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('awa_courses').select('slug').eq('is_active', true)
  return (data ?? []).map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
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

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: course } = await supabase
    .from('awa_courses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!course) notFound()

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="mb-4">
        <Badge variant="secondary">AI Certification</Badge>
      </div>
      <h1 className="text-4xl font-bold mb-4">{course.name}</h1>
      {course.description && (
        <p className="text-xl text-gray-600 mb-8">{course.description}</p>
      )}
      <div className="flex items-center gap-6 mb-10">
        {course.mrp && (
          <span className="text-3xl font-bold text-indigo-600">
            {formatCurrency(course.mrp)}
          </span>
        )}
        <PaymentModalTrigger
          courseId={course.id}
          courseName={course.name}
          price={course.mrp ?? undefined}
        />
      </div>
    </div>
  )
}
