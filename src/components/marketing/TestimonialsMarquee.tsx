'use client'

interface Testimonial {
  full_name: string
  course_name: string
  rating: number
  feedback: string
}

// Course name → short label
function shortCourse(name: string): string {
  if (name.includes('Working')) return 'Working Professional'
  if (name.includes('School')) return 'School Student'
  if (name.includes('College') || name.includes('Job')) return 'College & Job Seeker'
  if (name.includes('Agentic') || name.includes('Tech')) return 'Tech Developer'
  if (name.includes('Business') || name.includes('Leader') || name.includes('CXO')) return 'Business Leader'
  return name.split(' ').slice(0, 3).join(' ')
}

// Initials avatar
function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  const colors = ['#4f46e5','#059669','#d97706','#7c3aed','#0891b2','#e11d48','#0284c7','#16a34a']
  const color  = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
      style={{ background: color }}>
      {initials}
    </div>
  )
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div
      className="shrink-0 w-80 p-5 rounded-2xl border"
      style={{ background: 'var(--os-surface)', borderColor: 'var(--os-pill-line)', boxShadow: 'var(--os-sh-3d)' }}
    >
      {/* Stars */}
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ color: i < t.rating ? '#f59e0b' : 'var(--os-faint)', fontSize: 14 }}>★</span>
        ))}
      </div>
      {/* Quote */}
      <p className="text-sm leading-relaxed mb-4 line-clamp-4" style={{ color: 'var(--os-ink-2)' }}>
        &ldquo;{t.feedback}&rdquo;
      </p>
      {/* Author */}
      <div className="flex items-center gap-3">
        <Avatar name={t.full_name} />
        <div>
          <p className="text-sm font-bold capitalize" style={{ color: 'var(--os-ink)' }}>{t.full_name}</p>
          <p className="text-xs font-medium" style={{ color: 'var(--os-accent)' }}>{shortCourse(t.course_name)}</p>
        </div>
      </div>
    </div>
  )
}

// Fallback testimonials in case DB has few results
const FALLBACK: Testimonial[] = [
  {
    full_name: 'Shailendra K.',
    course_name: 'Agentic AI Certification for Working Professionals',
    rating: 5,
    feedback: 'I truly enjoyed the AI class. The concepts were explained clearly, and the practical examples made it easy to understand complex topics. I feel more confident applying AI in real-world scenarios.',
  },
  {
    full_name: 'Sourangshu M.',
    course_name: 'AI for School Students & Future Readiness',
    rating: 5,
    feedback: 'An excellent learning experience — AI with Arijit makes understanding AI simple, clear, and insightful. I\'m excited to continue learning under Arijit\'s mentorship.',
  },
  {
    full_name: 'Arpita B.',
    course_name: 'Agentic AI Certification for Working Professionals',
    rating: 5,
    feedback: 'Great experience and very insightful session overall. Highly Recommended. The trainer made complex AI concepts very accessible.',
  },
  {
    full_name: 'Chetanaa D.',
    course_name: 'AI Certification for College Students & Job Seekers',
    rating: 5,
    feedback: 'Had a great experience by this webinar. Learnt many things. Thank you for the support and guidance throughout the session.',
  },
  {
    full_name: 'Rohit Kumar S.',
    course_name: 'Agentic AI Certification for Working Professionals',
    rating: 5,
    feedback: 'The session was excellent. The trainer explained everything with real examples which made it very easy to grasp the AI concepts quickly.',
  },
  {
    full_name: 'Dakshayani B.P.',
    course_name: 'Digital & Generative AI Transformation for Business Leaders',
    rating: 5,
    feedback: 'Arijit made Agentic AI easy even for a novice like me. He doesn\'t just teach concepts — he helps students build real intelligent agents for real-world problems.',
  },
  {
    full_name: 'Dr. Harish B.S.',
    course_name: 'Agentic AI Certification for Working Professionals',
    rating: 5,
    feedback: 'Arijit\'s grip on data science and AI is exceptional. He seamlessly bridges simple tools to advanced AI-ML solutions across industries.',
  },
]

export function TestimonialsMarquee({ testimonials }: { testimonials: Testimonial[] }) {
  const items = testimonials.length >= 4 ? testimonials : FALLBACK
  // Duplicate for infinite loop
  const doubled = [...items, ...items]

  return (
    <section className="py-20 overflow-hidden" style={{ background: 'var(--os-page-2)' }}>
      <div className="max-w-7xl mx-auto px-4 mb-10 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border mb-4" style={{ background: 'var(--os-surface)', color: '#b45309', borderColor: 'var(--os-pill-line)', boxShadow: 'var(--os-sh-3d)' }}>
          ⭐ Real Learner Reviews
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color: 'var(--os-ink)' }}>
          What Our Students Say
        </h2>
        <p style={{ color: 'var(--os-muted)' }}>
          Verified 5-star ratings from students who attended and rated their session
        </p>
      </div>

      {/* Row 1 — left to right */}
      <div className="relative mb-4">
        <div className="flex gap-4 marquee-track">
          {doubled.map((t, i) => (
            <TestimonialCard key={`r1-${i}`} t={t} />
          ))}
        </div>
      </div>

      {/* Row 2 — right to left */}
      <div className="relative">
        <div className="flex gap-4 marquee-track-reverse">
          {doubled.reverse().map((t, i) => (
            <TestimonialCard key={`r2-${i}`} t={t} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .marquee-track {
          animation: marquee-left 40s linear infinite;
          width: max-content;
        }
        .marquee-track-reverse {
          animation: marquee-right 45s linear infinite;
          width: max-content;
        }
        @keyframes marquee-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
        .marquee-track:hover,
        .marquee-track-reverse:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
