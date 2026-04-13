'use client'

interface Channel { id: string; slug: string; name: string; description: string; icon: string }
interface Props {
  channels:  Channel[]
  active:    Channel
  onSelect:  (ch: Channel) => void
}

export function ChannelList({ channels, active, onSelect }: Props) {
  return (
    <aside className="hidden sm:flex w-52 flex-col bg-white border-r border-gray-100 overflow-y-auto py-4 shrink-0">
      <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Channels</p>
      {channels.map(ch => (
        <button
          key={ch.id}
          onClick={() => onSelect(ch)}
          className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors ${
            active.id === ch.id
              ? 'bg-indigo-50 text-indigo-700 font-semibold border-r-2 border-indigo-500'
              : 'text-gray-600 hover:bg-gray-50'
          }`}>
          <span className="text-base leading-none">{ch.icon}</span>
          <span className="text-sm truncate">#{ch.slug}</span>
        </button>
      ))}
    </aside>
  )
}
