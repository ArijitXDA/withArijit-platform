import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import './certificate.css'
import CertificateClient from './CertificateClient'

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ certId: string }>
}): Promise<Metadata> {
  const { certId } = await params
  const supabase    = createServiceClient()
  const { data }    = await supabase
    .from('webinar_participation_certificates')
    .select('full_name, course_name')
    .eq('cert_id', certId)
    .single()
  if (!data) return { title: 'Certificate Not Found' }
  return {
    title: `${data.full_name} — Certificate of Participation | oStaran`,
    description: `Certificate of Participation in ${data.course_name} — issued by Star Analytix & oStaran AI Education Platform`,
  }
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ certId: string }>
}) {
  const { certId } = await params
  const supabase    = createServiceClient()

  const { data: cert } = await supabase
    .from('webinar_participation_certificates')
    .select('*')
    .eq('cert_id', certId)
    .eq('is_valid', true)
    .single()

  if (!cert) notFound()

  // ── Track certificate view (fire-and-forget) ──────────────────────────
  // Tells us which certificates are being shared and viewed (viral/social signal)
  void fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ostaran.com'}/api/track/click`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      link_type:     'certificate_view',
      student_email: cert.email,
      student_name:  cert.full_name,
      course_name:   cert.course_name,
      source_app:    'ostaran',
    }),
  }).catch(() => {})

  return <CertificateClient cert={cert} />
}
