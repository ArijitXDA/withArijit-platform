'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

/**
 * Light/dark theme toggle for the marketing navbar. The navbar itself stays
 * white in both themes, so this button is styled statically for a white ground.
 * Shows the icon of the theme it will switch TO. Renders a stable placeholder
 * until mounted to avoid a hydration mismatch (next-themes resolves on client).
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title="Switch colour theme"
      className={`inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors ${className}`}
      style={{ width: 38, height: 38 }}
    >
      {mounted && !isDark ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  )
}
