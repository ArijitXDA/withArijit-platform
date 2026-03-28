import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { ExternalLink, Users, TrendingUp, Gift, Star, ChevronRight, Copy, CheckCircle } from 'lucide-react'
import BecomePartnerClient from './_components/BecomePartnerClient'

export default async function BecomePartnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const service = createServiceClient()
  const email   = user.email!

  // Check if already a partner
  const { data: existingPartner } = await service
    .from('partners')
    .select('id, partner_code, status, level, total_paid_enrolments, total_commission_earned')
    .eq('email', email)
    .maybeSingle()

  // Get referring partner from the student's enrolment
  const { data: enrolment } = await service
    .from('student_enrolments')
    .select('partner:partner_id(id, partner_code, full_name, level, hierarchy_path)')
    .eq('student_email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const referringPartner = (enrolment?.partner as any) ?? null

  // Build the registration URL with correct downstream UTM
  let registerUrl = 'https://partner.ostaran.com/register'
  if (referringPartner?.partner_code) {
    const params = new URLSearchParams({
      utm_source:   referringPartner.partner_code,
      utm_medium:   'student_referral',
      utm_campaign: referringPartner.partner_code,
      ref:          referringPartner.partner_code,
    })
    registerUrl = `https://partner.ostaran.com/register?${params.toString()}`
  }

  return (
    <BecomePartnerClient
      registerUrl={registerUrl}
      referringPartner={referringPartner}
      studentEmail={email}
      existingPartner={existingPartner as any}
    />
  )
}
