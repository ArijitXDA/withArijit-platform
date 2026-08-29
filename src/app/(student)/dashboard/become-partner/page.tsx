import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { ExternalLink, Users, TrendingUp, Gift, Star, ChevronRight, Copy, CheckCircle } from 'lucide-react'
import BecomePartnerClient from './_components/BecomePartnerClient'
import { publicPartnerCode } from '@/lib/partnerCode'

export default async function BecomePartnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // Check if already a partner
  const { data: existingPartner } = await service
    .from('partners')
    .select('id, partner_code, partner_code_v2, status, level, total_paid_enrolments, total_commission_earned')
    .eq('email', email)
    .maybeSingle()

  // Get referring partner from the student's enrolment
  const { data: enrolment } = await service
    .from('student_enrolments')
    .select('partner:partner_id(id, partner_code, partner_code_v2, full_name, level, hierarchy_path)')
    .eq('student_email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const referringPartner = (enrolment?.partner as any) ?? null

  // Build the registration URL with correct downstream UTM
  let registerUrl = 'https://partner.ostaran.com/register'
  // The OPAQUE code only — this link is shown to a student and forwarded onward.
  const referringCode = publicPartnerCode(referringPartner)
  if (referringCode) {
    const params = new URLSearchParams({
      utm_source:   referringCode,
      utm_medium:   'student_referral',
      utm_campaign: referringCode,
      ref:          referringCode,
    })
    registerUrl = `https://partner.ostaran.com/register?${params.toString()}`
  }

  // Normalise both codes to the opaque form BEFORE they reach the client: this screen
  // prints the referrer's code on the page, and the legacy code is the referrer's own name.
  return (
    <BecomePartnerClient
      registerUrl={registerUrl}
      referringPartner={referringPartner
        ? { ...referringPartner, partner_code: referringCode }
        : null}
      studentEmail={email}
      existingPartner={existingPartner
        ? { ...existingPartner, partner_code: publicPartnerCode(existingPartner) } as any
        : null}
    />
  )
}
