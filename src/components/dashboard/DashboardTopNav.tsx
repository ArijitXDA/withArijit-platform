'use client'

import { Bell } from 'lucide-react'
import Image from 'next/image'

export function DashboardTopNav() {
  return (
    <header className="h-14 flex items-center justify-between px-6 shrink-0 border-b"
      style={{
        background: '#ffffff',
        borderColor: '#dce6f5',
        boxShadow: '0 1px 8px rgba(37,99,235,0.06)',
      }}>
      {/* Mobile — show logos */}
      <div className="flex items-center gap-2 md:hidden">
        <Image src="/ostaran-logo.png" alt="oStaran" width={70} height={23} className="h-5 w-auto" />
      </div>

      {/* Page context label (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-2">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
          Student Dashboard
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-blue-50"
          style={{ color: '#94a3b8' }}>
          <Bell size={16} />
        </button>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
          S
        </div>
      </div>
    </header>
  )
}
