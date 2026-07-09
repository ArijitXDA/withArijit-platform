'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCurrency } from '@/lib/currency'
import { CURRENCIES, CURRENCY_LABEL } from '@/lib/currency-config'

/**
 * Currency selector for the public navbar (INR / USD / EUR). Styled statically for
 * the white navbar (matches ThemeToggle). Writes the choice to a cookie via the
 * currency context so every <Price> on the page updates instantly.
 */
export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change currency"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1 h-9 px-2.5 rounded-xl border border-gray-200 bg-white text-slate-700 text-xs font-bold hover:border-indigo-300 hover:text-indigo-600 transition-colors"
      >
        {CURRENCY_LABEL[currency]}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1 w-28 rounded-xl bg-white border border-gray-100 shadow-xl py-1 z-50"
        >
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={c === currency}
              onClick={() => { setCurrency(c); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-indigo-50 transition-colors ${
                c === currency ? 'text-indigo-700' : 'text-slate-600'
              }`}
            >
              {CURRENCY_LABEL[c]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
