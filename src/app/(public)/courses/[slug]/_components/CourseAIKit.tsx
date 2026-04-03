export function CourseAIKit() {
  const KIT_ITEMS = [
    { emoji: '📓', title: 'AI Learning Roadmap Notebook',    desc: 'A structured physical notebook with your complete AI learning roadmap, session tracking pages, and project planning sheets.' },
    { emoji: '📖', title: 'AI Handbook',                      desc: 'A curated reference handbook covering essential AI concepts, tools, frameworks and terminology — designed to sit on your desk.' },
    { emoji: '📋', title: 'Course Curriculum Booklet',        desc: 'Your complete session-by-session curriculum in print — annotate it, highlight it, track your progress as you go.' },
    { emoji: '🏅', title: '"I am an AI Guy / Girl" Badge',    desc: 'Collector-grade identity badge/sticker. Wear it, stick it on your laptop, your notebook — your AI identity, displayed.' },
    { emoji: '⭐', title: '"I am an AI Superstar" Sticker',   desc: 'A premium sticker awarded to every kit recipient. Share it, frame it, or just wear it with pride.' },
    { emoji: '🎖️', title: 'oStaran Merch & Collectibles',     desc: 'Exclusive oStaran branded merchandise included in every kit — thoughtfully curated for the serious AI learner.' },
    { emoji: '📜', title: 'Webinar Certificate Hard Copy',    desc: 'If you attended a webinar before enrolling, your webinar certificate is printed and included in the kit.' },
    { emoji: '🪪', title: 'oStaran Learner Card',             desc: 'Your official oStaran community identity card — your passport to the alumni network, events, and future opportunities.' },
  ]

  return (
    <section
      className="py-16 px-4"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a0f3c 50%, #0d1b3e 100%)' }}
    >
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-5 border"
            style={{ background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)', color: '#fbbf24' }}>
            🎁 Exclusive Physical Deliverable — Included With Every Full-Time Enrolment
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Your AI Kit — Couriered to Your Home
          </h2>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
            Every enrolled student receives a physical AI Kit couriered directly to their
            address in India — at no extra cost. Unbox your AI journey.
          </p>
          <p className="text-slate-500 text-sm mt-3">
            📦 Delivered to Indian addresses · Dispatched after successful full-course payment
          </p>
        </div>

        {/* Kit items grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {KIT_ITEMS.map(({ emoji, title, desc }) => (
            <div
              key={title}
              className="flex flex-col gap-3 p-5 rounded-2xl border transition-all hover:border-amber-400/30 hover:bg-amber-400/05"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(251,191,36,0.12)',
              }}
            >
              <span className="text-3xl">{emoji}</span>
              <div>
                <p className="font-bold text-white text-sm leading-snug mb-1">{title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div
          className="rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border"
          style={{ background: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.2)' }}
        >
          <div>
            <p className="text-amber-300 font-bold text-base">📦 How it works</p>
            <p className="text-slate-400 text-sm mt-1">
              Enrol → Payment confirmed → Kit assembled → Couriered within 7–10 working days
              to your registered Indian address. No action needed from you.
            </p>
          </div>
          <div className="text-center shrink-0">
            <p className="text-amber-400 font-black text-2xl">100%</p>
            <p className="text-slate-500 text-xs">Free. Included.</p>
          </div>
        </div>

      </div>
    </section>
  )
}
