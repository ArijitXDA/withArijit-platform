'use client'

// "See oStaran in action" — homepage video strip.
// PRIVACY-FIRST: each card is a self-contained branded facade (no thumbnail fetch,
// no YouTube/Google request, no cookies) until the visitor clicks Play. Only then
// do we load a youtube-nocookie iframe. Keeps the page fast and consent-clean (DPDP).

import { useState } from 'react'
import { Play } from 'lucide-react'

type Vid = { id: string; title: string; tag: string; short: boolean }

const MAIN: Vid = { id: 'oeBW1EtHLgQ', title: 'Meet oStaran', tag: 'Our story', short: false }
const SHORTS: Vid[] = [
  { id: 'KcjY8BmLJEw', title: 'oStaran in 60 seconds',            tag: 'Quick look',        short: true },
  { id: 'nVrlCgjVVBU', title: 'Let your child build AI & robots', tag: 'For young learners', short: true },
]

const CARD_BG = 'linear-gradient(135deg, #07112E 0%, #0D1F4E 55%, #4338ca 100%)'

function VideoCard({ v }: { v: Vid }) {
  const [play, setPlay] = useState(false)
  const ratio = v.short ? '9 / 16' : '16 / 9'

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ aspectRatio: ratio, background: CARD_BG, boxShadow: 'var(--os-sh-sm)' }}
    >
      {play ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={v.title}
          allow="autoplay; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlay(true)}
          aria-label={`Play video: ${v.title}`}
          className="group absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-4 p-5 text-center"
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
            style={{ background: 'var(--os-gold, #F0BE3C)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}
          >
            <Play size={26} fill="#07112E" style={{ color: '#07112E', marginLeft: 3 }} />
          </span>
          <span className="px-2">
            <span className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--os-gold, #F0BE3C)' }}>
              {v.tag}
            </span>
            <span className="mt-1 block text-lg font-bold leading-snug text-white">{v.title}</span>
          </span>
          <span className="absolute bottom-3 text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
            ▶ Tap to play
          </span>
        </button>
      )}
    </div>
  )
}

export function VideoShowcaseSection() {
  return (
    <section className="px-4 py-20" style={{ background: 'var(--os-page)' }}>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <span
            className="mb-4 inline-block rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ background: 'var(--os-surface)', color: 'var(--os-accent-soft)', borderColor: 'var(--os-pill-line)', boxShadow: 'var(--os-sh-sm)' }}
          >
            Watch
          </span>
          <h2 className="mb-4 text-4xl font-extrabold md:text-5xl" style={{ color: 'var(--os-ink)' }}>
            See oStaran in action
          </h2>
          <p className="mx-auto max-w-xl text-lg" style={{ color: 'var(--os-muted)' }}>
            A quick look at what we do — for professionals, students, and young learners.
          </p>
        </div>

        <div className="grid items-start gap-8 md:grid-cols-2">
          {/* Main story video (16:9) */}
          <div className="mx-auto w-full max-w-2xl">
            <VideoCard v={MAIN} />
          </div>

          {/* Two shorts (9:16) side by side */}
          <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-5">
            {SHORTS.map(v => <VideoCard key={v.id} v={v} />)}
          </div>
        </div>
      </div>
    </section>
  )
}
