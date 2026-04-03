export function CourseCurriculum({ subjects }: { subjects: string[] }) {
  return (
    <section className="py-16 px-4" style={{ background: '#070812' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
            What You&apos;ll Learn
          </span>
          <h2 className="text-3xl font-extrabold text-white mb-3">Curriculum Highlights</h2>
          <p className="text-slate-500 text-sm">Live hands-on sessions — no slides, no theory dumps, just building</p>
        </div>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {subjects.map((s: string, i: number) => (
            <span key={s}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:border-indigo-500/60 hover:bg-indigo-500/10"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: '#cbd5e1',
              }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: `hsl(${(i * 37) % 360}, 70%, 65%)` }} />
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
