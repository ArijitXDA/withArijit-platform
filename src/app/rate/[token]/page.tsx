import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import RateClient from './RateClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Rate your AI Webinar & get your certificate | oStaran',
  robots: { index: false, follow: false },
}

export default async function RatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const svc = createServiceClient()

  const { data: reg } = await svc
    .from('qr_landing_registrations')
    .select('full_name, email, course_name')
    .eq('join_token', token)
    .maybeSingle()

  if (!reg || !reg.email) notFound()

  const courseName = (reg.course_name && String(reg.course_name).trim()) || 'AI Webinar'
  const firstName  = (reg.full_name || '').trim().split(/\s+/)[0] || 'there'
  const email      = String(reg.email).toLowerCase().trim()

  // webinar_ratings is UNIQUE per email — if this person has rated ANY session, hand them
  // their existing certificate (with the cert's own course name), skipping the form.
  const { data: rated } = await svc
    .from('webinar_ratings').select('id')
    .eq('email', email).limit(1).maybeSingle()

  let cert: { cert_id: string; certificate_url: string; course_name: string } | null = null
  if (rated) {
    const { data: c } = await svc
      .from('webinar_participation_certificates')
      .select('cert_id, certificate_url, course_name')
      .eq('email', email)
      .order('issued_at', { ascending: false }).limit(1).maybeSingle()
    if (c?.certificate_url) cert = { cert_id: c.cert_id, certificate_url: c.certificate_url, course_name: c.course_name || courseName }
  }

  return (
    <RateClient
      token={token}
      firstName={firstName}
      fullName={reg.full_name || ''}
      courseName={courseName}
      alreadyCert={cert}
    />
  )
}
