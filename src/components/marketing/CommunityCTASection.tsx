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
      style={{ background: 'linear-gradient(135deg, #05051a 0%, #0d0b2b 50%, #05051a 100%)' }}>
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)' }} />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live Community · Ask Ari Active
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
          Join the AI Discussion Forum
        </h2>
        <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
          Ask questions, share insights, earn points, and climb the leaderboard alongside 1,000+ AI learners.
          Reach <span style={{ color: '#f59e0b' }} className="font-bold">Mentor rank (3,000 pts)</span> and win a <span style={{ color: '#34d399' }} className="font-bold">FREE course</span> of your choice.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.12)' }}>
              <Icon className="mx-auto mb-1.5" size={20} style={{ color }} />
              <p className="text-xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs mt-0.5 text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/community"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
              boxShadow: '0 0 30px rgba(124,58,237,0.35)' }}>
            <MessageSquare size={18} />
            Enter the Community
          </Link>
          <Link href="/community"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa' }}>
            <Award size={18} />
            View Leaderboard
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-600">
          Free 60-day access · No credit card · Tag @AskAri for instant AI answers
        </p>
      </div>
    </section>
  )
}
