import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import WebinarRegisterClient from './WebinarRegisterClient'

export const dynamic = 'force-dynamic'

async function load(slug: string) {
  const service = createServiceClient()
  const { data: w } = await service
    .from('mentor_webinars')
    .select('id, title, scheduled_at, duration_mins, course_id, owner_mentor_id, is_active')
    .eq('slug', slug).maybeSingle()
  if (!w || !w.is_active) return null
  const [{ data: course }, { data: mentor }] = await Promise.all([
    service.from('awa_courses').select('name, slug, trainer_name').eq('id', w.course_id).maybeSingle(),
    service.from('mentors').select('full_name, trainer_title').eq('id', w.owner_mentor_id).maybeSingle(),
  ])
  return { w, course, mentor }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const d = await load(slug)
  if (!d) return { title: 'Free Webinar | oStaran' }
  return {
    title: `${d.w.title} — Free Live Webinar | oStaran`,
    description: `Free live webinar with ${d.mentor?.full_name ?? 'oStaran'}. Register to attend.`,
  }
}

export default async function WebinarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await load(slug)
  if (!d) notFound()
  return <WebinarRegisterClient slug={slug} webinar={d.w} course={d.course} mentor={d.mentor} />
}
