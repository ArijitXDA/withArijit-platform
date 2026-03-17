import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Build AI Projects', description: 'Guided AI project building for professionals and students.' }

export default function BuildAIProjectsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Build AI Projects</h1>
      <p className="text-gray-600 text-lg mb-8">Go from idea to working AI product with guided project tracks.</p>
      <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>Get Started →</Link>
    </div>
  )
}
