const STATS = [
  { emoji: '🎓', value: '50,000+',  label: 'AI-Certified Learners',   sub: 'India, USA & Canada' },
  { emoji: '⭐', value: '4.9/5',    label: 'Average Rating',          sub: 'From verified learners' },
  { emoji: '🌍', value: '3',        label: 'Countries',               sub: 'India · USA · Canada' },
  { emoji: '🏛️', value: 'IIT',      label: 'Bombay Affiliated',       sub: 'Guest Lecturer' },
  { emoji: '🧾', value: '100%',     label: 'GST Invoices',            sub: 'For all purchases' },
  { emoji: '📜', value: '95%',      label: 'Placement Rate',          sub: 'Career outcomes' },
]

export function TrustBar() {
  return (
    <section
      className="py-6 px-4 border-b"
      style={{ background: '#05051a', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {STATS.map(({ emoji, value, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm whitespace-nowrap">
              <span className="text-base">{emoji}</span>
              <span className="font-black" style={{ color: '#a78bfa' }}>{value}</span>
              <span style={{ color: '#475569' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
