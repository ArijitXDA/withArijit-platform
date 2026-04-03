import Link from 'next/link'

const ACTIONS = [
  {
    emoji:   '🏆',
    label:   'Get AI Certified',
    sub:     'This Sunday · 90 min live',
    detail:  'Register & pay · Get joining link · Attend · Certificate issued',
    href:    '/masterclass',
    color:   '#4f46e5',
    bg:      'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    light:   '#eef2ff',
    cta:     'Register & Pay →',
    size:    'large',
  },
  {
    emoji:   '🟢',
    label:   'Download Certificate',
    sub:     'Already attended a webinar?',
    detail:  'View, verify & download your AI certificate instantly',
    href:    '/certificate-verification',
    color:   '#16a34a',
    bg:      'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
    light:   '#dcfce7',
    cta:     'View Certificate →',
    size:    'normal',
  },
  {
    emoji:   '👥',
    label:   'Enrol Your Team',
    sub:     'Group & Corporate Enrolment',
    detail:  'Buy seats in bulk · Individual dashboards · GST invoice',
    href:    '/group-enrol',
    color:   '#0891b2',
    bg:      'linear-gradient(135deg, #0e7490 0%, #0891b2 100%)',
    light:   '#ecfeff',
    cta:     'Enrol Team →',
    size:    'normal',
  },
  {
    emoji:   '📚',
    label:   'AI Resource Library',
    sub:     '300+ guides, tools & templates',
    detail:  'Prompt packs, AI tool guides, project templates — free access',
    href:    '/library',
    color:   '#d97706',
    bg:      'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
    light:   '#fffbeb',
    cta:     'Explore Library →',
    size:    'normal',
  },
  {
    emoji:   '🤝',
    label:   'Become a Partner',
    sub:     'Earn while India learns AI',
    detail:  'Free to join · 6-level commissions · Build your network',
    href:    'https://partner.ostaran.com',
    color:   '#7c3aed',
    bg:      'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
    light:   '#f5f3ff',
    cta:     'Join Free →',
    size:    'normal',
    external: true,
  },
]

export function QuickActionsSection() {
  return (
    <section className="py-16 px-4" style={{ background: '#070718' }}>
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
            What would you like to do?
          </h2>
          <p style={{ color: '#64748b' }} className="text-sm">
            Quick access to everything oStaran offers
          </p>
        </div>

        {/* Desktop: 2 + 3 grid. Mobile: single column */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Large featured card — Get Certified */}
          <div className="md:col-span-2 lg:col-span-1 lg:row-span-2">
            <ActionCard action={ACTIONS[0]} featured />
          </div>

          {/* Normal cards */}
          {ACTIONS.slice(1).map(action => (
            <ActionCard key={action.label} action={action} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ActionCard({ action, featured = false }: { action: typeof ACTIONS[0]; featured?: boolean }) {
  const Tag = action.external ? 'a' : Link
  const linkProps = action.external
    ? { href: action.href, target: '_blank', rel: 'noopener noreferrer' }
    : { href: action.href }

  return (
    <Tag
      {...linkProps as any}
      className="group relative flex flex-col p-6 rounded-3xl border overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl block"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderColor: `${action.color}30`,
        minHeight: featured ? 280 : 160,
      }}
    >
      {/* Glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"
        style={{ background: `radial-gradient(circle at 30% 50%, ${action.color}15 0%, transparent 70%)` }} />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl"
        style={{ background: action.bg }} />

      <div className="relative flex-1 flex flex-col">
        {/* Icon */}
        <div className="text-3xl mb-3">{action.emoji}</div>

        {/* Label */}
        <h3 className={`font-extrabold text-white mb-1 ${featured ? 'text-2xl' : 'text-base'}`}>
          {action.label}
        </h3>

        {/* Sub */}
        <p className="text-xs font-semibold mb-2" style={{ color: action.color }}>
          {action.sub}
        </p>

        {/* Detail */}
        <p className="text-xs leading-relaxed flex-1" style={{ color: '#64748b' }}>
          {action.detail}
        </p>

        {/* CTA */}
        <div className="mt-4">
          <span
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all group-hover:shadow-lg"
            style={{ background: action.bg }}
          >
            {action.cta}
          </span>
        </div>
      </div>
    </Tag>
  )
}
