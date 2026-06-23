// Self-contained sections for MENTOR course pages, rendered from
// awa_courses.landing_content. Kept separate so the existing oStaran course
// components are untouched. All server-rendered (FAQ uses <details>).

interface Pair { title: string; desc?: string; summary?: string }
interface QA { q: string; a: string }

const SECTION = 'py-16 px-4'
const H2 = 'text-3xl font-extrabold text-white text-center mb-2'
const SUB = 'text-slate-500 text-sm text-center mb-10 max-w-2xl mx-auto'

export function MentorWhatYouGet({ items }: { items?: Pair[] }) {
  if (!items?.length) return null
  return (
    <section className={SECTION} style={{ background: '#080b14' }}>
      <div className="max-w-5xl mx-auto">
        <h2 className={H2}>What You Get</h2>
        <p className={SUB}>Everything included with this programme</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl border p-5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-white font-bold" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>✓</div>
              <p className="text-white font-semibold text-sm">{it.title}</p>
              {it.desc && <p className="text-slate-400 text-xs mt-1 leading-relaxed">{it.desc}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function MentorCurriculum({ highlights }: { highlights?: string[] }) {
  if (!highlights?.length) return null
  return (
    <section className={SECTION} style={{ background: '#06080f' }}>
      <div className="max-w-4xl mx-auto">
        <h2 className={H2}>What You&apos;ll Learn</h2>
        <p className={SUB}>The highlights of this curriculum</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <span className="text-violet-400 mt-0.5">●</span>
              <span className="text-slate-300 text-sm leading-relaxed">{h}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function MentorSessions({ sessions }: { sessions?: Pair[] }) {
  if (!sessions?.length) return null
  return (
    <section className={SECTION} style={{ background: '#080b14' }}>
      <div className="max-w-3xl mx-auto">
        <h2 className={H2}>Session-by-Session</h2>
        <p className={SUB}>{sessions.length} live sessions, step by step</p>
        <div className="space-y-2">
          {sessions.map((s, i) => (
            <div key={i} className="flex gap-4 rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-extrabold text-white" style={{ background: 'rgba(124,58,237,0.18)', color: '#c4b5fd' }}>{i + 1}</span>
              <div>
                <p className="text-white font-semibold text-sm">{s.title}</p>
                {s.summary && <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{s.summary}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function MentorProjects({ items }: { items?: Pair[] }) {
  if (!items?.length) return null
  return (
    <section className={SECTION} style={{ background: '#06080f' }}>
      <div className="max-w-4xl mx-auto">
        <h2 className={H2}>Real Projects You&apos;ll Build</h2>
        <p className={SUB}>Hands-on, portfolio-ready work</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((p, i) => (
            <div key={i} className="rounded-2xl border p-5" style={{ background: 'rgba(79,70,229,0.05)', borderColor: 'rgba(124,58,237,0.2)' }}>
              <p className="text-white font-semibold text-sm">🛠️ {p.title}</p>
              {p.desc && <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{p.desc}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function MentorFAQ({ faqs }: { faqs?: QA[] }) {
  if (!faqs?.length) return null
  return (
    <section className={SECTION} style={{ background: '#080b14' }}>
      <div className="max-w-3xl mx-auto">
        <h2 className={H2}>Frequently Asked Questions</h2>
        <p className={SUB}>&nbsp;</p>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <details key={i} className="rounded-xl border p-4 group" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <summary className="text-white font-semibold text-sm cursor-pointer list-none flex items-center justify-between gap-2">
                {f.q}<span className="text-slate-500 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
