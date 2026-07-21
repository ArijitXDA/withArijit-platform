import { Building2, Rocket, Crown, Briefcase } from 'lucide-react'

const AUDIENCES = [
  {
    icon: Building2,
    color: '#0891b2',
    title: 'Corporates & Enterprises',
    desc: 'Teams standing up agentic AI, data platforms or governance and wanting an expert steer before they commit.',
  },
  {
    icon: Rocket,
    color: '#d97706',
    title: 'Founders & Entrepreneurs',
    desc: 'Building an AI product and need architecture, model choices and a build path validated by someone who has shipped.',
  },
  {
    icon: Crown,
    color: '#7c3aed',
    title: 'CXOs & Business Leaders',
    desc: 'Setting AI strategy, evaluating spend and risk, and translating the hype into decisions your board can back.',
  },
  {
    icon: Briefcase,
    color: '#4f46e5',
    title: 'Product & Innovation Teams',
    desc: 'Turning a data or AI idea into a concrete plan — scoping, feasibility and the fastest route to a working system.',
  },
]

export function WhoThisIsFor() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 mb-4">
          Who this is for
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          Built for people making AI decisions
        </h2>
        <p className="text-gray-600 mt-4">
          This is a working session with an industrial AI expert — not a course. If you are an
          individual looking to upskill, our{' '}
          <a href="/masterclass" className="text-indigo-600 font-semibold hover:underline">
            AI certification programmes
          </a>{' '}
          are a better fit.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {AUDIENCES.map(({ icon: Icon, color, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: `${color}15` }}
            >
              <Icon size={22} style={{ color }} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
