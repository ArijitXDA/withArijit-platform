import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect }            from 'next/navigation'
import LibraryClient           from './_components/LibraryClient'

export const metadata = {
  title: 'Library — oStaran',
  description: 'Curated AI books, articles and resources for oStaran students.',
}

export const dynamic = 'force-dynamic'

export default async function DashboardLibraryPage() {
  // ── 1. Auth gate ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) redirect('/signin?next=/dashboard/library')

  // ── 2. Fetch all verified library items via service role ─────────────
  const service = createServiceClient()
  const { data: items } = await service
    .from('library')
    .select(`
      id, title, category, author_team, publication_type, level,
      pages, publication_date, rating, tags, thumbnail_url, notes,
      contributor, file_size_mb
    `)
    .eq('verified', true)
    .order('category', { ascending: true })
    .order('title',    { ascending: true })

  return (
    <LibraryClient
      items={items ?? []}
      studentEmail={user.email}
    />
  )
}
