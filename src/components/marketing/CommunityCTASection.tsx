import Link from 'next/link'
import { MessageSquare, Users, Zap, Award } from 'lucide-react'

export function CommunityCTASection() {
  const stats = [
    { icon: MessageSquare, label: 'Active Threads', value: '200+', color: '#a78bfa' },
    { icon: Users,         label: 'AI Learners',   value: '1,000+', color: '#60a5fa' },
    { icon: Zap,           label: 'Points Earned',  value: 'Daily',  color: '#f59e0b' },
    { icon: Award,         label: 'Free Course',    value: '@ 3k pts', color: '#34d399' },
  ]

  return (
    <section className="relative overflow-hidden py-20 px-4"
      style={{ background: 'var(--os-page)' }}>
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(var(--os-accent) 1px, transparent 1px), linear-gradient(90deg, var(--os-accent) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(ellipse, var(--os-accent) 0%, transparent 70%)' }} />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: 'var(--os-surface)', border: '1px solid var(--os-pill-line)', color: 'var(--os-accent-soft)', boxShadow: 'var(--os-sh-3d)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live Community · Ask Ari Active
        </div>

        <h2 className="text-3xl sm:text-4xl font-black mb-4 leading-tight" style={{ color: 'var(--os-ink)' }}>
          Join the AI Discussion Forum
        </h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--os-ink-2)' }}>
          Ask questions, share insights, earn points, and climb the leaderboard alongside 1,000+ AI learners.
          Reach <span style={{ color: '#f59e0b' }} className="font-bold">Mentor rank (3,000 pts)</span> and win a <span style={{ color: '#34d399' }} className="font-bold">FREE course</span> of your choice.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl p-4 text-center"
              style={{ background: 'var(--os-surface)', border: '1px solid var(--os-pill-line)', boxShadow: 'var(--os-sh-3d)' }}>
              <Icon className="mx-auto mb-1.5" size={20} style={{ color }} />
              <p className="text-xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--os-faint)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/community"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{ background: 'var(--os-cta-grad)', color: '#fff',
              boxShadow: 'var(--os-sh-btn)' }}>
            <MessageSquare size={18} />
            Enter the Community
          </Link>
          <Link href="/community"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:opacity-90"
            style={{ background: 'var(--os-surface)', border: '1px solid var(--os-pill-line)', color: 'var(--os-accent)', boxShadow: 'var(--os-sh-3d)' }}>
            <Award size={18} />
            View Leaderboard
          </Link>
        </div>

        <p className="mt-6 text-xs" style={{ color: 'var(--os-faint)' }}>
          Free 60-day access · No credit card · Tag @AskAri for instant AI answers
        </p>
      </div>
    </section>
  )
}
