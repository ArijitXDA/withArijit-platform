'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

/**
 * Renders a PDF (fetched from the auth-gated stream proxy) into a vertically
 * scrollable list of <canvas> pages using pdf.js. Unlike an <iframe> + the
 * browser's native PDF plugin — which on mobile (iOS especially) shows only the
 * first page and won't scroll — this works on every device AND keeps the content
 * non-downloadable (no PDF file is ever handed to the browser; pages are drawn to
 * canvas). The email watermark overlay in the reader modal sits on top.
 */
export function PdfViewer({ src, onReady }: { src: string; onReady?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pagesRef  = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const pagesEl = pagesRef.current
    if (pagesEl) pagesEl.innerHTML = ''
    setStatus('loading')
    setProgress(null)

    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        // Worker from jsdelivr, pinned to the EXACT loaded version (pdfjs.version
        // ⇒ never a mismatch). Chosen over `new URL(...import.meta.url)` because
        // that relies on bundler-specific worker emission (fragile across
        // Webpack/Turbopack). No page-level CSP blocks this; and if the worker
        // ever fails to load, pdf.js falls back to main-thread rendering, so the
        // viewer still works.
        pdfjs.GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

        const res = await fetch(src)
        if (!res.ok) throw new Error('stream ' + res.status)
        const data = await res.arrayBuffer()
        if (cancelled) return

        const pdf = await pdfjs.getDocument({ data }).promise
        if (cancelled) return
        setProgress({ done: 0, total: pdf.numPages })

        const dpr        = Math.min(window.devicePixelRatio || 1, 2)
        const availW     = (scrollRef.current?.clientWidth ?? 800) - 20
        const targetW    = Math.min(Math.max(availW, 280), 1100)

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return
          const page     = await pdf.getPage(i)
          const base     = page.getViewport({ scale: 1 })
          const cssScale = targetW / base.width
          const viewport = page.getViewport({ scale: cssScale * dpr })

          const canvas = document.createElement('canvas')
          canvas.width  = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.style.width      = '100%'
          canvas.style.maxWidth   = targetW + 'px'
          canvas.style.height     = 'auto'
          canvas.style.display    = 'block'
          canvas.style.margin     = '0 auto 12px'
          canvas.style.borderRadius = '4px'
          canvas.style.boxShadow  = '0 2px 14px rgba(0,0,0,0.4)'

          const ctx = canvas.getContext('2d')
          if (ctx && pagesRef.current) {
            pagesRef.current.appendChild(canvas)
            await page.render({ canvasContext: ctx, viewport }).promise
          }
          if (cancelled) return
          setProgress({ done: i, total: pdf.numPages })
          if (i === 1) { setStatus('ready'); onReady?.() }
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  return (
    <div
      ref={scrollRef}
      className="relative w-full h-full overflow-y-auto overflow-x-hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div ref={pagesRef} className="px-2 py-3" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <Loader2 size={24} className="animate-spin text-indigo-300" />
          <p className="text-xs text-slate-400">
            {progress ? `Rendering page ${progress.done}/${progress.total}…` : 'Loading content securely…'}
          </p>
        </div>
      )}

      {status === 'ready' && progress && progress.done < progress.total && (
        <div
          className="sticky bottom-3 mx-auto w-max px-3 py-1 rounded-full text-[11px] pointer-events-none"
          style={{ background: 'rgba(15,31,61,0.85)', color: '#c7d2fe' }}
        >
          Rendering {progress.done}/{progress.total}…
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)' }}
          >
            <AlertCircle size={20} className="text-red-300" />
          </div>
          <p className="text-sm font-semibold text-white">Content temporarily unavailable</p>
          <p className="text-xs text-slate-400 max-w-sm">Please try again shortly.</p>
        </div>
      )}
    </div>
  )
}
