import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://www.ostaran.com'

const STATIC_PAGES = [
  { url: '/',                   priority: 1.0, changeFrequency: 'weekly'  as const },
  { url: '/courses',            priority: 0.9, changeFrequency: 'weekly'  as const },
  { url: '/free-webinar',       priority: 0.9, changeFrequency: 'daily'   as const },
  { url: '/masterclass',        priority: 0.8, changeFrequency: 'weekly'  as const },
  { url: '/about',              priority: 0.7, changeFrequency: 'monthly' as const },
  { url: '/contact',            priority: 0.7, changeFrequency: 'monthly' as const },
  { url: '/library',            priority: 0.7, changeFrequency: 'weekly'  as const },
  { url: '/become-a-partner',   priority: 0.8, changeFrequency: 'monthly' as const },
  { url: '/ai-certification',   priority: 0.8, changeFrequency: 'monthly' as const },
  { url: '/find-ai-job',        priority: 0.6, changeFrequency: 'weekly'  as const },
  { url: '/build-ai-projects',  priority: 0.6, changeFrequency: 'monthly' as const },
  { url: '/ai-readiness-quiz',  priority: 0.6, changeFrequency: 'monthly' as const },
  { url: '/privacy',            priority: 0.3, changeFrequency: 'yearly'  as const },
  { url: '/terms',              priority: 0.3, changeFrequency: 'yearly'  as const },
  { url: '/refund-policy',      priority: 0.3, changeFrequency: 'yearly'  as const },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: courses } = await admin
    .from('awa_courses')
    .select('slug, updated_at')
    .eq('is_active', true)

  const courseUrls: MetadataRoute.Sitemap = (courses ?? []).map(c => ({
    url:             `${BASE}/courses/${c.slug}`,
    lastModified:    c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority:        0.85,
  }))

  const staticUrls: MetadataRoute.Sitemap = STATIC_PAGES.map(p => ({
    url:             `${BASE}${p.url}`,
    lastModified:    new Date(),
    changeFrequency: p.changeFrequency,
    priority:        p.priority,
  }))

  return [...staticUrls, ...courseUrls]
}
