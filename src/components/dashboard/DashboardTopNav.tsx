'use client'

import { Bell, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Props {
  studentName?: string
}

export function DashboardTopNav({ studentName }: Props) {
  const initials = studentName
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'S'

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <button className="md:hidden text-gray-600">
        <Menu size={20} />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={18} />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
