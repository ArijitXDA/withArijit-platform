import Link from 'next/link'
import { IndianRupee, Users, TrendingUp, Award, ArrowRight, CheckCircle } from 'lucide-react'

const PARTNER_BENEFITS = [
  { icon: IndianRupee, label: 'Earn Commissions',       desc: 'On every student enrolment you bring in' },
  { icon: Users,       label: 'Build Sub-Networks',     desc: 'Recruit sub-partners and earn from 6 levels' },
  { icon: TrendingUp,  label: 'Passive Income',         desc: 'Keep earning even when you are not actively selling' },
  { icon: Award,       label: 'Full Training & Support', desc: 'Marketing materials, webinars, and a dedicated support team' },
]

const PARTNER_TYPES = [
  'Educators & Trainers',
  'HR & Recruitment Professionals',
  'Entrepreneurs & Business Coaches',
  'Freelancers & Consultants',
  'College Professors & Faculty',
  'YouTubers & Content Creators',
]

export function PartnerSection() {
  return (
    <section className="py-20 px-4" style={{ background: 'var(--os-page)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="rounded-3xl overflow-hidden border" style={{ background: 'var(--os-page-2)', borderColor: 'var(--os-line)', boxShadow: 'var(--os-sh-3d)' }}>
          <div className="grid lg:grid-cols-2 gap-0">

            {/* Left — content */}
            <div className="p-10 md:p-14">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border mb-6" style={{ background: 'var(--os-surface-2)', color: 'var(--os-accent-soft)', borderColor: 'var(--os-pill-line)' }}>
                AI Partner Programme
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: 'var(--os-ink)' }}>
                Earn While Upskilling India with AI
              </h2>
              <p className="mb-8 leading-relaxed" style={{ color: 'var(--os-ink-2)' }}>
                Join the oStaran Partner Programme — completely free to join. Earn commissions on every
                enrolment, build a team of sub-partners, and create a sustainable passive income stream.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {PARTNER_BENEFITS.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl border" style={{ background: 'var(--os-surface)', borderColor: 'var(--os-line)', boxShadow: 'var(--os-sh-sm)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--os-surface-2)' }}>
                      <Icon size={15} style={{ color: 'var(--os-accent)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--os-ink)' }}>{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--os-muted)' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <a href="https://partner.ostaran.com"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: 'var(--os-cta-grad)', color: '#fff', boxShadow: 'var(--os-sh-btn)' }}>
                  Become a Partner <ArrowRight size={15} />
                </a>
                <p className="text-xs" style={{ color: 'var(--os-faint)' }}>Free to join. No investment required.</p>
              </div>
            </div>

            {/* Right — who can join */}
            <div className="p-10 md:p-14 border-l" style={{ borderColor: 'var(--os-line)' }}>
              <h3 className="font-bold text-lg mb-6" style={{ color: 'var(--os-ink)' }}>Who can become a Partner?</h3>
              <div className="space-y-3">
                {PARTNER_TYPES.map(type => (
                  <div key={type} className="flex items-center gap-3">
                    <CheckCircle size={15} className="text-green-400 shrink-0" />
                    <span className="text-sm" style={{ color: 'var(--os-ink-2)' }}>{type}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-5 rounded-2xl border" style={{ background: 'var(--os-surface)', borderColor: 'var(--os-line)', boxShadow: 'var(--os-sh-sm)' }}>
                <p className="font-bold text-2xl mb-1" style={{ color: 'var(--os-ink)' }}>6-Level</p>
                <p className="text-sm" style={{ color: 'var(--os-muted)' }}>Deep partner network with commissions at every level</p>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((l, i) => (
                    <div key={l} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: `rgba(99,102,241,${0.9 - i * 0.12})`, color: '#fff' }}>
                        {l}
                      </div>
                      {i < 5 && <div className="w-4 h-px" style={{ background: 'var(--os-line)' }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
