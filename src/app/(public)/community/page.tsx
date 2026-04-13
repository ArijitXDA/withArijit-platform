import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { CommunityShell } from './_components/CommunityShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Community | oStaran',
  description: 'Join the oStaran AI learning community. Chat with fellow learners, ask questions, and get answers from Ask Ari — our AI research assistant.',
}

async function getChannels() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await admin
    .from('community_channels')
    .select('id, slug, name, description, icon, sort_order')
    .eq('is_active', true)
    .order('sort_order')
  return data ?? []
}

export default async function CommunityPage() {
  const channels = await getChannels()
  return <CommunityShell channels={channels} />
}
