'use client'
// ─────────────────────────────────────────────────────────────────────────────
// LibraryTile — compact link tile pointing at the oStaran Library. Lives at the
// bottom of the right rail (desktop) and inside the horizontal cards strip
// (mobile).
// ─────────────────────────────────────────────────────────────────────────────

import { BookOpen, ArrowRight } from 'lucide-react'

interface Props { compact?: boolean }

export function LibraryTile({ compact }: Props) {
  return (
    <a href="/library"
      className={`group rounded-2xl border overflow-hidden block transition-all hover:shadow-lg hover:translate-y-[-1px] ${compact ? 'min-w-[220px]' : ''}`}
      style={{ background: 'linear-gradient(135deg,#ecfdf5,#fff)', borderColor: '#34d39933' }}>
      <div className="h-0.5" style={{ background: 'linear-gradient(90deg,#10b981,#10b98166,transparent)' }} />
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
          <BookOpen size={18} color="#fff" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#059669' }}>oStaran Library</p>
          <p className="text-xs leading-tight" style={{ color: '#6b7280' }}>
            Papers, demos & repos — curated for builders.
          </p>
        </div>
        <ArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: '#059669' }} />
      </div>
    </a>
  )
}
