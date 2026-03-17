const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Sales Manager, TCS',
    quote: 'The AI for Sales program completely transformed how I prospect and close deals. Landed a 40% raise within 3 months.',
  },
  {
    name: 'Rajesh Kumar',
    role: 'Marketing Director, Infosys',
    quote: "Best AI education investment I've made. Practical, hands-on, and immediately applicable to my daily work.",
  },
  {
    name: 'Anita Patel',
    role: 'HR Head, Wipro',
    quote: 'The certification gave me credibility and the skills to lead our company\'s AI transformation initiative.',
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">What Our Students Say</h2>
          <p className="text-gray-600">Join thousands of professionals who&apos;ve transformed their careers with AI</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <p className="text-gray-700 mb-6 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-gray-500 text-sm">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
