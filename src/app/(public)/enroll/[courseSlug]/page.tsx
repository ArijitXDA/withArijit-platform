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
    .select('id, name, slug, description, mrp, gst_percent, discount_percent, subjects, target_audience')
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

  // Resolve partner code: URL param wins, then the buyer's registration utm_source.
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

  // Show the discount ONLY for a VALIDATED active partner (mirrors /courses/[slug]) so
  // the displayed price == the charged price and survives an email change at checkout
  // (create-order re-applies the discount from the same active partner_code).
  let partnerName = ''
  let partnerValid = false
  if (partnerCode) {
    const service = createServiceClient()
    const { data: partnerRow } = await service
      .from('partners')
      .select('full_name')
      .eq('partner_code', partnerCode)
      .eq('status', 'active')
      .maybeSingle()
    if (partnerRow) { partnerValid = true; partnerName = partnerRow.full_name ?? '' }
  }
  const discountPct = partnerValid ? Number((course as any).discount_percent ?? 0) : 0

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
      partnerName={partnerName}
      discountPct={discountPct}
      refSource={ref}
    />
  )
}
