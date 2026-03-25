import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EnrollPageClient } from './EnrollPageClient'

interface Props {
  params: Promise<{ courseSlug: string }>
  searchParams: Promise<{
    partner?: string
    email?: string
    name?: string
    mobile?: string
    ref?: string
  }>
}

export default async function EnrollPage({ params, searchParams }: Props) {
  const { courseSlug } = await params
  const sp             = await searchParams

  const supabase = await createClient()

  const { data: course } = await supabase
    .from('awa_courses')
    .select('id, name, slug, description, mrp, gst_percent, subjects, target_audience')
    .eq('slug', courseSlug)
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

  // Resolve pre-fill priority: URL params > signed-in profile > registration lookup > empty
  let regName = '', regMobile = ''
  const emailHint = sp.email ?? studentProfile?.email ?? user?.email ?? ''

  if (emailHint && !sp.name && !studentProfile?.full_name) {
    const service = createServiceClient()
    const { data: reg } = await service
      .from('qr_landing_registrations')
      .select('full_name, mobile, utm_source')
      .eq('email', emailHint)
      .order('registered_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (reg) {
      regName   = reg.full_name || ''
      regMobile = reg.mobile    || ''
    }
  }

  const prefill = {
    name:   sp.name   ?? studentProfile?.full_name ?? regName   ?? '',
    email:  emailHint,
    mobile: sp.mobile ?? studentProfile?.mobile    ?? regMobile ?? '',
  }

  // Resolve partner code: URL param wins, then look up from registration
  let partnerCode = sp.partner ?? null
  if (!partnerCode && emailHint) {
    const service = createServiceClient()
    const { data: reg } = await service
      .from('qr_landing_registrations')
      .select('utm_source')
      .eq('email', emailHint)
      .not('utm_source', 'is', null)
      .order('registered_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (reg?.utm_source) partnerCode = reg.utm_source
  }

  const ref = sp.ref ?? null

  return (
    <EnrollPageClient
      course={{
        id:          course.id,
        name:        course.name,
        slug:        course.slug,
        description: course.description ?? '',
        mrp:         Number(course.mrp),
      }}
      prefill={prefill}
      partnerCode={partnerCode}
      refSource={ref}
    />
  )
}
