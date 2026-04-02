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
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #1e1b4b)' }}>
          <div className="grid lg:grid-cols-2 gap-0">

            {/* Left — content */}
            <div className="p-10 md:p-14">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-6">
                AI Partner Programme
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                Earn While Upskilling India with AI
              </h2>
              <p className="text-indigo-200 mb-8 leading-relaxed">
                Join the oStaran Partner Programme — completely free to join. Earn commissions on every
                enrolment, build a team of sub-partners, and create a sustainable passive income stream.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {PARTNER_BENEFITS.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-indigo-300" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{label}</p>
                      <p className="text-indigo-300 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <Link href="/become-a-partner"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-indigo-900 bg-white hover:bg-indigo-50 transition-colors">
                  Become a Partner <ArrowRight size={15} />
                </Link>
                <p className="text-indigo-400 text-xs">Free to join. No investment required.</p>
              </div>
            </div>

            {/* Right — who can join */}
            <div className="p-10 md:p-14 border-l border-white/10">
              <h3 className="text-white font-bold text-lg mb-6">Who can become a Partner?</h3>
              <div className="space-y-3">
                {PARTNER_TYPES.map(type => (
                  <div key={type} className="flex items-center gap-3">
                    <CheckCircle size={15} className="text-green-400 shrink-0" />
                    <span className="text-indigo-200 text-sm">{type}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-5 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-white font-bold text-2xl mb-1">6-Level</p>
                <p className="text-indigo-300 text-sm">Deep partner network with commissions at every level</p>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((l, i) => (
                    <div key={l} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: `rgba(99,102,241,${0.9 - i * 0.12})` }}>
                        {l}
                      </div>
                      {i < 5 && <div className="w-4 h-px bg-white/20" />}
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
