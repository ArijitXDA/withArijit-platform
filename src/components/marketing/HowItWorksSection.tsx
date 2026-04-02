import Link from 'next/link'
import { MonitorPlay, GraduationCap, BookOpen, Award } from 'lucide-react'

const STEPS = [
  {
    step:  '01',
    icon:  MonitorPlay,
    title: 'Register & Pay Online',
    desc:  'Choose your audience category, register and pay securely. Your personal joining link is sent instantly.',
    color: '#4f46e5',
    bg:    'rgba(79,70,229,0.08)',
    cta:   { label: 'Register Now', href: '/masterclass' },
  },
  {
    step:  '02',
    icon:  BookOpen,
    title: 'Choose Your Category',
    desc:  'Pick the session built for your profile — Working Professional, Student, Entrepreneur, Leader, or School.',
    color: '#059669',
    bg:    'rgba(5,150,105,0.08)',
    cta:   null,
  },
  {
    step:  '03',
    icon:  GraduationCap,
    title: 'Attend Live Session',
    desc:  'Join your 90-minute live AI Certification session. Hands-on, interactive, and tailored to your audience.',
    color: '#d97706',
    bg:    'rgba(217,119,6,0.08)',
    cta:   null,
  },
  {
    step:  '04',
    icon:  Award,
    title: 'Get AI Certified',
    desc:  'Your globally recognised AI certificate is issued within 24 hours. Add it to your resume and LinkedIn.',
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
            From registration to globally recognised AI certificate — in just 90 minutes.
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
