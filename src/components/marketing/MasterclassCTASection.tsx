import Link from 'next/link'

export function MasterclassCTASection() {
  // This band is a saturated brand gradient (blue in light, violet in dark) in BOTH
  // themes, so its text is fixed light — NOT theme tokens (which would go dark-navy
  // in light mode and vanish on the blue). Only the button surface flips.
  return (
    <section className="py-20 px-4" style={{ background: 'var(--os-cta-grad)', color: '#ffffff' }}>
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Live This Sunday · 90 Minutes · AI Certificate
        </p>
        <h2 className="text-4xl font-bold mb-4">Get AI Certified This Sunday</h2>
        <p className="text-xl mb-3 max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.92)' }}>
          One live session. Globally recognised certificate. Choose your audience category and register now.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm" style={{ color: 'rgba(255,255,255,0.94)' }}>
          <span>✔ Working Professionals</span>
          <span>✔ Students</span>
          <span>✔ School Students</span>
          <span>✔ Tech Developers</span>
          <span>✔ Business Leaders</span>
        </div>
        <Link
          href="/masterclass"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-transform hover:scale-105"
          style={{ background: '#ffffff', color: '#4338ca', boxShadow: 'var(--os-sh-btn)' }}
        >
          Register &amp; Pay Now →
        </Link>
      </div>
    </section>
  )
}
