import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function WebinarCTASection() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-3">Free Live Webinar</p>
        <h2 className="text-4xl font-bold mb-4">Start Your AI Journey — Free</h2>
        <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
          Join our next live webinar. No cost, no commitment. Get hands-on with AI in 90 minutes.
        </p>
        <Link
          href="/free-webinar"
          className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-indigo-700 hover:bg-indigo-50')}
        >
          Register Now — It&apos;s Free →
        </Link>
      </div>
    </section>
  )
}
