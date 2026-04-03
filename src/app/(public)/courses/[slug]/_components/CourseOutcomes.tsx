const OUTCOMES: Record<string, { icon: string; title: string; desc: string; stat: string }[]> = {
  default: [
    { icon: '💰', title: 'Increase Your Salary', stat: '30%+ avg. growth', desc: 'AI skills are the most sought-after in hiring today. Our learners report an average salary increase of 30% or more within 6 months of certification — across IT, finance, marketing, and operations.' },
    { icon: '🚀', title: 'Launch AI Ventures', stat: 'Weeks, not years', desc: 'Build and launch AI-powered products in weeks — not months. Multiple oStaran graduates have launched commercially successful AI ventures using the exact projects built in this programme.' },
    { icon: '💼', title: 'Consulting Income', stat: '₹5,000–₹50,000/day', desc: 'AI consultants command premium rates across industries. This programme positions you to offer AI consulting from session 8 onwards — with a portfolio of real, deployable projects to show clients.' },
  ],
  school: [
    { icon: '🎓', title: 'College Advantage', stat: 'Stand out from thousands', desc: 'AI certification gives school students a massive edge in college applications and scholarship interviews. Start building your portfolio before you even graduate Class 12.' },
    { icon: '🏆', title: 'Future-Ready Skills', stat: 'Skills schools don\'t teach', desc: 'AI literacy is the #1 skill employers and colleges will look for in the next decade. Get ahead of your peers with hands-on, practical AI skills built in live sessions.' },
    { icon: '🌟', title: 'Build Real Projects', stat: 'Not just theory', desc: 'Every session produces a real project you can show universities, scholarship committees, and future employers. You won\'t just learn about AI — you\'ll build with it.' },
  ],
}

export function CourseOutcomes({ category }: { category: string }) {
  const items = OUTCOMES[category] ?? OUTCOMES.default

  return (
    <section className="py-16 px-4" style={{ background: '#070812' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
            How This Programme Transforms Your Life
          </h2>
          <p className="text-slate-500 text-sm">Not just a certificate — a career and income transformation</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {items.map(({ icon, title, stat, desc }) => (
            <div key={title} className="rounded-3xl border p-6 flex flex-col gap-3"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-4xl">{icon}</span>
              <div>
                <p className="text-white font-extrabold text-lg leading-snug">{title}</p>
                <p className="text-indigo-400 text-xs font-bold mt-0.5">{stat}</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
