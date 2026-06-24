'use client'

import { Menu, LogOut, User as UserIcon, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MobileDrawer } from './MobileDrawer'
import { NotificationBell } from './NotificationBell'
import { createClient } from '@/lib/supabase/client'

interface DashboardTopNavProps {
  initials: string
  photoUrl: string | null
  fullName: string | null
  email: string | null
}

export function DashboardTopNav({ initials, photoUrl, fullName, email }: DashboardTopNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)
  const menuRef  = useRef<HTMLDivElement>(null)
  const router   = useRouter()
  const supabase = createClient()

  // Close the account menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  async function handleSignOut() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <header
        className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0 border-b z-30 relative"
        style={{
          background: '#ffffff',
          borderColor: '#dce6f5',
          boxShadow: '0 1px 8px rgba(37,99,235,0.06)',
        }}
      >
        {/* Mobile left: hamburger + logo */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-blue-50"
            style={{ color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe' }}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Image
            src="/ostaran-logo.png"
            alt="oStaran"
            width={70}
            height={23}
            className="h-5 w-auto"
          />
        </div>

        {/* Desktop left: page label */}
        <div className="hidden md:flex items-center gap-2">
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
          >
            Student Dashboard
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <NotificationBell />

          {/* Avatar — opens the account menu (Profile + Sign Out) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-full transition-all hover:opacity-90"
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
                title={fullName ?? undefined}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={fullName ?? 'Profile'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </span>
              <ChevronDown size={14} style={{ color: '#94a3b8' }} className="hidden sm:block" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-50"
                style={{ background: '#ffffff', border: '1px solid #dce6f5', boxShadow: '0 8px 28px rgba(15,31,61,0.14)' }}
                role="menu"
              >
                {/* Identity */}
                <div className="px-4 py-3 border-b" style={{ borderColor: '#eef3fb' }}>
                  <p className="text-sm font-semibold truncate" style={{ color: '#0f1f3d' }}>{fullName ?? 'Student'}</p>
                  {email && <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{email}</p>}
                </div>
                {/* Profile */}
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-blue-50"
                  style={{ color: '#475569' }}
                  role="menuitem"
                >
                  <UserIcon size={15} style={{ color: '#94a3b8' }} /> My Profile
                </Link>
                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-4 py-2.5 w-full text-sm transition-colors hover:bg-red-50"
                  style={{ color: '#dc2626' }}
                  role="menuitem"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer — rendered outside header so it can be full-screen */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
