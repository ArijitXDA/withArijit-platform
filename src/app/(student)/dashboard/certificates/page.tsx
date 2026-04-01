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

  // ── 1. Webinar participation certificates (existing) ─────────────────────
  const { data: webinarCerts } = await service
    .from('certificates')
    .select('id, certificate_name, date_of_issuing, certificate_image_link')
    .eq('user_email', email)
    .eq('is_active', true)
    .order('date_of_issuing', { ascending: false })

  // ── 2. All active enrolments (for course cert state machine) ─────────────
  const { data: enrolments } = await service
    .from('student_enrolments')
    .select(`
      id, student_name, course_name, balance_due, amount_paid,
      net_after_discount, enrolment_status,
      course:course_id(name, short_name)
    `)
    .eq('student_email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // ── 3. Completion certificates already issued ────────────────────────────
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

  // Annotate each enrolment with its cert state
  const enrolmentsWithState = (enrolments ?? []).map((e: any) => {
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
