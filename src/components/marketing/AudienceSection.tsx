import Link from 'next/link'
import {
  Briefcase, GraduationCap, Rocket, Crown,
  BookOpen, Heart, Code2, Building2, ArrowRight
} from 'lucide-react'

const AUDIENCES = [
  {
    icon:     Briefcase,
    label:    'Working Professionals',
    desc:     'Upskill without disrupting your career. Weekend live sessions.',
    href:     '/courses/ai-mastery-for-working-professionals',
    color:    '#4f46e5',
    bg:       '#eef2ff',
    tag:      'Most Popular',
  },
  {
    icon:     GraduationCap,
    label:    'Students & Graduates',
    desc:     'Get AI-certified before your first job. Stand out from the crowd.',
    href:     '/courses/ai-mastery-for-students',
    color:    '#059669',
    bg:       '#ecfdf5',
    tag:      null,
  },
  {
    icon:     Rocket,
    label:    'Entrepreneurs',
    desc:     'Automate your business with AI. Build smarter, faster, leaner.',
    href:     '/courses/ai-mastery-for-entrepreneurs',
    color:    '#d97706',
    bg:       '#fffbeb',
    tag:      null,
  },
  {
    icon:     Crown,
    label:    'Leaders & CXOs',
    desc:     'Lead your organisation\'s AI transformation with confidence.',
    href:     '/courses/ai-mastery-for-leaders',
    color:    '#7c3aed',
    bg:       '#f5f3ff',
    tag:      'Executive',
  },
  {
    icon:     BookOpen,
    label:    'School Students',
    desc:     'Build the future. AI skills for Class 8–12 students.',
    href:     '/courses/ai-mastery-for-school-students',
    color:    '#0284c7',
    bg:       '#f0f9ff',
    tag:      null,
  },
  {
    icon:     Heart,
    label:    'Homemakers',
    desc:     'Restart your career or start earning independently with AI.',
    href:     '/courses/ai-mastery-for-homemakers',
    color:    '#e11d48',
    bg:       '#fff1f2',
    tag:      null,
  },
  {
    icon:     Code2,
    label:    'Tech Developers',
    desc:     'Build production-grade AI agents and agentic systems.',
    href:     '/courses/agentic-ai-development',
    color:    '#0f172a',
    bg:       '#f8fafc',
    tag:      'Advanced',
  },
  {
    icon:     Building2,
    label:    'Corporates',
    desc:     'Custom AI training for your entire team. Bulk enrolments available.',
    href:     '/contact?type=corporate',
    color:    '#0891b2',
    bg:       '#ecfeff',
    tag:      'Enterprise',
  },
]

export function AudienceSection() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 mb-4">
            Built for Every Journey
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            Who is oStaran for?
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Every programme is purpose-built for a specific audience — no generic, one-size-fits-all courses here.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {AUDIENCES.map(({ icon: Icon, label, desc, href, color, bg, tag }) => (
            <Link
              key={label}
              href={href}
              className="group relative flex flex-col p-5 rounded-2xl border border-gray-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-transparent bg-white"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            >
              {tag && (
                <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ color, background: bg }}>
                  {tag}
                </span>
              )}

              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>

              <h3 className="font-bold text-gray-900 text-sm mb-2 group-hover:text-indigo-700 transition-colors leading-snug">
                {label}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed flex-1">{desc}</p>

              <div className="flex items-center gap-1 mt-4 text-xs font-semibold transition-all duration-200 group-hover:gap-2"
                style={{ color }}>
                Explore <ArrowRight size={12} />
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: `0 0 0 2px ${color}30, 0 16px 40px ${color}10` }} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
