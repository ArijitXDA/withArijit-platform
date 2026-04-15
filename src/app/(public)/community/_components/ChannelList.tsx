'use client'

interface Channel { id: string; slug: string; name: string; description: string; icon: string }
interface Props { channels: Channel[]; active: Channel; onSelect: (ch: Channel) => void }

export function ChannelList({ channels, active, onSelect }: Props) {
  return (
    <aside className="hidden sm:flex w-48 flex-col shrink-0 py-4 overflow-y-auto"
      style={{ background: 'rgba(8,8,32,0.98)', borderRight: '1px solid rgba(139,92,246,0.12)' }}>
      <p className="px-4 text-[10px] font-bold uppercase tracking-widest mb-3"
        style={{ color: 'rgba(139,92,246,0.6)' }}>Channels</p>
      {channels.map(ch => (
        <button key={ch.id} onClick={() => onSelect(ch)}
          className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-all"
          style={active.id === ch.id ? {
            background: 'rgba(124,58,237,0.15)',
            color: '#a78bfa',
            borderRight: '2px solid #7c3aed',
            fontWeight: 700,
          } : {
            color: 'rgba(148,163,184,0.65)',
          }}>
          <span className="text-base leading-none">{ch.icon}</span>
          <span className="text-xs truncate">#{ch.slug}</span>
        </button>
      ))}
    </aside>
  )
}
