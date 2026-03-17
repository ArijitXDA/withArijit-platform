import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReferralCopyButton } from '@/components/dashboard/ReferralCopyButton'

export default async function ReferralsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: student } = await (supabase as any)
    .from('users')
    .select('referral_code, full_name')
    .eq('email', user.email)
    .single()

  const referralUrl = student?.referral_code
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.witharijit.com'}/signup?ref=${student.referral_code}`
    : null

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Referrals</h1>
      {referralUrl ? (
        <div className="p-6 border rounded-2xl bg-indigo-50">
          <p className="font-semibold mb-2">Your Referral Link</p>
          <p className="text-sm text-gray-600 mb-4">Share this link. Earn rewards for every friend who enrolls.</p>
          <ReferralCopyButton url={referralUrl} />
        </div>
      ) : (
        <p className="text-gray-500">Your referral code will be assigned after enrollment.</p>
      )}
    </div>
  )
}
