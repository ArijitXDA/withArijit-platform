'use client'

import { Bell, Menu } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { MobileDrawer } from './MobileDrawer'

interface DashboardTopNavProps {
  initials: string
  photoUrl: string | null
  fullName: string | null
}

export function DashboardTopNav({ initials, photoUrl, fullName }: DashboardTopNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

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
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-blue-50"
            style={{ color: '#475569' }}
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
          {/* Bell */}
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-blue-50"
            style={{ color: '#94a3b8' }}
            aria-label="Notifications"
          >
            <Bell size={16} />
          </button>

          {/* Avatar — photo or coloured initial */}
          <div
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
          </div>
        </div>
      </header>

      {/* Mobile drawer — rendered outside header so it can be full-screen */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
