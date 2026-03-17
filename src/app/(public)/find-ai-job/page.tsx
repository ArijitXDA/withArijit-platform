import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Find AI Jobs', description: 'AI job board and career placement support.' }

export default function FindAIJobPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Find AI Jobs</h1>
      <p className="text-gray-600 text-lg mb-8">Connect with companies hiring for AI roles. Placement support for certified students.</p>
      <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>Get Placement Support →</Link>
    </div>
  )
}
