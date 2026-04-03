'use client'

interface Testimonial {
  full_name: string
  course_name: string
  rating: number
  feedback: string
}

function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  const colors   = ['#4f46e5','#059669','#d97706','#7c3aed','#0891b2','#e11d48','#0284c7','#16a34a']
  const color    = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ background: color }}>
      {initials}
    </div>
  )
}

function Card({ t }: { t: Testimonial }) {
  return (
    <div className="shrink-0 w-72 bg-white rounded-2xl border border-gray-100 p-5"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ color: i < t.rating ? '#f59e0b' : '#e5e7eb', fontSize: 13 }}>★</span>
        ))}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-4 line-clamp-4">
        &ldquo;{t.feedback}&rdquo;
      </p>
      <div className="flex items-center gap-2.5">
        <Avatar name={t.full_name} />
        <div>
          <p className="text-sm font-bold text-gray-900 capitalize">{t.full_name}</p>
          <p className="text-xs text-indigo-600">Verified Learner · ⭐ {t.rating}/5</p>
        </div>
      </div>
    </div>
  )
}

const FALLBACK: Testimonial[] = [
  { full_name: 'Shailendra K.', course_name: 'Working Professionals', rating: 5, feedback: 'I truly enjoyed the AI class. The concepts were explained clearly, and the practical examples made it easy to understand complex topics. I feel more confident applying AI in real-world scenarios.' },
  { full_name: 'Arpita B.', course_name: 'Working Professionals', rating: 5, feedback: 'Great experience and very insightful session overall. Highly Recommended. The trainer made complex AI concepts very accessible.' },
  { full_name: 'Rohit Kumar S.', course_name: 'Working Professionals', rating: 5, feedback: 'The session was excellent. Everything was explained with real examples which made it very easy to grasp the AI concepts quickly.' },
  { full_name: 'Sourangshu M.', course_name: 'School Students', rating: 5, feedback: 'An excellent learning experience — AI with Arijit makes understanding AI simple, clear, and insightful. I\'m excited to continue learning.' },
  { full_name: 'Chetanaa D.', course_name: 'College Students', rating: 5, feedback: 'Had a great experience by this webinar. Learnt many things. Thank you for the support and guidance throughout the session.' },
]

export function CourseLearnerReviews({
  testimonials, category,
}: {
  testimonials: Testimonial[]
  category: string
}) {
  const items  = testimonials.length >= 3 ? testimonials : FALLBACK
  const doubled = [...items, ...items]

  return (
    <section className="py-16 overflow-hidden" style={{ background: '#f8fafc' }}>
      <div className="max-w-6xl mx-auto px-4 mb-8 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
          What Learners Are Saying
        </h2>
        <p className="text-gray-500 text-sm">
          Real ratings from students who attended, rated, and left verified feedback
        </p>
      </div>

      {/* Row 1 — scroll left */}
      <div className="mb-4 relative">
        <div className="flex gap-4" style={{ animation: 'marqueeLeft 38s linear infinite', width: 'max-content' }}>
          {doubled.map((t, i) => <Card key={`r1-${i}`} t={t} />)}
        </div>
      </div>

      {/* Row 2 — scroll right */}
      <div className="relative">
        <div className="flex gap-4" style={{ animation: 'marqueeRight 42s linear infinite', width: 'max-content' }}>
          {[...doubled].reverse().map((t, i) => <Card key={`r2-${i}`} t={t} />)}
        </div>
      </div>

      <style jsx>{`
        @keyframes marqueeLeft  { from { transform: translateX(0); }    to { transform: translateX(-50%); } }
        @keyframes marqueeRight { from { transform: translateX(-50%); } to { transform: translateX(0); }    }
      `}</style>
    </section>
  )
}
