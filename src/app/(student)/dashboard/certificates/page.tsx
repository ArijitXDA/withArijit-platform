import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { CertificatesClient } from './_components/CertificatesClient'

export default async function CertificatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service   = createServiceClient()
  const email     = user.email!

  // ── 1. Webinar participation certificates ────────────────────────────────
  // Read the LIVE table where webinar certs are actually issued
  // (webinar_participation_certificates). The old `certificates` table is a legacy
  // store that no longer receives webinar certs. Map to the card's shape; the
  // "download" link points at the public certificate page (certificate_url).
  const { data: wpc } = await service
    .from('webinar_participation_certificates')
    .select('id, cert_id, course_name, webinar_date, certificate_url, issued_at')
    .eq('email', email)
    .eq('is_valid', true)
    .not('certificate_url', 'is', null)
    .order('issued_at', { ascending: false })

  const webinarCerts = (wpc ?? []).map((c: any) => ({
    id:                     c.id,
    certificate_name:       c.course_name || 'AI Certification Webinar',
    date_of_issuing:        c.webinar_date || (c.issued_at ? String(c.issued_at).slice(0, 10) : null),
    certificate_image_link: c.certificate_url,
  }))

  // ── 2. Completion certificates already issued (paid courses) ─────────────
  const { data: completionCerts } = await service
    .from('completion_certificates')
    .select('id, enrolment_id, cert_type, cert_id, certificate_url, issued_at, course_name')
    .eq('student_email', email)
    .eq('is_valid', true)
    .order('issued_at', { ascending: false })

  // Build a lookup: enrolment_id → completion cert row
  const certByEnrolment: Record<string, any> = {}
  for (const c of (completionCerts ?? [])) {
    // Keep the best cert per enrolment (final > interim)
    const existing = certByEnrolment[c.enrolment_id]
    if (!existing || c.cert_type === 'final_completion') {
      certByEnrolment[c.enrolment_id] = c
    }
  }

  // ── 3. Enrolments — active ones, PLUS any past/inactive enrolment that already
  //       holds a completion certificate, so a student who completed (or had) a
  //       paid course can always download its certificate even after the enrolment
  //       is closed/deactivated.
  const { data: allEnrolments } = await service
    .from('student_enrolments')
    .select(`
      id, student_name, course_name, balance_due, amount_paid,
      net_after_discount, enrolment_status, is_active,
      course:course_id(name, short_name)
    `)
    .eq('student_email', email)
    .order('created_at', { ascending: false })

  const enrolments = (allEnrolments ?? []).filter((e: any) => e.is_active || certByEnrolment[e.id])

  // Annotate each enrolment with its cert state
  const enrolmentsWithState = enrolments.map((e: any) => {
    const balanceDue = Number(e.balance_due ?? 0)
    const cert       = certByEnrolment[e.id] ?? null

    let certState: 'locked' | 'claim' | 'interim' | 'final'
    if (cert?.cert_type === 'final_completion') {
      certState = 'final'
    } else if (cert?.cert_type === 'interim_provisional') {
      certState = 'interim'
    } else if (balanceDue > 0) {
      certState = 'locked'
    } else {
      certState = 'claim'
    }

    return { ...e, cert, certState, balanceDue }
  })

  const totalCerts =
    (webinarCerts?.length ?? 0) +
    enrolmentsWithState.filter(e => e.certState === 'interim' || e.certState === 'final').length

  return (
    <CertificatesClient
      webinarCerts={webinarCerts as any ?? []}
      enrolments={enrolmentsWithState as any}
      totalCerts={totalCerts}
    />
  )
}
