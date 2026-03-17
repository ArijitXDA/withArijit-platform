const STATS = [
  { value: '10,000+', label: 'Learners' },
  { value: '50+', label: 'Live Sessions' },
  { value: '95%', label: 'Placement Rate' },
  { value: '4.9★', label: 'Rating' },
]

export function StatsBar() {
  return (
    <section className="bg-indigo-600 text-white py-10 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {STATS.map(s => (
          <div key={s.label}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-indigo-200 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
