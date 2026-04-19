'use client'

interface Channel { id: string; slug: string; name: string; description: string; icon: string }
interface Props { channels: Channel[]; active: Channel; onSelect: (ch: Channel) => void }

/**
 * Desktop / tablet channel sidebar. Hidden below sm.
 * Mobile channel switching lives in CommunityShell as a separate top strip.
 */
export function ChannelList({ channels, active, onSelect }: Props) {
  return (
    <aside className="hidden sm:flex w-52 flex-col shrink-0 py-4 overflow-y-auto border-r"
      style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
      <p className="px-4 text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: '#9ca3af' }}>Channels</p>
      {channels.map(ch => (
        <button key={ch.id} onClick={() => onSelect(ch)}
          className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-all rounded-none"
          style={active.id === ch.id ? {
            background: '#f5f3ff',
            color: '#7c3aed',
            borderRight: '3px solid #7c3aed',
            fontWeight: 700,
          } : {
            color: '#6b7280',
          }}>
          <span className="text-base leading-none">{ch.icon}</span>
          <span className="text-sm truncate">#{ch.slug}</span>
        </button>
      ))}
    </aside>
  )
}
