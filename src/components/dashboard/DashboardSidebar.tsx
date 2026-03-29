'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Library,
  Award, CreditCard, User, Briefcase, Users, LogOut, Sparkles,
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
  { href: '/dashboard/profile',        label: 'Profile',          icon: User },
  { href: '/dashboard/career',         label: 'Career',           icon: Briefcase },
  { href: '/dashboard/become-partner', label: 'Become Partner',   icon: Users },
  { href: '/dashboard/ai-monitor',     label: 'Class Monitor AI', icon: Sparkles },
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
      style={{ background: '#07090f', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Brand */}
      <div className="px-4 h-16 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
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
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'text-white'
                  : href === '/dashboard/ai-monitor'
                    ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/10'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
              )}
              style={isActive ? {
                background: href === '/dashboard/ai-monitor'
                  ? 'linear-gradient(90deg, rgba(139,92,246,0.25), rgba(139,92,246,0.05))'
                  : 'linear-gradient(90deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))',
                borderLeft: href === '/dashboard/ai-monitor' ? '3px solid #8b5cf6' : '3px solid #6366f1',
              } : {}}
            >
              <Icon size={16} className={cn('shrink-0', isActive ? 'text-indigo-400' : '')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer — trainer + signout */}
      <div className="px-3 py-4 border-t space-y-3"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <Image src="/arijit-image.png" alt="Arijit" width={28} height={28}
            className="w-7 h-7 rounded-full object-cover object-top shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-white font-semibold truncate">Arijit Chowdhury</p>
            <p className="text-xs text-gray-600 truncate">Your Trainer</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-500 hover:bg-white/5 hover:text-gray-200 transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
