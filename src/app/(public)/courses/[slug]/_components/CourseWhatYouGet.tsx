const ITEMS = [
  { emoji: '📅', title: '26 Live Weekend Sessions',     sub: '60 minutes each · Saturday &/or Sunday · No weekday disruption' },
  { emoji: '🎁', title: 'AI Kit — Couriered to You',   sub: 'Physical AI learning kit delivered to your home (Indian addresses)' },
  { emoji: '📜', title: 'Interim Certificate',          sub: 'Issued after Session 13 — start adding credentials before completing' },
  { emoji: '🏆', title: 'Completion Certificate',       sub: 'Globally recognised AI certificate · Add to LinkedIn immediately' },
  { emoji: '♾️', title: 'Lifetime Recording Access',    sub: 'Miss a class? Every session recorded. Watch anytime, forever.' },
  { emoji: '🔧', title: 'Real Project Portfolio',       sub: '3+ deployable AI projects you can show employers, clients & investors' },
  { emoji: '🤝', title: 'Alumni Network',               sub: 'Join a community of AI professionals across India, USA & Canada' },
  { emoji: '🧾', title: 'GST Invoice',                  sub: 'Tax-deductible for businesses · Claimable as professional development' },
]

export function CourseWhatYouGet({ course }: { course: any }) {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 mb-4">
            Everything Included
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">What You Get</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ITEMS.map(({ emoji, title, sub }) => (
            <div key={title}
              className="group flex flex-col gap-3 p-5 rounded-2xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <span className="text-3xl">{emoji}</span>
              <div>
                <p className="font-bold text-gray-900 text-sm leading-snug">{title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
