'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Link2,
  Award,
  Library,
  BookOpen,
  CreditCard,
  Mail,
  MapPin,
  UserCheck,
  Building2,
  ScrollText,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const BASE_NAV = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/sessions', label: 'Sessions', icon: Calendar },
  { href: '/admin/session-links', label: 'Session Links', icon: Link2 },
  { href: '/admin/certificates', label: 'Certificates', icon: Award },
  { href: '/admin/library', label: 'Library', icon: Library },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/email-queue', label: 'Email Queue', icon: Mail },
  { href: '/admin/ai-spots', label: 'AI Spots', icon: MapPin },
]

const SUPER_ADMIN_NAV = [
  { href: '/admin/crm', label: 'CRM', icon: UserCheck },
  { href: '/admin/partners', label: 'Partners', icon: Building2 },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
]

interface Props {
  isSuperAdmin?: boolean
}

export function AdminSidebar({ isSuperAdmin = false }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const allNav = isSuperAdmin ? [...BASE_NAV, ...SUPER_ADMIN_NAV] : BASE_NAV

  async function handleLogout() {
    await fetch('/api/auth/admin-logout', { method: 'POST' })
    router.push('/admin')
  }

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-gray-900 text-gray-300 border-r border-gray-700 shrink-0">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-gray-700">
        <span className="font-bold text-white text-base">Admin Panel</span>
        <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
          {isSuperAdmin ? 'Super' : 'Admin'}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {allNav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          )
        })}

        {isSuperAdmin && (
          <div className="pt-3 mt-3 border-t border-gray-700">
            <p className="text-xs text-gray-500 px-3 mb-2 uppercase tracking-wider">Super Admin</p>
            {SUPER_ADMIN_NAV.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
