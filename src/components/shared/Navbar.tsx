'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronDown, GraduationCap, Briefcase, Rocket, Crown, BookOpen, Heart, Code2, Atom } from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

const COURSES_BY_AUDIENCE = [
  { href: '/courses/ai-mastery-for-working-professionals', label: 'Working Professionals', icon: Briefcase,     color: 'text-indigo-600'  },
  { href: '/courses/ai-mastery-for-students',             label: 'Students & Graduates',   icon: GraduationCap, color: 'text-emerald-600' },
  { href: '/courses/ai-mastery-for-entrepreneurs',        label: 'Entrepreneurs',           icon: Rocket,        color: 'text-amber-600'   },
  { href: '/courses/ai-mastery-for-leaders',              label: 'Leaders & CXOs',          icon: Crown,         color: 'text-purple-600'  },
  { href: '/courses/ai-mastery-for-school-students',      label: 'School Students',         icon: BookOpen,      color: 'text-sky-600'     },
  { href: '/courses/ai-mastery-for-homemakers',           label: 'Homemakers & Returners',  icon: Heart,         color: 'text-rose-600'    },
  { href: '/courses/agentic-ai-development',              label: 'Tech Developers',         icon: Code2,         color: 'text-slate-700'   },
  { href: '/courses/quantum-computing-and-ai',            label: 'Quantum & Advanced AI',   icon: Atom,          color: 'text-violet-600'  },
]

const RESOURCES_LINKS = [
  { href: '/library',                  label: 'AI Resource Library',               desc: '300+ guides, templates and tools'     },
  { href: '/ai-readiness-quiz',        label: 'AI Readiness Quiz',                 desc: 'Find your AI skill level in 5 min'    },
  { href: '/find-ai-job',              label: 'Find AI Jobs',                      desc: 'Curated AI career opportunities'       },
  { href: '/community',                label: 'AI Community',                      desc: 'Events, peers and updates'             },
  { href: '/certificate-verification', label: 'Download Your Webinar Certificate', desc: 'Find & download yours by email / mobile' },
  { href: '/certificate-verification', label: 'Verify Your Certificate',           desc: "Check any certificate's authenticity"  },
]

const CORPORATE_LINKS = [
  { href: '/contact?type=corporate',    label: 'Corporate Training', desc: 'Upskill your entire team with AI'     },
  { href: 'https://partner.ostaran.com', label: 'Partner Programme', desc: 'Earn by growing our network'           },
  { href: '/contact?type=investor',     label: 'Investor Relations', desc: 'Learn about the oStaran growth story'  },
  { href: '/contact?type=media',        label: 'Media Enquiries',    desc: 'Press kit and spokesperson access'     },
]

type DropdownKey = 'courses' | 'resources' | 'corporate' | 'about' | null

