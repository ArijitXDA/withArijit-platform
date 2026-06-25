'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Library,
  Award, CreditCard, User, Briefcase, Users, LogOut, Sparkles, LifeBuoy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',                label: 'Home',             icon: LayoutDashboard, exact: true },
  { href: '/dashboard/courses',        label: 'My Courses',       icon: BookOpen },
  { href: '/dashboard/library',        label: 'Library',          icon: Library },
  { href: '/dashboard/certificates',   label: 'Certificates',     icon: Award },
  { href: '/dashboard/payments',       label: 'Payments',         icon: CreditCard },
  { href: '/dashboard/tickets',        label: 'Support / Tickets', icon: LifeBuoy },
  { href: '/dashboard/profile',        label: 'Profile',          icon: User },
  { href: '/dashboard/career',         label: 'Career',           icon: Briefcase },
  { href: '/dashboard/become-partner', label: 'Become Partner',   icon: Users },
  { href: '/dashboard/assistant-professor', label: 'Assistant Professor (AI)', icon: Sparkles },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen shrink-0"
      style={{
        background: '#ffffff',
        borderRight: '1px solid #dce6f5',
        boxShadow: '2px 0 12px rgba(37,99,235,0.06)',
      }}>

      {/* Brand */}
      <div className="px-4 h-16 flex items-center justify-between border-b"
        style={{ borderColor: '#dce6f5', background: '#ffffff' }}>
        <Link href="/" className="flex items-center gap-2">
          <Image src="/ostaran-logo.png" alt="oStaran" width={90} height={30} className="h-6 w-auto object-contain" />
        </Link>
        <Link href="/" className="opacity-70 hover:opacity-100 transition-opacity">
          <Image src="/awa-logo.jpg" alt="AIwithArijit" width={60} height={16} className="h-4 w-auto rounded" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          const isAI     = href === '/dashboard/assistant-professor'
          const isTicket = href === '/dashboard/tickets'

          if (isTicket) {
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={isActive ? {
                  background: 'linear-gradient(90deg,#ffe4e9,#fff1f3)',
                  color: '#e11d2e', borderLeft: '3px solid #ff073a', fontWeight: 700,
                  boxShadow: '0 0 14px rgba(255,7,58,0.35)',
                } : {
                  color: '#ff073a', borderLeft: '3px solid transparent',
                  textShadow: '0 0 8px rgba(255,7,58,0.45)', fontWeight: 700,
                }}
              >
                <Icon size={16} className="shrink-0" style={{ color: '#ff073a', filter: 'drop-shadow(0 0 4px rgba(255,7,58,0.6))' }} />
                {label}
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              )}
              style={isActive ? {
                background: isAI
                  ? 'linear-gradient(90deg,#ede9fe,#f5f3ff)'
                  : 'linear-gradient(90deg,#dbeafe,#eff6ff)',
                color: isAI ? '#7c3aed' : '#1d4ed8',
                borderLeft: isAI ? '3px solid #7c3aed' : '3px solid #2563eb',
                fontWeight: 600,
              } : {
                color: isAI ? '#7c3aed' : '#475569',
                borderLeft: '3px solid transparent',
              }}
            >
              <Icon
                size={16}
                className="shrink-0"
                style={{ color: isActive ? (isAI ? '#7c3aed' : '#2563eb') : isAI ? '#7c3aed' : '#94a3b8' }}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer — trainer card + sign out */}
      <div className="px-3 py-4 border-t space-y-2" style={{ borderColor: '#dce6f5' }}>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: '#f0f4fa', border: '1px solid #dce6f5' }}>
          <Image src="/arijit-image.png" alt="Arijit" width={28} height={28}
            className="w-7 h-7 rounded-full object-cover object-top shrink-0" />
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
    </aside>
  )
}
