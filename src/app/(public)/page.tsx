import type { Metadata } from 'next'
import { createClient }           from '@/lib/supabase/server'
import { HeroSection }            from '@/components/marketing/HeroSection'
import { TrustBar }               from '@/components/marketing/TrustBar'
import { QuickActionsSection }    from '@/components/marketing/QuickActionsSection'
import { AudienceTabsSection }    from '@/components/marketing/AudienceTabsSection'
import { CoursesSection }         from '@/components/marketing/CoursesSection'
import { GetHiredSection }        from '@/components/marketing/GetHiredSection'
import { HowItWorksSection }      from '@/components/marketing/HowItWorksSection'
import { MasterclassCTASection }  from '@/components/marketing/MasterclassCTASection'
import { TestimonialsMarquee }    from '@/components/marketing/TestimonialsMarquee'
import { PartnerSection }         from '@/components/marketing/PartnerSection'
import { CommunityCTASection }    from '@/components/marketing/CommunityCTASection'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'oStaran — AI Certification for Working Professionals, Students & Leaders | India',
  description:
    'Get AI certified in 90 minutes. Live online sessions every Sunday. Globally recognised AI certificate for Working Professionals, School Students, College, Tech Developers & CXOs. 50,000+ trained across India, USA & Canada.',
  keywords: [
    'AI certification India', 'AI course online India', 'AI for working professionals',
    'AI masterclass Sunday', 'oStaran AI', 'group AI enrolment', 'AI certificate download',
    'AI training school students', 'AI certification CXO', 'Arijit Chowdhury AI',
  ],
  openGraph: {
    title: 'oStaran — AI Certification Every Sunday | India',
    description: '50,000+ trained. 90-minute live AI sessions. Globally recognised certificate. Choose your audience.',
  },
}

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: courses }, { data: rawTestimonials }] = await Promise.all([
    supabase
      .from('awa_courses')
      .select('id, name, slug, description, mrp, target_audience, total_sessions, session_duration_mins')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('webinar_ratings')
      .select('full_name, course_name, rating, feedback')
      .eq('rating', 5)
      .not('feedback', 'is', null)
      .order('rated_at', { ascending: false })
      .limit(20),
  ])

  const testimonials = (rawTestimonials ?? []).filter(
    t => t.feedback && t.feedback.length > 40
  )

  return (
    <>
      {/* 1. Hero — vibrant dark with AI network background */}
      <HeroSection />

      {/* 2. Trust bar — stats strip */}
      <TrustBar />

      {/* 3. Quick action cards — 5 colour-coded CTAs */}
      <QuickActionsSection />

      {/* 4. Audience tabs — interactive, personalised */}
      <AudienceTabsSection />

      {/* 5. Full AI Master Programmes */}
      <CoursesSection courses={courses ?? []} />

      {/* 5b. Get discovered & get hired — placement / recruiter marketplace */}
      <GetHiredSection />

      {/* 6. How it works */}
      <HowItWorksSection />

      {/* 7. Masterclass CTA strip */}
      <MasterclassCTASection />

      {/* 8. Real testimonials — horizontal marquee */}
      <TestimonialsMarquee testimonials={testimonials} />

      {/* 9. Partner programme */}
      <PartnerSection />

      {/* 10. AI Discussion Forum CTA */}
      <CommunityCTASection />
    </>
  )
}
