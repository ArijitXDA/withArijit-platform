'use client'

export const POINT_ACTIONS = [
  { action: 'Ask a question',     pts: '+15', color: '#f97316' },
  { action: 'Post an answer',     pts: '+10', color: '#2563eb' },
  { action: 'Receive an upvote',  pts: '+1',  color: '#7c3aed' },
  { action: 'Best Answer chosen', pts: '+50', color: '#059669' },
]

export const RANKS = [
  { name: 'Explorer',       min: 0,    color: '#6b7280', bg: '#f3f4f6', icon: '🔭' },
  { name: 'Practitioner',   min: 100,  color: '#2563eb', bg: '#eff6ff', icon: '🛠' },
  { name: 'Analyst',        min: 500,  color: '#7c3aed', bg: '#f5f3ff', icon: '📊' },
  { name: 'Specialist',     min: 1500, color: '#059669', bg: '#ecfdf5', icon: '⚡' },
  { name: 'Mentor',         min: 3000, color: '#d97706', bg: '#fffbeb', icon: '🏆' },
  { name: 'Thought Leader', min: 6000, color: '#ea580c', bg: '#fff7ed', icon: '🌟' },
]

export const BADGES: Record<string, { label: string; desc: string; icon: string }> = {
  first_post:   { label: 'First Post',   desc: 'Started your first thread', icon: '✍️' },
  first_answer: { label: 'First Answer', desc: 'Posted your first reply',   icon: '💬' },
  best_answer:  { label: 'Best Answer',  desc: 'Marked as best answer',     icon: '🏅' },
}

interface MemberStats { points: number; rank: string; badges: string[] }
interface Props { member: MemberStats | null }

export function LeaderboardPanel({ member }: Props) {
  const currentRank = RANKS.find(r => r.name === (member?.rank ?? 'Explorer')) ?? RANKS[0]
  const nextRank    = RANKS.find(r => r.min > (member?.points ?? 0))
  const progress    = nextRank
    ? Math.min(100, (((member?.points ?? 0) - currentRank.min) / (nextRank.min - currentRank.min)) * 100)
    : 100

  // Wrapped by CommunitySidePanel — this component renders just the content stack.
  return (
    <div className="flex flex-col gap-5">

      {/* My rank card */}
      {member && (
        <div className="rounded-xl p-4 border" style={{ background: currentRank.bg, borderColor: currentRank.color + '33' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: currentRank.color }}>
            My Progress
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{currentRank.icon}</span>
            <div>
              <p className="text-sm font-bold" style={{ color: currentRank.color }}>{currentRank.name}</p>
              <p className="text-xs" style={{ color: '#6b7280' }}>{member.points.toLocaleString()} pts</p>
            </div>
          </div>
          {nextRank && (
            <>
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: '#e5e7eb' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: `linear-gradient(90deg,${currentRank.color},${nextRank.color})` }} />
              </div>
              <p className="text-[10px]" style={{ color: '#9ca3af' }}>
                {(nextRank.min - member.points).toLocaleString()} pts to {nextRank.icon} {nextRank.name}
              </p>
            </>
          )}
          {member.points >= 3000 && (
            <div className="mt-2 text-[10px] px-2 py-1 rounded-lg text-center font-bold"
              style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
              🎓 Eligible for FREE course reward!
            </div>
          )}
          {member.badges?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {member.badges.map(b => {
                const badge = BADGES[b]; if (!badge) return null
                return (
                  <span key={b} title={badge.desc}
                    className="text-sm px-1.5 py-0.5 rounded-lg cursor-help border"
                    style={{ background: '#fff', borderColor: '#e5e7eb' }}>
                    {badge.icon}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Earn Points */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: '#9ca3af' }}>Earn Points</p>
        <div className="space-y-2">
          {POINT_ACTIONS.map(a => (
            <div key={a.action} className="flex items-center justify-between text-xs rounded-lg px-3 py-2 border"
              style={{ background: '#fafafa', borderColor: '#f3f4f6' }}>
              <span style={{ color: '#374151' }}>{a.action}</span>
              <span className="font-bold" style={{ color: a.color }}>{a.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rank Ladder */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: '#9ca3af' }}>Rank Ladder</p>
        <div className="space-y-1.5">
          {RANKS.map(r => (
            <div key={r.name}
              className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5"
              style={{
                background: member?.rank === r.name ? r.bg : 'transparent',
                border: member?.rank === r.name ? `1px solid ${r.color}33` : '1px solid transparent',
              }}>
              <span>{r.icon}</span>
              <span style={{ color: r.color, fontWeight: member?.rank === r.name ? 700 : 500 }}>{r.name}</span>
              <span className="ml-auto text-[10px]" style={{ color: '#9ca3af' }}>
                {r.min === 0 ? '0' : r.min.toLocaleString()}+
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg p-2.5 text-[10px] text-center border"
          style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
          🎓 Reach Mentor (3,000 pts) → win a <strong>FREE course</strong> of your choice!
        </div>
      </div>

    </div>
  )
}
