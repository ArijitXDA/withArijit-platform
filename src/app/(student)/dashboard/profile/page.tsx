import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/dashboard/ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: student } = await (supabase as any)
    .from('users')
    .select('full_name, mobile, timezone, profile_photo_url, course_name, batch_day_time')
    .eq('email', user.email)
    .single()

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Profile</h1>
      <ProfileForm
        email={user.email ?? ''}
        initialData={{
          full_name: student?.full_name ?? '',
          mobile: student?.mobile ?? '',
          timezone: student?.timezone ?? 'Asia/Kolkata',
        }}
      />
    </div>
  )
}
