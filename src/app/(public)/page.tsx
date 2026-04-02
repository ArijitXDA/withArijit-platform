import { HeroSection }           from '@/components/marketing/HeroSection'
import { StatsBar }              from '@/components/marketing/StatsBar'
import { CertificateSection }    from '@/components/marketing/CertificateSection'
import { AudienceSection }       from '@/components/marketing/AudienceSection'
import { CoursesSection }        from '@/components/marketing/CoursesSection'
import { HowItWorksSection }     from '@/components/marketing/HowItWorksSection'
import { MasterclassCTASection } from '@/components/marketing/MasterclassCTASection'
import { PartnerSection }        from '@/components/marketing/PartnerSection'
import { TestimonialsSection }   from '@/components/marketing/TestimonialsSection'
import { createClient }          from '@/lib/supabase/server'

export const revalidate = 3600

export default async function HomePage() {
  const supabase = await createClient()
  const { data: courses, error: coursesError } = await supabase
    .from('awa_courses')
    .select('id, name, slug, description, mrp, target_audience, total_sessions, session_duration_mins')
    .eq('is_active', true)
    .order('sort_order')

  if (coursesError) console.error('Failed to fetch courses:', coursesError.message)

  return (
    <>
      {/* 1. Hero */}
      <HeroSection />

      {/* 2. Stats bar */}
      <StatsBar />

      {/* 3. Certificate download strip */}
      <CertificateSection />

      {/* 4. Who is oStaran for? */}
      <AudienceSection />

      {/* 4. Courses grid */}
      <CoursesSection courses={courses ?? []} />

      {/* 5. How it works */}
      <HowItWorksSection />

      {/* 6. Masterclass CTA */}
      <MasterclassCTASection />

      {/* 7. Partner Programme */}
      <PartnerSection />

      {/* 8. Testimonials */}
      <TestimonialsSection />
    </>
  )
}
