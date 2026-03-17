import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default async function BecomePartnerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Become a Partner</h1>
      <p className="text-gray-600">
        Join our reseller and referral partner network. Earn commissions promoting withArijit programs to your network.
      </p>
      <div className="p-6 border rounded-2xl space-y-4">
        <h3 className="font-semibold">Partner Benefits</h3>
        <ul className="space-y-2 text-gray-600 text-sm">
          <li>• 20% commission on every successful enrollment</li>
          <li>• Dedicated partner dashboard with real-time analytics</li>
          <li>• Marketing materials and co-branded content</li>
          <li>• Priority support and partner-only webinars</li>
        </ul>
        <Link href="/become-a-partner" className={buttonVariants({ size: 'lg' })}>
          Apply to Partner Program →
        </Link>
      </div>
    </div>
  )
}
