interface Project {
  id: string; title: string; description: string; what_it_solves: string | null
  use_cases: string | null; dollar_value: number | null; session_range: string | null; emoji: string | null
}

export function CourseProjects({ projects }: { projects: Project[] }) {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 mb-4">
            Real Projects You'll Build
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            What You&apos;ll Actually Build
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Not toy examples or tutorial demos — production-ready AI systems with real commercial value
            that you own and can deploy, sell, or consult around.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {projects.map((p, i) => (
            <div key={p.id}
              className="group relative flex flex-col p-6 rounded-3xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>

              {/* Dollar value badge */}
              {p.dollar_value && (
                <div className="absolute top-5 right-5 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  ~${p.dollar_value.toLocaleString()} market value
                </div>
              )}

              {/* Session badge */}
              {p.session_range && (
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-4 w-fit">
                  🗓 {p.session_range}
                </div>
              )}

              {/* Title */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl shrink-0">{p.emoji ?? '🤖'}</span>
                <h3 className="font-extrabold text-gray-900 text-base leading-snug pr-16 group-hover:text-indigo-700 transition-colors">
                  {p.title}
                </h3>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">{p.description}</p>

              {/* What it solves */}
              {p.what_it_solves && (
                <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-emerald-700 font-semibold mb-1">💡 Business Impact</p>
                  <p className="text-xs text-emerald-800 leading-relaxed">{p.what_it_solves}</p>
                </div>
              )}

              {/* Use cases */}
              {p.use_cases && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Use Cases</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.use_cases.split(',').map(uc => (
                      <span key={uc.trim()}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                        {uc.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Every project is deployable on day one. You own all the code and IP — no restrictions on commercial use.
        </p>
      </div>
    </section>
  )
}
