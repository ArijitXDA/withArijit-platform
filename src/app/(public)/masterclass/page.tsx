import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'

export const metadata = { title: 'AI Masterclass', description: 'Intensive AI masterclass programs by Arijit.' }

export default function MasterclassPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-gray-950 to-indigo-950 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold mb-4">AI Masterclass</h1>
          <p className="text-xl text-gray-300 mb-8">Intensive, immersive AI programs designed for fast transformation.</p>
          <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'bg-indigo-600 hover:bg-indigo-500 text-white')}>
            Register Interest →
          </Link>
        </div>
      </section>
      <section className="py-20 px-4 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Coming Soon</h2>
        <p className="text-gray-600">Our next AI Masterclass cohort is being finalised. Register interest to be notified first.</p>
      </section>
    </div>
  )
}
