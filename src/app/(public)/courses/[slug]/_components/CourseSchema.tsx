// CourseSchema — injects JSON-LD structured data for Google rich results
// Renders: Course schema + FAQPage schema + BreadcrumbList

const BASE_FAQS = [
  { q: 'Do I need a coding background?', a: 'No prior coding experience is needed for most programmes. We start from zero and build progressively.' },
  { q: 'When are the classes held?', a: 'All live sessions are on weekends — Saturday and/or Sunday. Sessions are 60 minutes each.' },
  { q: 'What if I miss a class?', a: 'Every live session is recorded and uploaded within 24 hours. You get lifetime access to all recordings.' },
  { q: 'What certificates do I receive?', a: 'You receive an Interim Certificate after Session 13, and a globally recognised Completion Certificate after all sessions.' },
  { q: 'What is the AI Kit?', a: 'A physical AI learning kit couriered to your home address in India after successful full-course payment.' },
  { q: 'Is there a payment plan?', a: 'Yes — the 50-50 Plan lets you pay 50% now and the remaining 50% after Session 13.' },
  { q: 'Who owns the projects I build?', a: 'You do. Every project you build is entirely yours with no IP or commercial restrictions.' },
  { q: 'Is the certificate recognised internationally?', a: 'Yes. oStaran certificates are held by learners in India, the USA, and Canada. Verifiable at ostaran.com/certificate-verification.' },
]

export function CourseSchema({
  course,
  mrp,
  netBeforeGst,
}: {
  course: any
  mrp: number
  netBeforeGst: number
}) {
  const appUrl    = 'https://www.ostaran.com'
  const courseUrl = `${appUrl}/courses/${course.slug}`

  const courseSchema = {
    '@context':   'https://schema.org',
    '@type':      'Course',
    name:         course.name,
    description:  course.description ?? course.name,
    url:          courseUrl,
    image:        `${appUrl}/ostaran-logo.png`,
    provider: {
      '@type': 'Organization',
      name:    'oStaran',
      url:     appUrl,
      logo:    `${appUrl}/ostaran-logo.png`,
    },
    instructor: {
      '@type':        'Person',
      name:           'Arijit Chowdhury',
      url:            `${appUrl}/about/arijit-chowdhury`,
      jobTitle:       'CAIO & AI Educator',
      affiliation:    'oStaran',
      alumniOf:       'IIT Bombay (Guest Lecturer)',
      description:    'AI educator with 19 years global experience. CAIO at FundsIndia. Corporate coach for Deloitte, PwC, McKinsey, Capgemini.',
    },
    offers: {
      '@type':         'Offer',
      price:           String(netBeforeGst),
      priceCurrency:   'INR',
      availability:    'https://schema.org/InStock',
      url:             courseUrl,
      category:        'Paid',
      description:     'Inclusive of 18% GST',
    },
    courseMode:           ['online', 'synchronous'],
    educationalLevel:     'Beginner to Advanced',
    inLanguage:           'en',
    numberOfCredits:      course.total_sessions ?? 26,
    timeToComplete:       `P${Math.ceil((course.total_sessions ?? 26) / 4)}M`,
    hasCourseInstance: {
      '@type':          'CourseInstance',
      courseMode:       'online',
      instructor: {
        '@type': 'Person',
        name:    'Arijit Chowdhury',
      },
      courseSchedule: {
        '@type':         'Schedule',
        repeatFrequency: 'Weekly',
        byDay:           ['Saturday', 'Sunday'],
        duration:        'PT60M',
      },
    },
    aggregateRating: {
      '@type':       'AggregateRating',
      ratingValue:   '4.9',
      ratingCount:   '50000',
      bestRating:    '5',
      worstRating:   '1',
    },
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: BASE_FAQS.map(faq => ({
      '@type': 'Question',
      name:    faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text:    faq.a,
      },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',       item: appUrl },
      { '@type': 'ListItem', position: 2, name: 'Programmes', item: `${appUrl}/courses` },
      { '@type': 'ListItem', position: 3, name: course.name,  item: courseUrl },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  )
}
