const SENIORS = [
  {
    name:   'Dakshayani B P',
    role:   'Retired Scientist & Director',
    org:    'ISRO',
    quote:  'Arijit made Agentic AI easy even for a novice like me. He doesn\'t just teach concepts — he helps students build real intelligent agents for real-world problems.',
    emoji:  '🚀',
    color:  '#4f46e5',
  },
  {
    name:   'Dr. Harish B Suri',
    role:   'Professor',
    org:    'IIM Mumbai · IIT Kharagpur',
    quote:  'Arijit\'s grip on data science and AI is exceptional. He seamlessly bridges simple tools to advanced AI-ML solutions across industries.',
    emoji:  '🏛️',
    color:  '#059669',
  },
  {
    name:   'Suvajit Ray',
    role:   'Head of Product & Distribution',
    org:    'IIFL Capital',
    quote:  'Arijit has a rare ability to simplify complex AI and analytics concepts. His depth in BI, Cognitive AI and numerical analysis clearly sets him apart.',
    emoji:  '📊',
    color:  '#d97706',
  },
  {
    name:   'Sourav Choudhury',
    role:   'IIM Mumbai · Harvard Business School',
    org:    'Nestlé',
    quote:  'A rare blend of technical depth, mentorship and strategic thinking. Arijit doesn\'t just teach AI — he changes how you think about problems.',
    emoji:  '🎯',
    color:  '#7c3aed',
  },
]

export function CourseSeniorTestimonials() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4 border border-amber-200 bg-amber-50 text-amber-700">
            ⭐ Trusted by Scientists, CXOs &amp; Professors ⭐
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            What Industry Leaders Say
          </h2>
          <p className="text-gray-500">
            From ISRO scientists to IIM professors — leaders who&apos;ve seen it all endorse Arijit&apos;s approach
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {SENIORS.map(({ name, role, org, quote, emoji, color }) => (
            <div key={name}
              className="relative flex flex-col p-7 rounded-3xl border bg-white transition-all hover:-translate-y-1 hover:shadow-xl"
              style={{
                borderColor: `${color}20`,
                boxShadow: `0 4px 20px ${color}08`,
              }}>
              {/* Quote mark */}
              <div className="text-5xl font-black leading-none mb-4 opacity-15" style={{ color }}>
                &ldquo;
              </div>

              {/* Quote */}
              <p className="text-gray-700 leading-relaxed text-base flex-1 mb-6 italic">
                &ldquo;{quote}&rdquo;
              </p>

              {/* Attribution */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: `${color}12` }}>
                  {emoji}
                </div>
                <div>
                  <p className="font-extrabold text-gray-900 text-sm">{name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{role}</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color }}>{org}</p>
                </div>
              </div>

              {/* Accent top bar */}
              <div className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full"
                style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
