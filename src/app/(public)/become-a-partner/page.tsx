import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Become a Partner', description: 'Join the withArijit partner network.' }

export default function BecomePartnerPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Become a Partner</h1>
      <p className="text-gray-600 text-lg mb-8">Join our reseller, referral, and institutional partner network.</p>
      <Link href="/contact" className={cn(buttonVariants({ size: 'lg' }))}>Contact Us →</Link>
    </div>
  )
}
