'use client'

import { Bell } from 'lucide-react'
import Image from 'next/image'

export function DashboardTopNav() {
  return (
    <header className="h-14 flex items-center justify-between px-6 shrink-0 border-b"
      style={{ background: '#07090f', borderColor: 'rgba(255,255,255,0.06)' }}>
      {/* Mobile — show logos */}
      <div className="flex items-center gap-2 md:hidden">
        <Image src="/ostaran-logo.png" alt="oStaran" width={70} height={23} className="h-5 w-auto" />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all">
          <Bell size={16} />
        </button>
        {/* Avatar placeholder */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          S
        </div>
      </div>
    </header>
  )
}