export function Navbar() {
  const pathname = usePathname()
  const [mobileOpen,    setMobileOpen]    = useState(false)
  const [dropdown,      setDropdown]      = useState<DropdownKey>(null)
  const [scrolled,      setScrolled]      = useState(false)
  const [mobileExpanded,setMobileExpanded]= useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on navigation
  useEffect(() => { setMobileOpen(false); setMobileExpanded(null) }, [pathname])

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function openDropdown(key: DropdownKey) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setDropdown(key)
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setDropdown(null), 150)
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
    <nav className={`sticky top-0 z-50 transition-all duration-200 ${
      scrolled ? 'bg-white shadow-md border-b border-gray-100' : 'bg-white/95 backdrop-blur-md border-b border-gray-100'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="rounded-lg overflow-hidden" style={{ background: '#000', padding: '3px 10px' }}>
              <Image src="/ostaran-logo.png" alt="oStaran" width={100} height={32} className="h-7 w-auto object-contain" priority />
            </div>
            <span className="hidden sm:block text-xs font-semibold text-gray-400 tracking-wide uppercase ml-1">AI Education</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">

            {/* Programmes */}
            <div className="relative" onMouseEnter={() => openDropdown('courses')} onMouseLeave={scheduleClose}>
              <button className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                dropdown === 'courses' || isActive('/courses') ? 'text-indigo-700 bg-indigo-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}>
                Programmes <ChevronDown size={14} className={`transition-transform ${dropdown === 'courses' ? 'rotate-180' : ''}`} />
              </button>
              {dropdown === 'courses' && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50"
                  onMouseEnter={() => openDropdown('courses')} onMouseLeave={scheduleClose}>
                  <p className="px-4 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-widest">By Audience</p>
                  {COURSES_BY_AUDIENCE.map(({ href, label, icon: Icon, color }) => (
                    <Link key={href} href={href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors group">
                      <Icon size={15} className={`${color} shrink-0`} />
                      <span className="text-sm text-gray-700 group-hover:text-indigo-700 font-medium">{label}</span>
                    </Link>
                  ))}
                  <div className="mx-4 my-2 border-t border-gray-100" />
                  <Link href="/courses" className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 font-semibold hover:text-indigo-800">
                    View all programmes
                  </Link>
                </div>
              )}
            </div>

            {/* Resources */}
            <div className="relative" onMouseEnter={() => openDropdown('resources')} onMouseLeave={scheduleClose}>
              <button className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                dropdown === 'resources' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}>
                Resources <ChevronDown size={14} className={`transition-transform ${dropdown === 'resources' ? 'rotate-180' : ''}`} />
              </button>
              {dropdown === 'resources' && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50"
                  onMouseEnter={() => openDropdown('resources')} onMouseLeave={scheduleClose}>
                  {RESOURCES_LINKS.map(({ href, label, desc }) => (
                    <Link key={label} href={href} className="block px-4 py-2.5 hover:bg-indigo-50 transition-colors group">
                      <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-700">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Enterprise */}
            <div className="relative" onMouseEnter={() => openDropdown('corporate')} onMouseLeave={scheduleClose}>
              <button className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                dropdown === 'corporate' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}>
                Enterprise <ChevronDown size={14} className={`transition-transform ${dropdown === 'corporate' ? 'rotate-180' : ''}`} />
              </button>
              {dropdown === 'corporate' && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50"
                  onMouseEnter={() => openDropdown('corporate')} onMouseLeave={scheduleClose}>
                  {CORPORATE_LINKS.map(({ href, label, desc }) => (
                    <Link key={href} href={href} className="block px-4 py-2.5 hover:bg-indigo-50 transition-colors group">
                      <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-700">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* About */}
            <div className="relative" onMouseEnter={() => openDropdown('about')} onMouseLeave={scheduleClose}>
              <button className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                dropdown === 'about' || isActive('/about') || isActive('/contact') ? 'text-indigo-700 bg-indigo-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}>
                About <ChevronDown size={14} className={`transition-transform ${dropdown === 'about' ? 'rotate-180' : ''}`} />
              </button>
              {dropdown === 'about' && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50"
                  onMouseEnter={() => openDropdown('about')} onMouseLeave={scheduleClose}>
                  <Link href="/about" className="block px-4 py-2.5 hover:bg-indigo-50 transition-colors group">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-700">About oStaran</p>
                    <p className="text-xs text-gray-500 mt-0.5">Our story, mission and team</p>
                  </Link>
                  <Link href="/contact" className="block px-4 py-2.5 hover:bg-indigo-50 transition-colors group">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-700">Contact / Support</p>
                    <p className="text-xs text-gray-500 mt-0.5">Reach our team — we reply within a day</p>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {/* Colour theme toggle (light / dark) */}
            <ThemeToggle />
            {/* Student Sign In — neon green */}
            <Link href="/signin"
              className="px-3.5 py-2 text-sm font-bold rounded-xl transition-all hover:opacity-90 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg,#22c55e,#4ade80)', color: '#05290f', boxShadow: '0 0 14px rgba(74,222,128,0.6)' }}>
              Student Sign In
            </Link>
            {/* Become AI Partner — gold CTA → partner programme */}
            <a href="https://partner.ostaran.com"
              title="Join the largest AI Partnership network"
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-xl transition-all hover:opacity-90 hover:shadow-lg whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #C49A10, #F0BE3C)', color: '#0E1632' }}>
              <Briefcase size={15} /> AI Partner - Sign Up / Sign In
            </a>
            {/* Launch Your Course — neon pink → become a mentor */}
            <a href="https://partner.ostaran.com/dashboard/become-mentor"
              title="Become a mentor & launch your own course"
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-xl text-white transition-all hover:opacity-90 hover:shadow-lg whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)', boxShadow: '0 0 14px rgba(236,72,153,0.6)' }}>
              🚀 Launch Your Course
            </a>
            {/* Get Certified + subtext */}
            <div className="flex flex-col items-center">
              <Link href="/masterclass"
                className="px-3.5 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 hover:shadow-lg whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                Get Certified This Sunday
              </Link>
              <span className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">90 Minutes Virtual Agentic AI Session</span>
            </div>
          </div>

          {/* Mobile hamburger — large tap target for reliability */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            style={{ touchAction: 'manipulation' }}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
    </nav>

      {/* ── Mobile: backdrop + LEFT slide-in drawer ─────────────────────────────
          Both are always in the DOM — toggled via CSS opacity/transform (not
          conditional render) so the menu opens instantly with a GPU-accelerated
          slide, with no mount delay on mid-range Android. ───────────────────── */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
        className="lg:hidden fixed inset-0 z-40 transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.45)', opacity: mobileOpen ? 1 : 0, pointerEvents: mobileOpen ? 'auto' : 'none' }}
      />
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[300px] max-w-[86vw] bg-white flex flex-col shadow-2xl transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer header: logo + close */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 shrink-0">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
            <div className="rounded-lg overflow-hidden" style={{ background: '#000', padding: '3px 10px' }}>
              <Image src="/ostaran-logo.png" alt="oStaran" width={92} height={30} className="h-6 w-auto object-contain" />
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
              className="p-2 -mr-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              style={{ touchAction: 'manipulation' }}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable nav content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">

          {/* Programmes */}
          <button
            onClick={() => setMobileExpanded(v => v === 'courses' ? null : 'courses')}
            className="w-full flex items-center justify-between py-3 text-base font-semibold text-gray-900 border-b border-gray-100"
          >
            Programmes
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${mobileExpanded === 'courses' ? 'rotate-180' : ''}`} />
          </button>
          {mobileExpanded === 'courses' && (
            <div className="pl-3 py-2 space-y-1">
              {COURSES_BY_AUDIENCE.map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href} className="flex items-center gap-3 py-2.5 text-sm text-gray-700 hover:text-indigo-600 transition-colors">
                  <Icon size={15} className={color} />
                  {label}
                </Link>
              ))}
              <Link href="/courses" className="block pt-2 text-sm font-semibold text-indigo-600">View all</Link>
            </div>
          )}

          {/* Resources */}
          <button
            onClick={() => setMobileExpanded(v => v === 'resources' ? null : 'resources')}
            className="w-full flex items-center justify-between py-3 text-base font-semibold text-gray-900 border-b border-gray-100"
          >
            Resources
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${mobileExpanded === 'resources' ? 'rotate-180' : ''}`} />
          </button>
          {mobileExpanded === 'resources' && (
            <div className="pl-3 py-2 space-y-1">
              {RESOURCES_LINKS.map(({ href, label }) => (
                <Link key={label} href={href} className="block py-2.5 text-sm text-gray-700 hover:text-indigo-600 transition-colors">{label}</Link>
              ))}
            </div>
          )}

          {/* Enterprise */}
          <button
            onClick={() => setMobileExpanded(v => v === 'corporate' ? null : 'corporate')}
            className="w-full flex items-center justify-between py-3 text-base font-semibold text-gray-900 border-b border-gray-100"
          >
            Enterprise
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${mobileExpanded === 'corporate' ? 'rotate-180' : ''}`} />
          </button>
          {mobileExpanded === 'corporate' && (
            <div className="pl-3 py-2 space-y-1">
              {CORPORATE_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="block py-2.5 text-sm text-gray-700 hover:text-indigo-600 transition-colors">{label}</Link>
              ))}
            </div>
          )}

          {/* About */}
          <button
            onClick={() => setMobileExpanded(v => v === 'about' ? null : 'about')}
            className="w-full flex items-center justify-between py-3 text-base font-semibold text-gray-900 border-b border-gray-100"
          >
            About
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${mobileExpanded === 'about' ? 'rotate-180' : ''}`} />
          </button>
          {mobileExpanded === 'about' && (
            <div className="pl-3 py-2 space-y-1">
              <Link href="/about"   className="block py-2.5 text-sm text-gray-700 hover:text-indigo-600 transition-colors">About oStaran</Link>
              <Link href="/contact" className="block py-2.5 text-sm text-gray-700 hover:text-indigo-600 transition-colors">Contact / Support</Link>
            </div>
          )}

          <div className="pt-6 space-y-3">
            {/* Become AI Partner — gold */}
            <a href="https://partner.ostaran.com"
              className="flex items-center justify-center gap-2 text-center py-3.5 text-sm font-bold rounded-xl"
              style={{ background: 'linear-gradient(135deg, #C49A10, #F0BE3C)', color: '#0E1632' }}>
              <Briefcase size={16} /> AI Partner - Sign Up / Sign In
            </a>
            <p className="text-center text-xs text-gray-500 -mt-1">Join the largest AI Partnership network</p>
            {/* Launch Your Course — neon pink */}
            <a href="https://partner.ostaran.com/dashboard/become-mentor"
              className="flex items-center justify-center gap-2 text-center py-3.5 text-sm font-bold rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)', boxShadow: '0 0 16px rgba(236,72,153,0.5)' }}>
              🚀 Launch Your Course
            </a>
            <p className="text-center text-xs text-gray-500 -mt-1">Become a mentor — teach on oStaran</p>
            {/* Get Certified + subtext */}
            <Link href="/masterclass"
              className="block text-center py-3.5 text-sm font-bold text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              Get Certified This Sunday
            </Link>
            <p className="text-center text-xs text-gray-500 -mt-1">90 Minutes Virtual Agentic AI Session</p>
            {/* Student Sign In — neon green */}
            <Link href="/signin"
              className="block text-center py-3 text-sm font-bold rounded-xl"
              style={{ background: 'linear-gradient(135deg,#22c55e,#4ade80)', color: '#05290f', boxShadow: '0 0 14px rgba(74,222,128,0.5)' }}>
              Student Sign In
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
