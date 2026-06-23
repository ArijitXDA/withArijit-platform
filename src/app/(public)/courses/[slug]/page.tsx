import Image             from 'next/image'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound }      from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { PaymentModalTrigger } from '@/components/shared/PaymentModalTrigger'
import type { Metadata }  from 'next'

// Sub-components
import { CourseHero }           from './_components/CourseHero'
import { CourseOutcomes }       from './_components/CourseOutcomes'
import { CourseWhatYouGet }     from './_components/CourseWhatYouGet'
import { CourseAIKit }          from './_components/CourseAIKit'
import { CourseProjects }       from './_components/CourseProjects'
import { CourseCurriculum }     from './_components/CourseCurriculum'
import { CourseSeniorTestimonials } from './_components/CourseSeniorTestimonials'
import { CourseLearnerReviews } from './_components/CourseLearnerReviews'
import { CourseTrainer }        from './_components/CourseTrainer'
import { CourseComparison }     from './_components/CourseComparison'
import { CourseFAQ }            from './_components/CourseFAQ'
import { CourseBottomCTA }      from './_components/CourseBottomCTA'
import { CourseStickyBar }      from './_components/CourseStickyBar'
import { CourseSchema }         from './_components/CourseSchema'
import { CourseAIClassMonitor } from './_components/CourseAIClassMonitor'
import { CourseAfterOutcomes }  from './_components/CourseAfterOutcomes'
import { CourseSessionJourney } from './_components/CourseSessionJourney'
import { MentorWhatYouGet, MentorCurriculum, MentorSessions, MentorProjects, MentorFAQ } from './_components/MentorSections'
import { verifyPreviewToken } from '@/lib/previewToken'

export const revalidate = 3600

export async function generateStaticParams() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('awa_courses').select('slug').eq('is_active', true)
  return (data ?? []).map(c => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServiceClient()
  const { data: course } = await supabase
    .from('awa_courses')
    .select('name, description, seo_title, seo_description, mrp, trainer_name')
    .eq('slug', slug)
    .single()

  if (!course) return {}

  const trainer     = course.trainer_name ?? 'Arijit Chowdhury'
  const title       = course.seo_title ?? `${course.name} by ${trainer} — Live AI Certification Online India | oStaran`
  const description = course.seo_description ??
    `${course.description ?? ''} Live weekend sessions with ${trainer}. AI Kit couriered. Interim + completion certificate. 50,000+ trained across India, USA & Canada.`

  return {
    title,
    description,
    keywords: [
      course.name, 'AI certification India', 'live AI course online India',
      'AI certificate', 'oStaran', 'Arijit Chowdhury AI',
      'AI course weekend', 'AI Kit course India',
    ],
    openGraph: { title, description },
    alternates: { canonical: `https://www.ostaran.com/courses/${slug}` },
  }
}

