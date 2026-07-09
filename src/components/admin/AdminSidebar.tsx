'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, Link2, Award, Library,
  BookOpen, CreditCard, Mail, MapPin, UserCheck, Building2,
  ScrollText, LogOut, Megaphone, Route, FileText, Shield,
  ChevronRight, Activity, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { AdminRole, AdminPage } from '@/lib/admin-auth'

// ── Nav item definitions ──────────────────────────────────────────────────────
interface NavItem {
  href:  string
  label: string
  icon:  React.ElementType
  page:  AdminPage
  group: 'core' | 'ops' | 'super'
}

const NAV_ITEMS: NavItem[] = [
  // ── Core (all roles)
  { href: '/admin/dashboard',    label: 'Overview',       icon: LayoutDashboard, page: 'dashboard',    group: 'core' },
  { href: '/admin/students',     label: 'Students',       icon: Users,           page: 'students',     group: 'core' },
  { href: '/admin/sessions',     label: 'Sessions',       icon: Calendar,        page: 'sessions',     group: 'core' },
  { href: '/admin/session-links',label: 'Session Links',  icon: Link2,           page: 'session-links',group: 'core' },
  { href: '/admin/certificates', label: 'Certificates',   icon: Award,           page: 'certificates', group: 'core' },

  // ── Ops (super_admin + channel_admin)
  { href: '/admin/library',       label: 'Library',        icon: Library,   page: 'library',       group: 'ops' },
  { href: '/admin/courses',       label: 'Courses',        icon: BookOpen,  page: 'courses',       group: 'ops' },
  { href: '/admin/ai-spots',      label: 'AI Spots',       icon: MapPin,    page: 'ai-spots',      group: 'ops' },
  { href: '/admin/communications',label: 'Communications', icon: Megaphone, page: 'communications',group: 'ops' },
  { href: '/admin/journey',       label: 'Journey Report', icon: Route,     page: 'journey',       group: 'ops' },

  // ── Super (super_admin only)
  { href: '/admin/payments',         label: 'Payments',         icon: CreditCard, page: 'payments',         group: 'super' },
  { href: '/admin/email-queue',      label: 'Email Queue',      icon: Mail,       page: 'email-queue',      group: 'super' },
  { href: '/admin/partners',         label: 'Partners',         icon: Building2,  page: 'partners',         group: 'super' },
  { href: '/admin/crm',              label: 'CRM',              icon: UserCheck,  page: 'crm',              group: 'super' },
  { href: '/admin/audit-log',        label: 'Audit Log',        icon: ScrollText, page: 'audit-log',        group: 'super' },
  { href: '/admin/lifecycle-status', label: 'Lifecycle Status', icon: Activity,   page: 'lifecycle-status', group: 'super' },
  { href: '/admin/settings',         label: 'Settings',         icon: Settings,   page: 'settings',         group: 'super' },
]

// ── Permission check (client-side mirror of lib/admin-auth canAccess) ─────────
const ROLE_LEVEL: Record<AdminRole, number> = {
  dev_admin:          100,
  super_admin:         80,
  channel_admin:       40,
  root_partner_admin:  20,
}

const PAGE_MIN_ROLE: Record<AdminPage, AdminRole> = {
  dashboard:         'root_partner_admin',
  students:          'root_partner_admin',
  sessions:          'channel_admin',
  'session-links':   'channel_admin',
  certificates:      'channel_admin',
  library:           'channel_admin',
  courses:           'channel_admin',
  'ai-spots':        'channel_admin',
  communications:    'channel_admin',
  journey:           'channel_admin',
  payments:          'super_admin',
  'email-queue':     'super_admin',
  partners:          'super_admin',
  crm:               'super_admin',
  'audit-log':       'super_admin',
  'lifecycle-status':'super_admin',
  settings:          'super_admin',
}

function clientCanAccess(role: AdminRole, page: AdminPage): boolean {
  if (role === 'dev_admin') return true
  return ROLE_LEVEL[role] >= ROLE_LEVEL[PAGE_MIN_ROLE[page]]
}

// ── Role badge config ─────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<AdminRole, { label: string; color: string; bg: string }> = {
  dev_admin:          { label: 'Dev · God Mode', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  super_admin:        { label: 'Super Admin',    color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  channel_admin:      { label: 'Channel Admin',  color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  root_partner_admin: { label: 'Partner Admin',  color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  role:      AdminRole
  adminName: string
}

export function AdminSidebar({ role, adminName }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const cfg      = ROLE_CONFIG[role]

  // Filter nav items this role can access
  const visibleItems = NAV_ITEMS.filter(item => clientCanAccess(role, item.page))

  const coreItems  = visibleItems.filter(i => i.group === 'core')
  const opsItems   = visibleItems.filter(i => i.group === 'ops')
  const superItems = visibleItems.filter(i => i.group === 'super')

  async function handleLogout() {
    await fetch('/api/auth/admin-logout', { method: 'POST' })
    router.push('/admin')
  }

  function NavLink({ item }: { item: NavItem }) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
          isActive
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
        )}
      >
        <item.icon size={15} className="shrink-0" />
        <span className="flex-1">{item.label}</span>
        {isActive && <ChevronRight size={12} className="text-gray-500" />}
      </Link>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return (
      <p className="text-xs text-gray-600 px-3 mb-1 mt-4 uppercase tracking-wider font-semibold">
        {label}
      </p>
    )
  }

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-gray-900 text-gray-300 border-r border-gray-700/60 shrink-0">

      {/* ── Logo + role badge ─────────────────────────────────────────────── */}
      <div className="px-4 h-16 flex items-center justify-between border-b border-gray-700/60">
        <span className="font-bold text-white text-sm">Admin Panel</span>
        <span
          className="text-xs px-2 py-1 rounded-full font-semibold"
          style={{ color: cfg.color, background: cfg.bg }}>
          {cfg.label}
        </span>
      </div>

      {/* ── Signed-in-as strip ────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b border-gray-700/40 flex items-center gap-2">
        <Shield size={11} className="text-gray-600 shrink-0" />
        <span className="text-xs text-gray-500 truncate">{adminName}</span>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">

        {coreItems.length > 0 && (
          <>
            <SectionLabel label="Core" />
            {coreItems.map(item => <NavLink key={item.href} item={item} />)}
          </>
        )}

        {opsItems.length > 0 && (
          <>
            <SectionLabel label="Operations" />
            {opsItems.map(item => <NavLink key={item.href} item={item} />)}
          </>
        )}

        {superItems.length > 0 && (
          <>
            <div className="pt-2 mt-2 border-t border-gray-700/40">
              <SectionLabel label="Super Admin" />
              {superItems.map(item => <NavLink key={item.href} item={item} />)}
            </div>
          </>
        )}
      </nav>

      {/* ── Logout ───────────────────────────────────────────────────────── */}
      <div className="px-2 py-3 border-t border-gray-700/60">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
