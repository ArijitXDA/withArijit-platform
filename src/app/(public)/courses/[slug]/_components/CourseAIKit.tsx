export function CourseAIKit() {
  return (
    <section className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a0f3c 50%, #0d1b3e 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Left — content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5 border"
              style={{ background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)', color: '#fbbf24' }}>
              🎁 Exclusive Physical Deliverable
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Your AI Kit — Couriered to Your Home
            </h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              Every enrolled student on a full-time paid programme receives a physical AI Kit couriered directly
              to their address in India — at no extra cost. It is your hands-on companion for the live sessions.
            </p>
            <div className="space-y-3">
              {[
                ['📦', 'Delivered to Indian addresses after successful enrolment'],
                ['📋', 'Curated AI tools reference guide & prompt library'],
                ['🗂️', 'Session workbook for notes and project tracking'],
                ['🔖', 'oStaran learner card — your community identity'],
              ].map(([icon, text]) => (
                <div key={text as string} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{icon}</span>
                  <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Right — visual */}
          <div className="flex items-center justify-center">
            <div className="w-64 h-64 rounded-3xl border border-amber-400/20 flex flex-col items-center justify-center gap-4"
              style={{ background: 'rgba(251,191,36,0.05)' }}>
              <span className="text-8xl">📦</span>
              <div className="text-center">
                <p className="text-amber-400 font-bold text-sm">AI Kit</p>
                <p className="text-slate-500 text-xs">Couriered to you · India only</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
