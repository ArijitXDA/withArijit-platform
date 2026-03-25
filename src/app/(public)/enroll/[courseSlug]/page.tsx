import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EnrollPageClient } from './EnrollPageClient'

interface Props {
  params: { courseSlug: string }
  searchParams: {
    partner?: string     // partner_code (utm_source)
    email?: string       // pre-fill from webinar registration
    name?: string        // pre-fill
    mobile?: string      // pre-fill
    ref?: string         // 'webinar' | 'nudge' | etc — for offer messaging
  }
}

export default async function EnrollPage({ params, searchParams }: Props) {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('awa_courses')
    .select('id, name, slug, description, mrp, gst_percent, subjects, target_audience')
    .eq('slug', params.courseSlug)
    .eq('is_active', true)
    .single()

  if (!course) notFound()

  // If student is already signed in, pre-fill from their profile
  const { data: { user } } = await supabase.auth.getUser()
  let studentProfile: { full_name?: string; email?: string; mobile?: string } | null = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('full_name, email, mobile')
      .eq('email', user.email)
      .maybeSingle()
    studentProfile = data
  }

  // Resolve prefill priority: URL params > signed-in profile > empty
  const prefill = {
    name:   searchParams.name   ?? studentProfile?.full_name ?? '',
    email:  searchParams.email  ?? studentProfile?.email     ?? user?.email ?? '',
    mobile: searchParams.mobile ?? studentProfile?.mobile    ?? '',
  }

  const partnerCode = searchParams.partner ?? null
  const ref = searchParams.ref ?? null // 'webinar' triggers special offer UI

  return (
    <EnrollPageClient
      course={course}
      prefill={prefill}
      partnerCode={partnerCode}
      ref={ref}
    />
  )
}
