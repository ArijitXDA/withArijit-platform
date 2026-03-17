import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface CourseCardProps {
  course: {
    id: string
    name: string
    slug: string
    description: string | null
    mrp: number | null
  }
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="font-semibold text-lg leading-tight">{course.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {course.description && (
          <p className="text-gray-600 text-sm line-clamp-3">{course.description}</p>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="font-bold text-indigo-600">
          {course.mrp ? formatCurrency(course.mrp) : 'Free'}
        </span>
        <Link href={`/courses/${course.slug}`} className={buttonVariants({ size: 'sm' })}>
          Learn More
        </Link>
      </CardFooter>
    </Card>
  )
}
