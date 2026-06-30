'use client'
import { useState } from 'react'

// Share row for the watch pages — WhatsApp (pre-written message with the page +
// video URLs) plus X / LinkedIn / Facebook / copy-link.
export default function ShareButtons({
  url, youtubeUrl, title, tagline,
}: {
  url: string
  youtubeUrl?: string
  title: string
  tagline: string
}) {
  const [copied, setCopied] = useState(false)

  const waMsg =
    `🤖 ${title}\n${tagline}\n\n` +
    `▶ Watch (60 sec): ${url}` +
    (youtubeUrl ? `\n${youtubeUrl}` : '') +
    `\n\n🎓 Join the FREE demo class → https://webinar.ostaran.com\n— oStaran, learn AI live & from scratch.`

  const wa = `https://wa.me/?text=${encodeURIComponent(waMsg)}`
  const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} — oStaran`)}&url=${encodeURIComponent(url)}`
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`

  function copy() {
    try {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const base = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90'

  return (
    <div className="mt-8">
      <p className="text-slate-500 text-xs mb-3 uppercase tracking-wide">Share this video</p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <a href={wa} target="_blank" rel="noreferrer" className={base} style={{ background: '#25D366', color: '#0A0A14' }}>
          💬 WhatsApp
        </a>
        <a href={tw} target="_blank" rel="noreferrer" className={base + ' text-white'} style={{ background: 'rgba(255,255,255,0.08)' }}>
          𝕏
        </a>
        <a href={li} target="_blank" rel="noreferrer" className={base + ' text-white'} style={{ background: '#0A66C2' }}>
          in LinkedIn
        </a>
        <a href={fb} target="_blank" rel="noreferrer" className={base + ' text-white'} style={{ background: '#1877F2' }}>
          f Facebook
        </a>
        <button onClick={copy} className={base + ' text-white'} style={{ background: 'rgba(255,255,255,0.08)' }}>
          {copied ? '✓ Copied' : '🔗 Copy link'}
        </button>
      </div>
    </div>
  )
}
