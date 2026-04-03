export function AboutMarkets() {
  const MARKETS = [
    {
      flag:    '🇮🇳',
      country: 'India',
      label:   'Primary Market',
      color:   '#f97316',
      desc:    'Our home. The source of our mission. India is where the demand is highest, the growth fastest, and the impact most visible. Every city. Every background. Every age.',
      stats:   ['48,000+ learners', 'All 9 programmes', 'Hindi & English sessions'],
    },
    {
      flag:    '🇺🇸',
      country: 'United States',
      label:   'Growing Market',
      color:   '#3b82f6',
      desc:    'Indian diaspora in tech hubs — Silicon Valley, New York, New Jersey — and American professionals who found oStaran through learner recommendations.',
      stats:   ['Weekend batches IST', 'Certificate accepted by US employers', 'Growing organically'],
    },
    {
      flag:    '🇨🇦',
      country: 'Canada',
      label:   'Growing Market',
      color:   '#ef4444',
      desc:    'A large and growing South Asian community in Toronto, Vancouver and Calgary has found our programmes particularly relevant for career transition and upskilling.',
      stats:   ['Toronto · Vancouver · Calgary', 'Strong community word-of-mouth', 'Group enrolments active'],
    },
    {
      flag:    '🇪🇺',
      country: 'Western Europe',
      label:   'Emerging Market',
      color:   '#8b5cf6',
      desc:    'UK, Germany, Netherlands and beyond — Indian professionals in European tech and finance firms are upskilling with oStaran to stay ahead in AI-first workplaces.',
      stats:   ['UK · Germany · Netherlands', 'Fully remote access', 'Certificate globally recognised'],
    },
  ]

  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(135deg, #05051a 0%, #0d0b2b 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
            Global Reach
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Where Our Learners Are
          </h2>
          <p className="text-slate-500">
            Indian-built. Globally trusted. Four markets and growing.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MARKETS.map(({ flag, country, label, color, desc, stats }) => (
            <div key={country}
              className="flex flex-col gap-4 p-6 rounded-3xl border transition-all hover:-translate-y-1 hover:shadow-2xl"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderColor: `${color}25`,
              }}>
              {/* Flag + name */}
              <div>
                <span className="text-5xl block mb-3">{flag}</span>
                <p className="font-extrabold text-white text-lg leading-tight">{country}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                  style={{ background: `${color}18`, color }}>
                  {label}
                </span>
              </div>

              {/* Description */}
              <p className="text-slate-400 text-xs leading-relaxed flex-1">{desc}</p>

              {/* Stats */}
              <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {stats.map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
                    <p className="text-xs text-slate-500">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
