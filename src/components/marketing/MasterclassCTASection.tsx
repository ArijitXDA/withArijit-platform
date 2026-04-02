import Link from 'next/link'

export function MasterclassCTASection() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-3">
          Live This Sunday · 90 Minutes · AI Certificate
        </p>
        <h2 className="text-4xl font-bold mb-4">Get AI Certified This Sunday</h2>
        <p className="text-xl text-indigo-100 mb-3 max-w-2xl mx-auto">
          One live session. Globally recognised certificate. Choose your audience category and register now.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm text-indigo-200">
          <span>✔ Working Professionals</span>
          <span>✔ Students</span>
          <span>✔ School Students</span>
          <span>✔ Tech Developers</span>
          <span>✔ Business Leaders</span>
        </div>
        <Link
          href="/masterclass"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-indigo-700 font-bold text-base hover:bg-indigo-50 transition-colors shadow-lg"
        >
          Register &amp; Pay Now →
        </Link>
      </div>
    </section>
  )
}
