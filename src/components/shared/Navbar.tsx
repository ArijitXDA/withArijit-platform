'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/courses', label: 'Courses' },
  {
    label: 'AI Certification',
    href: '/ai-certification',
    children: [
      { href: '/ai-certification', label: 'Overview' },
      { href: '/ai-certification/sales', label: 'For Sales' },
      { href: '/ai-certification/marketing', label: 'For Marketing' },
      { href: '/ai-certification/hr', label: 'For HR & Projects' },
      { href: '/ai-certification/cxo', label: 'For CXOs' },
      { href: '/ai-certification/startups', label: 'For Startups' },
      { href: '/ai-certification/pharma', label: 'For Pharma & FMCG' },
    ],
  },
  { href: '/library', label: 'Library' },
  { href: '/ai-spots', label: 'AI Spots' },
  { href: '/about', label: 'About' },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-gray-900">
              with<span className="text-indigo-600">Arijit</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div key={link.label} className="relative">
                  <button
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
                    onMouseEnter={() => setDropdownOpen(link.label)}
                    onMouseLeave={() => setDropdownOpen(null)}
                  >
                    {link.label}
                    <ChevronDown size={14} />
                  </button>
                  {dropdownOpen === link.label && (
                    <div
                      className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
                      onMouseEnter={() => setDropdownOpen(link.label)}
                      onMouseLeave={() => setDropdownOpen(null)}
                    >
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/signin"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              Sign In
            </Link>
            <Link
              href="/free-webinar"
              className={cn(buttonVariants({ size: 'sm' }), 'bg-indigo-600 hover:bg-indigo-500 text-white')}
            >
              Join Free Webinar
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href ?? link.label}
              href={link.href ?? '#'}
              className="text-sm text-gray-700 py-1"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <hr className="border-gray-100" />
          <Link
            href="/free-webinar"
            onClick={() => setMobileOpen(false)}
            className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-500 text-white w-full justify-center')}
          >
            Join Free Webinar
          </Link>
          <Link
            href="/signin"
            onClick={() => setMobileOpen(false)}
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-center')}
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  )
}
