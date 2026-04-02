import { HeroSection }        from '@/components/marketing/HeroSection'
import { StatsBar }           from '@/components/marketing/StatsBar'
import { AudienceSection }    from '@/components/marketing/AudienceSection'
import { CoursesSection }     from '@/components/marketing/CoursesSection'
import { HowItWorksSection }  from '@/components/marketing/HowItWorksSection'
import { WebinarCTASection }  from '@/components/marketing/WebinarCTASection'
import { PartnerSection }     from '@/components/marketing/PartnerSection'
import { TestimonialsSection } from '@/components/marketing/TestimonialsSection'
import { createClient }       from '@/lib/supabase/server'

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
      {/* 1. Hero — Master AI. Build the Future. */}
      <HeroSection />

      {/* 2. Stats bar — 10,000+ Learners, 4.9 Rating */}
      <StatsBar />

      {/* 3. NEW — Who is oStaran for? (8 audience cards) */}
      <AudienceSection />

      {/* 4. Courses grid */}
      <CoursesSection courses={courses ?? []} />

      {/* 5. NEW — How it works (4 steps) */}
      <HowItWorksSection />

      {/* 6. Free webinar CTA */}
      <WebinarCTASection />

      {/* 7. NEW — Partner Programme strip */}
      <PartnerSection />

      {/* 8. Testimonials */}
      <TestimonialsSection />
    </>
  )
}
