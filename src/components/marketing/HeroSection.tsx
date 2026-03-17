import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <Badge className="mb-4 bg-indigo-600 text-white">India's #1 AI Education Platform</Badge>
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
          Master AI.<br />Build the Future.
        </h1>
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Enterprise-grade AI certification programs for professionals, students, and leaders.
          Join 10,000+ learners transforming their careers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/free-webinar" className={cn(buttonVariants({ size: 'lg' }), 'bg-indigo-600 hover:bg-indigo-500 text-white')}>
            Join Free Webinar →
          </Link>
          <Link href="/courses" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/20 text-white hover:bg-white/10')}>
            Explore Courses
          </Link>
        </div>
      </div>
    </section>
  )
}
