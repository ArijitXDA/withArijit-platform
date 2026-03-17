import { HeroSection } from '@/components/marketing/HeroSection'
import { StatsBar } from '@/components/marketing/StatsBar'
import { CoursesSection } from '@/components/marketing/CoursesSection'
import { WebinarCTASection } from '@/components/marketing/WebinarCTASection'
import { TestimonialsSection } from '@/components/marketing/TestimonialsSection'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 3600

export default async function HomePage() {
  const supabase = await createClient()
  const { data: courses } = await supabase
    .from('awa_courses')
    .select('id, name, slug, description, mrp')
    .eq('is_active', true)
    .order('sort_order')
  return (
    <>
      <HeroSection />
      <StatsBar />
      <CoursesSection courses={courses ?? []} />
      <WebinarCTASection />
      <TestimonialsSection />
    </>
  )
}
