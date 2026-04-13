'use client'
import { Bot } from 'lucide-react'

export function AskAriBadge() {
  return (
    <div className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
      <Bot size={11} />
      <span className="font-semibold">Ask Ari</span>
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
    </div>
  )
}
