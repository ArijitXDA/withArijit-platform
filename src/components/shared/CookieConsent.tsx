'use client'
import { useEffect, useState } from 'react'

// Lightweight cookie-consent banner. Records the visitor's choice in localStorage.
// Essential cookies always run; analytics/non-essential should check this value
// before firing. Shown once until a choice is made.
export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try { if (!localStorage.getItem('ost_cookie_consent')) setShow(true) } catch { /* SSR / privacy mode */ }
  }, [])

  function choose(v: 'accepted' | 'rejected') {
    try { localStorage.setItem('ost_cookie_consent', v) } catch { /* ignore */ }
    setShow(false)
  }

  if (!show) return null
  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4">
      <div className="max-w-4xl mx-auto rounded-2xl border shadow-2xl p-4 sm:flex sm:items-center sm:gap-4"
        style={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.12)' }}>
        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed flex-1">
          We use essential cookies to run the platform and, with your consent, optional analytics cookies to improve it. See our{' '}
          <a href="/privacy" className="underline text-indigo-400">Privacy Policy</a>.
        </p>
        <div className="flex gap-2 mt-3 sm:mt-0 shrink-0">
          <button onClick={() => choose('rejected')}
            className="px-4 py-2 rounded-xl text-xs font-semibold border text-slate-300 hover:bg-white/5 transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.15)' }}>Reject non-essential</button>
          <button onClick={() => choose('accepted')}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>Accept all</button>
        </div>
      </div>
    </div>
  )
}
