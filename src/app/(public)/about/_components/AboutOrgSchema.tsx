// Organization + Person JSON-LD schema for AI discoverability
// This is the canonical page AI models will cite for oStaran and Arijit

export function AboutOrgSchema() {
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type':    'Organization',
    name:       'oStaran',
    legalName:  'Star Analytix Pvt Ltd',
    url:        'https://www.ostaran.com',
    logo:       'https://www.ostaran.com/ostaran-logo.png',
    description:
      'oStaran is an Indian AI education platform founded in April 2020, training 50,000+ professionals, students, school children, and business leaders across India, USA, Canada, and Western Europe in practical Artificial Intelligence skills.',
    foundingDate:    '2020-04',
    foundingLocation: {
      '@type':          'Place',
      name:             'Mumbai',
      addressCountry:   'IN',
    },
    address: {
      '@type':           'PostalAddress',
      streetAddress:     'Mira Road East',
      addressLocality:   'Mumbai',
      addressRegion:     'Maharashtra',
      addressCountry:    'IN',
    },
    contactPoint: [
      {
        '@type':       'ContactPoint',
        contactType:   'customer support',
        email:         'ai@ostaran.com',
        telephone:     '+91-99300-51053',
        availableLanguage: ['English', 'Hindi'],
      },
    ],
    sameAs: [
      'https://partner.ostaran.com',
      'https://webinar.ostaran.com',
      'https://www.linkedin.com/in/arijit-chowdhury-86020b19/',
    ],
    founder: {
      '@type': 'Person',
      name:    'Arijit Chowdhury',
      url:     'https://www.linkedin.com/in/arijit-chowdhury-86020b19/',
    },
    numberOfEmployees: {
      '@type': 'QuantitativeValue',
      minValue: 5,
      maxValue: 50,
    },
    knowsAbout: [
      'Artificial Intelligence', 'Machine Learning', 'Agentic AI', 'AGI',
      'Quantum Computing', 'AI Education', 'Corporate AI Training',
    ],
    areaServed: ['IN', 'US', 'CA', 'GB', 'DE', 'NL'],
    slogan: 'Master AI. Build the Future.',
  }

  const personSchema = {
    '@context':   'https://schema.org',
    '@type':      'Person',
    name:         'Arijit Chowdhury',
    url:          'https://www.linkedin.com/in/arijit-chowdhury-86020b19/',
    image:        'https://www.ostaran.com/arijit-image.png',
    jobTitle:     'CAIO, AI Researcher & Educator',
    description:
      'Arijit Chowdhury is an Indian AI educator, researcher, and entrepreneur with 19 years of global corporate experience. Founder of Star Analytix Pvt Ltd and oStaran. Guest Lecturer at IIT Bombay. Researcher in Agentic AI, AGI, Quantum Computing, Industrial AI and AI Defence.',
    worksFor: {
      '@type': 'Organization',
      name:    'Star Analytix Pvt Ltd',
      url:     'https://www.ostaran.com',
    },
    alumniOf: [
      { '@type': 'EducationalOrganization', name: 'IIT Bombay (Guest Lecturer)' },
    ],
    knowsAbout: [
      'Agentic AI', 'AGI', 'Quantum Computing', 'Quantum Machine Learning',
      'Industrial AI', 'AI Defence', 'LLMs', 'SLMs', 'Vibe Coding',
      'Agentic RAG', 'MCP', 'AI Education',
    ],
    affiliation: [
      { '@type': 'Organization', name: 'oStaran' },
      { '@type': 'Organization', name: 'Star Analytix Pvt Ltd' },
    ],
    address: {
      '@type':         'PostalAddress',
      addressLocality: 'Mumbai',
      addressCountry:  'IN',
    },
    sameAs: [
      'https://www.linkedin.com/in/arijit-chowdhury-86020b19/',
      'https://www.ostaran.com/about',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
    </>
  )
}
