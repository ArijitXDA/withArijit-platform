import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Briefcase } from 'lucide-react'

export default async function CareerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Career</h1>
      <div className="grid gap-4">
        <div className="p-6 border rounded-2xl">
          <div className="flex items-start gap-4">
            <Briefcase className="text-indigo-600 mt-1" size={24} />
            <div>
              <h3 className="font-semibold mb-1">AI Job Board</h3>
              <p className="text-gray-600 text-sm mb-3">Explore AI roles from our hiring partner network.</p>
              <Link href="/find-ai-job" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Browse Jobs →
              </Link>
            </div>
          </div>
        </div>
        <div className="p-6 border rounded-2xl">
          <h3 className="font-semibold mb-1">Resume Repository</h3>
          <p className="text-gray-600 text-sm mb-3">Upload your resume to be discovered by hiring partners.</p>
          <p className="text-xs text-gray-400">Resume upload coming soon.</p>
        </div>
      </div>
    </div>
  )
}