// ── Audience category → testimonial course_name filter ────────────────────────
const CATEGORY_FILTER: Record<string, string[]> = {
  working_professionals: ['Working', 'Professional', 'Agentic AI Certification'],
  school:               ['School'],
  college:              ['College', 'Job'],
  tech:                 ['Agentic', 'Tech', 'Developer'],
  cxo:                  ['Business', 'Leader', 'CXO', 'Digital'],
  general:              [],
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>
  searchParams: Promise<{ partner?: string; email?: string; name?: string; mobile?: string; enrol?: string; preview?: string }>
}) {
  const { slug }                                                      = await params
  const { partner, email: sqEmail, name: sqName, mobile: sqMobile, preview } = await searchParams
  const supabase                                                      = createServiceClient()

  // ── Fetch course ─────────────────────────────────────────────────────────────
  const { data: course } = await supabase
    .from('awa_courses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!course) notFound()

  // Not public yet: allow ONLY with a valid signed preview token for this course
  // (mentor authoring / dev-admin review); otherwise redirect gracefully.
  const isPreview = !course.is_active && verifyPreviewToken(preview ?? null) === course.id
  if (!course.is_active && !isPreview) {
    redirect(course.redirect_slug ? `/courses/${course.redirect_slug}` : '/courses')
  }

  // Mentor course → render mentor-authored sections + hide AI-Kit/testimonials.
  const isMentor = !!course.owner_mentor_id
  const lc = (course.landing_content ?? {}) as any

  // ── Fetch all supporting data in parallel ─────────────────────────────────
  const category = course.audience_category ?? 'general'
  const filters  = CATEGORY_FILTER[category] ?? []

  const [
    { data: projects },
    { data: allTestimonials },
    { data: partnerRow },
  ] = await Promise.all([
    supabase
      .from('course_projects')
      .select('*')
      .eq('course_id', course.id)
      .eq('is_active', true)
      .order('sort_order'),

    supabase
      .from('webinar_ratings')
      .select('full_name, course_name, rating, feedback')
      .gte('rating', 4)
      .not('feedback', 'is', null)
      .order('rated_at', { ascending: false })
      .limit(30),

    partner
      ? supabase.from('partners').select('full_name').eq('partner_code', partner).eq('status', 'active').single()
      : Promise.resolve({ data: null }),
  ])

  // Filter testimonials to this course's category
  const testimonials = (allTestimonials ?? []).filter(t => {
    if (!t.feedback || t.feedback.length < 40) return false
    if (filters.length === 0) return true
    return filters.some(f => t.course_name?.toLowerCase().includes(f.toLowerCase()))
  })

  const discountPct  = partner ? Number(course.discount_percent ?? 0) : 0
  const partnerName  = partnerRow?.full_name ?? ''
  const mrp          = Number(course.mrp)
  const gstPct       = Number(course.gst_percent ?? 18) / 100
  const netBeforeGst = Math.round(mrp / (1 + gstPct))
  const gstAmount    = mrp - netBeforeGst

  // Track click (fire and forget)
  if (partner || (await searchParams).enrol) {
    const sp     = await searchParams
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ostaran.com'
    void fetch(`${appUrl}/api/track/click`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_type: 'enrolment_page', partner_code: partner ?? null, course_id: course.id, course_name: course.name, student_email: sp.email || null, utm_medium: 'partner_share' }),
    }).catch(() => {})
  }

  const enrolProps = {
    courseId:          course.id,
    courseName:        course.name,
    price:             mrp,
    discountPct,
    partnerName,
    defaultPartnerCode: partner ?? '',
    defaultEmail:      sqEmail ?? '',
    defaultName:       sqName ?? '',
    defaultMobile:     sqMobile ?? '',
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <CourseSchema course={course} mrp={mrp} netBeforeGst={netBeforeGst} />

      {/* Sticky bottom bar — appears after hero scrolls out */}
      <CourseStickyBar course={course} mrp={mrp} enrolProps={enrolProps} />

      <div className="min-h-screen" style={{ background: '#06080f' }}>

        {/* 1. Hero — 2-col layout, sticky enrol card */}
        <CourseHero
          course={course} mrp={mrp} gstAmount={gstAmount} netBeforeGst={netBeforeGst}
          discountPct={discountPct} partner={partner} enrolProps={enrolProps}
        />

        {/* 2. Transformation outcomes */}
        <CourseOutcomes category={category} />

        {/* 3. What you get (mentor: from landing_content, AI-Kit card omitted) */}
        {isMentor ? <MentorWhatYouGet items={lc.whatYouGet} /> : <CourseWhatYouGet course={course} />}

        {/* 4. AI Kit — oStaran courses only */}
        {!isMentor && <CourseAIKit />}

        {/* 5. Real projects */}
        {isMentor
          ? <MentorProjects items={lc.projects} />
          : ((projects ?? []).length > 0 && <CourseProjects projects={projects ?? []} />)}

        {/* 6. What You Will Learn */}
        {isMentor
          ? <MentorCurriculum highlights={lc.curriculumHighlights} />
          : (course.subjects && Array.isArray(course.subjects) && course.subjects.length > 0 && (
              <CourseCurriculum subjects={course.subjects as string[]} category={category} />
            ))}

        {/* 7. Session journey */}
        {isMentor ? <MentorSessions sessions={lc.sessions} /> : <CourseSessionJourney category={category} />}

        {/* 8. What You Walk Away With */}
        <CourseAfterOutcomes category={category} />

        {/* 9 + 10. Testimonials / learner reviews — oStaran courses only */}
        {!isMentor && <CourseSeniorTestimonials />}
        {!isMentor && <CourseLearnerReviews testimonials={testimonials} category={category} />}

        {/* 11. Trainer profile (dynamic per course — mentor or oStaran default) */}
        <CourseTrainer course={course} />

        {/* 12. Assistant Professor (AI) */}
        <CourseAIClassMonitor />

        {/* 13. Comparison table */}
        <CourseComparison mrp={mrp} />

        {/* 14. FAQs */}
        {isMentor ? <MentorFAQ faqs={lc.faqs} /> : <CourseFAQ course={course} />}

        {/* 15. Bottom CTA */}
        <CourseBottomCTA course={course} enrolProps={enrolProps} />

      </div>
    </>
  )
}
