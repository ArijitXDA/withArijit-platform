import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import NotificationsClient from './_components/NotificationsClient'

// Full notification screen for the Android app. The bell dropdown caps at 50 and is awkward on a
// phone; this is the "inbox" a tapped push opens into, and the place to catch up on anything missed.
//
// Notifications are keyed (recipient_type='student', recipient_id=<email>) — note the student side
// keys on EMAIL while the partner side keys on the partner UUID.

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/signin')

  const svc = createServiceClient()
  const { data } = await svc
    .from('notifications')
    .select('id, kind, title, body, link, ticket_id, read_at, created_at')
    .eq('recipient_type', 'student')
    .ilike('recipient_id', user.email)
    .order('created_at', { ascending: false })
    .limit(100)

  return <NotificationsClient initial={data ?? []} />
}
