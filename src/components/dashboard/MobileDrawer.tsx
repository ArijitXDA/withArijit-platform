'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  X, Library, Briefcase, Users, LogOut, Sparkles,
  LayoutDashboard, BookOpen, Award, CreditCard, User, LifeBuoy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// All nav items shown in the drawer on mobile
const DRAWER_ITEMS = [
  { href: '/dashboard',                label: 'Home',             icon: LayoutDashboard, exact: true },
  { href: '/dashboard/courses',        label: 'My Courses',       icon: BookOpen },
  { href: '/dashboard/certificates',   label: 'Certificates',     icon: Award },
  { href: '/dashboard/payments',       label: 'Payments',         icon: CreditCard },
  { href: '/dashboard/tickets',        label: 'Support / Tickets', icon: LifeBuoy },
  { href: '/dashboard/profile',        label: 'Profile',          icon: User },
  { href: '/dashboard/library',        label: 'Library',          icon: Library },
  { href: '/dashboard/career',         label: 'Career',           icon: Briefcase },
  { href: '/dashboard/become-partner', label: 'Become Partner',   icon: Users },
  { href: '/dashboard/assistant-professor', label: 'Assistant Professor (AI)', icon: Sparkles },
]

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  // Close on route change
  useEffect(() => { onClose() }, [pathname]) // eslint-disable-line

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col md:hidden transition-transform duration-250 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: '#ffffff',
          borderRight: '1px solid #dce6f5',
          boxShadow: '4px 0 24px rgba(37,99,235,0.10)',
        }}
      >
        {/* Header */}
        <div
          className="h-14 px-4 flex items-center justify-between shrink-0 border-b"
          style={{ borderColor: '#dce6f5' }}
        >
          <div className="flex items-center gap-2">
            <Image src="/ostaran-logo.png" alt="oStaran" width={80} height={26} className="h-5 w-auto" />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            style={{ color: '#475569' }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {DRAWER_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            const isAI     = href === '/dashboard/assistant-professor'
            const isTicket = href === '/dashboard/tickets'

            if (isTicket) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all"
                  style={isActive ? {
                    background: 'linear-gradient(90deg,#ffe4e9,#fff1f3)', color: '#e11d2e',
                    borderLeft: '3px solid #ff073a', fontWeight: 700, boxShadow: '0 0 14px rgba(255,7,58,0.35)',
                  } : {
                    color: '#ff073a', borderLeft: '3px solid transparent',
                    textShadow: '0 0 8px rgba(255,7,58,0.45)', fontWeight: 700,
                  }}
                >
                  <Icon size={18} style={{ color: '#ff073a', filter: 'drop-shadow(0 0 4px rgba(255,7,58,0.6))' }} />
                  {label}
                </Link>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all"
                style={isActive ? {
                  background: isAI ? 'linear-gradient(90deg,#ede9fe,#f5f3ff)' : 'linear-gradient(90deg,#dbeafe,#eff6ff)',
                  color: isAI ? '#7c3aed' : '#1d4ed8',
                  borderLeft: isAI ? '3px solid #7c3aed' : '3px solid #2563eb',
                  fontWeight: 600,
                } : {
                  color: isAI ? '#7c3aed' : '#475569',
                  borderLeft: '3px solid transparent',
                }}
              >
                <Icon
                  size={18}
                  style={{ color: isActive ? (isAI ? '#7c3aed' : '#2563eb') : isAI ? '#a78bfa' : '#94a3b8' }}
                />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t space-y-2 shrink-0" style={{ borderColor: '#dce6f5' }}>
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background: '#f0f4fa', border: '1px solid #dce6f5' }}
          >
            <Image
              src="/arijit-image.png"
              alt="Arijit"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover object-top shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#0f1f3d' }}>Arijit Chowdhury</p>
              <p className="text-xs truncate" style={{ color: '#94a3b8' }}>Your Trainer</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm transition-all hover:bg-red-50"
            style={{ color: '#94a3b8' }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}
