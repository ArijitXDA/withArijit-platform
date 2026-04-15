'use client'

// Points system reference (shown in sidebar)
export const POINT_ACTIONS = [
  { action: 'Ask a question',     pts: '+15',  color: '#f59e0b' },
  { action: 'Post an answer',     pts: '+10',  color: '#60a5fa' },
  { action: 'Receive an upvote',  pts: '+1',   color: '#a78bfa' },
  { action: 'Best Answer chosen', pts: '+50',  color: '#34d399' },
]

export const RANKS = [
  { name: 'Explorer',       min: 0,    color: '#94a3b8', icon: '🔭' },
  { name: 'Practitioner',   min: 100,  color: '#60a5fa', icon: '🛠' },
  { name: 'Analyst',        min: 500,  color: '#a78bfa', icon: '📊' },
  { name: 'Specialist',     min: 1500, color: '#34d399', icon: '⚡' },
  { name: 'Mentor',         min: 3000, color: '#f59e0b', icon: '🏆' },
  { name: 'Thought Leader', min: 6000, color: '#f97316', icon: '🌟' },
]

export const BADGES: Record<string, { label: string; desc: string; icon: string }> = {
  first_post:    { label: 'First Post',    desc: 'Started your first thread',    icon: '✍️' },
  first_answer:  { label: 'First Answer',  desc: 'Posted your first reply',      icon: '💬' },
  best_answer:   { label: 'Best Answer',   desc: 'Marked as best answer',        icon: '🏅' },
}

interface MemberStats {
  points: number; rank: string; badges: string[]
}

interface Props { member: MemberStats | null }

export function LeaderboardPanel({ member }: Props) {
  const currentRank = RANKS.find(r => r.name === (member?.rank ?? 'Explorer')) ?? RANKS[0]
  const nextRank    = RANKS.find(r => r.min > (member?.points ?? 0))
  const progress    = nextRank
    ? Math.min(100, ((( member?.points ?? 0) - currentRank.min) / (nextRank.min - currentRank.min)) * 100)
    : 100

  return (
    <aside className="hidden lg:flex w-64 flex-col overflow-y-auto py-5 px-4 gap-5 shrink-0"
      style={{ background: 'rgba(8,8,32,0.95)', borderLeft: '1px solid rgba(139,92,246,0.12)' }}>

      {/* My rank card */}
      {member && (
        <div className="rounded-xl p-4 border"
          style={{ background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.2)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(139,92,246,0.7)' }}>
            My Progress
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{currentRank.icon}</span>
            <div>
              <p className="text-sm font-bold" style={{ color: currentRank.color }}>{currentRank.name}</p>
              <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{member.points} pts</p>
            </div>
          </div>
          {nextRank && (
            <>
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: `linear-gradient(90deg,${currentRank.color},${nextRank.color})` }} />
              </div>
              <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>
                {nextRank.min - (member.points)} pts to {nextRank.icon} {nextRank.name}
              </p>
            </>
          )}
          {member.points >= 3000 && (
            <div className="mt-2 text-[10px] px-2 py-1 rounded-lg text-center font-bold"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              🎓 Eligible for FREE course reward!
            </div>
          )}
          {/* Badges */}
          {member.badges?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {member.badges.map(b => {
                const badge = BADGES[b]
                if (!badge) return null
                return (
                  <span key={b} title={badge.desc}
                    className="text-sm px-1.5 py-0.5 rounded cursor-help"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {badge.icon}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Points system */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(139,92,246,0.6)' }}>
          Earn Points
        </p>
        <div className="space-y-1.5">
          {POINT_ACTIONS.map(a => (
            <div key={a.action} className="flex items-center justify-between text-xs">
              <span style={{ color: 'rgba(148,163,184,0.7)' }}>{a.action}</span>
              <span className="font-bold" style={{ color: a.color }}>{a.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rank ladder */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(139,92,246,0.6)' }}>
          Rank Ladder
        </p>
        <div className="space-y-1.5">
          {RANKS.map(r => (
            <div key={r.name} className="flex items-center gap-2 text-xs">
              <span>{r.icon}</span>
              <span style={{ color: r.color, fontWeight: member?.rank === r.name ? 700 : 400 }}>{r.name}</span>
              <span className="ml-auto text-[10px]" style={{ color: 'rgba(100,116,139,0.7)' }}>
                {r.min === 0 ? '0' : r.min.toLocaleString()}+
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg p-2 text-[10px] text-center"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
          🎓 Reach Mentor (3,000 pts) → win a FREE course of your choice!
        </div>
      </div>

      {/* CTA */}
      <a href="https://www.ostaran.com/masterclass"
        className="block w-full text-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>
        Get AI Certified →
      </a>
    </aside>
  )
}
