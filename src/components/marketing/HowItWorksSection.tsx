import Link from 'next/link'
import { MonitorPlay, GraduationCap, BookOpen, Award } from 'lucide-react'

const STEPS = [
  {
    step:  '01',
    icon:  MonitorPlay,
    title: 'Join Free Webinar',
    desc:  'Experience our teaching style in a 90-minute live AI session. Get a free certificate just for attending.',
    color: '#4f46e5',
    bg:    'rgba(79,70,229,0.08)',
    cta:   { label: 'Register Free', href: '/free-webinar' },
  },
  {
    step:  '02',
    icon:  BookOpen,
    title: 'Choose Your Programme',
    desc:  'Pick the course built for your profile — professional, student, entrepreneur, leader, or developer.',
    color: '#059669',
    bg:    'rgba(5,150,105,0.08)',
    cta:   { label: 'Browse Courses', href: '/courses' },
  },
  {
    step:  '03',
    icon:  GraduationCap,
    title: 'Attend Live Classes',
    desc:  'Weekend live sessions with real-world projects, expert mentors, and a dedicated peer community.',
    color: '#d97706',
    bg:    'rgba(217,119,6,0.08)',
    cta:   null,
  },
  {
    step:  '04',
    icon:  Award,
    title: 'Get Certified',
    desc:  'Earn a globally recognised AI certificate and boost your resume, LinkedIn and career instantly.',
    color: '#7c3aed',
    bg:    'rgba(124,58,237,0.08)',
    cta:   null,
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-20 px-4" style={{ background: '#f8fafc' }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 mb-4">
            Simple 4-Step Journey
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            From curious beginner to certified AI professional — your entire journey, mapped out.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-4 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px"
            style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />

          {STEPS.map(({ step, icon: Icon, title, desc, color, bg, cta }) => (
            <div key={step} className="relative flex flex-col items-center text-center">
              {/* Step bubble */}
              <div className="relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center mb-6 border-2 bg-white transition-all duration-300 hover:scale-105"
                style={{ borderColor: color, boxShadow: `0 8px 24px ${color}20` }}>
                <Icon size={24} style={{ color }} />
                <span className="text-[10px] font-black mt-0.5" style={{ color }}>{step}</span>
              </div>

              <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{desc}</p>

              {cta && (
                <Link href={cta.href}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 hover:shadow-md"
                  style={{ background: color }}>
                  {cta.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
