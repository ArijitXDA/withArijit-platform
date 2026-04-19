'use client'

interface Channel { id: string; slug: string; name: string; description: string; icon: string }
interface Props { channels: Channel[]; active: Channel; onSelect: (ch: Channel) => void }

/**
 * ChannelList renders two different UIs depending on viewport:
 *  - sm+ (>=640px): vertical sidebar on the left of the community shell
 *  - mobile  (<640px): horizontal scrolling strip at the top of the main pane,
 *                     so mobile users can still switch channels (previously
 *                     the sidebar was entirely hidden, leaving no way to
 *                     change channels on phones).
 */
export function ChannelList({ channels, active, onSelect }: Props) {
  return (
    <>
      {/* Desktop / tablet sidebar */}
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

      {/* Mobile horizontal channel strip — shown above thread list */}
      <nav className="sm:hidden flex overflow-x-auto shrink-0 bg-white border-b px-2 py-2 gap-1.5"
        style={{ borderColor: '#e5e7eb', scrollbarWidth: 'none' }}
        aria-label="Channels">
        {channels.map(ch => {
          const isActive = active.id === ch.id
          return (
            <button key={ch.id} onClick={() => onSelect(ch)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all border"
              style={isActive ? {
                background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                color: '#fff',
                borderColor: '#7c3aed',
              } : {
                background: '#fff',
                color: '#6b7280',
                borderColor: '#e5e7eb',
              }}>
              <span>{ch.icon}</span>
              <span>#{ch.slug}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
