'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Award, CreditCard, User } from 'lucide-react'

const BOTTOM_TABS = [
  { href: '/dashboard',              label: 'Home',      icon: LayoutDashboard, exact: true },
  { href: '/dashboard/courses',      label: 'Courses',   icon: BookOpen },
  { href: '/dashboard/certificates', label: 'Certs',     icon: Award },
  { href: '/dashboard/payments',     label: 'Payments',  icon: CreditCard },
  { href: '/dashboard/profile',      label: 'Profile',   icon: User },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex items-stretch"
      style={{
        background: '#ffffff',
        borderTop: '1px solid #dce6f5',
        boxShadow: '0 -2px 12px rgba(37,99,235,0.08)',
        // Safe area inset for devices with a home indicator
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {BOTTOM_TABS.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all"
            style={{ minHeight: 56 }}
          >
            <div
              className="w-10 h-6 flex items-center justify-center rounded-full transition-all"
              style={isActive ? { background: '#dbeafe' } : {}}
            >
              <Icon
                size={20}
                style={{ color: isActive ? '#2563eb' : '#94a3b8' }}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
            </div>
            <span
              className="text-[10px] font-medium leading-tight"
              style={{ color: isActive ? '#2563eb' : '#94a3b8' }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
