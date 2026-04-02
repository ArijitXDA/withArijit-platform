const TESTIMONIALS = [
  {
    quote: "Arijit made Agentic AI easy even for a novice like me. He doesn't just teach concepts — he helps students build real intelligent agents for real-world problems.",
    name:  'Dakshayani B P',
    role:  'Retired Scientist & Director, ISRO',
    emoji: '🚀',
  },
  {
    quote: "Arijit's grip on data science and AI is exceptional. He seamlessly bridges simple tools to advanced AI-ML solutions across industries.",
    name:  'Dr. Harish B Suri',
    role:  'Professor | IIM Mumbai | IIT Kharagpur',
    emoji: '🎓',
  },
  {
    quote: "Arijit has a rare ability to simplify complex AI and analytics concepts. His depth in BI, Cognitive AI and numerical analysis clearly sets him apart.",
    name:  'Suvajit Ray',
    role:  'Head of Product & Distribution, IIFL Capital',
    emoji: '💼',
  },
  {
    quote: 'A rare blend of technical depth, mentorship and strategic thinking.',
    name:  'Sourav Choudhury',
    role:  'IIM Mumbai | Harvard Business School | Nestle',
    emoji: '🏆',
  },
]

export function MasterclassTestimonials() {
  return (
    <section className="py-16 px-4 bg-gray-50 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-8 text-center">What Our Students Say</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <p className="text-3xl mb-3">{t.emoji}</p>
              <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
              <div>
                <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
