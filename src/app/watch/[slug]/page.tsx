import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getVideo } from '@/lib/videoLibrary'
import ShareButtons from './ShareButtons'

// Branded, shareable watch pages. A video is either a YouTube embed (youtubeId)
// or self-hosted on Supabase Storage. ?embed=1 → bare player (for iframing,
// e.g. the free-webinar video into webinar.ostaran.com).
const videoSrc = (slug: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/marketing-videos/${slug}.mp4`
const frameStyle = { border: '1.5px solid rgba(255,45,120,0.55)', boxShadow: '0 0 44px rgba(255,45,120,0.22)' } as const

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const m = getVideo(slug)
  if (!m) return { title: 'Video — oStaran' }
  return { title: `${m.title} · oStaran`, description: m.tagline, openGraph: { title: m.title, description: m.tagline } }
}

export const dynamic = 'force-dynamic'

export default async function WatchPage(
  { params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ embed?: string; partner?: string }> },
) {
  const { slug } = await params
  const { embed, partner } = await searchParams
  const meta = getVideo(slug)
  if (!meta) notFound()
  const pageUrl = `https://www.ostaran.com/watch/${slug}` + (partner ? `?partner=${encodeURIComponent(partner)}` : '')
  const youtubeUrl = meta.youtubeId ? `https://youtu.be/${meta.youtubeId}` : undefined
  // Forward the source partner's code to the CTA so the destination attributes the lead.
  const ctaHref = meta.cta
    ? (partner && meta.ctaTracking
        ? meta.cta.href + (meta.cta.href.includes('?') ? '&' : '?') + (meta.ctaTracking === 'webinar'
            ? `utm_source=${encodeURIComponent(partner)}&utm_medium=partner_share&utm_campaign=${encodeURIComponent(partner)}`
            : `ref=${encodeURIComponent(partner)}`)
        : meta.cta.href)
    : undefined

  let player
  if (meta.youtubeId) {
    player = (
      <div className="w-full rounded-2xl overflow-hidden" style={frameStyle}>
        <iframe
          src={`https://www.youtube.com/embed/${meta.youtubeId}?rel=0`}
          title={meta.title}
          className="w-full block"
          style={{ aspectRatio: '16 / 9', border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    )
  } else {
    const src = videoSrc(slug)
    let available = true
    try { const h = await fetch(src, { method: 'HEAD', cache: 'no-store' }); available = h.ok } catch { available = false }
    player = available ? (
      <div className="w-full rounded-2xl overflow-hidden" style={frameStyle}>
        <video src={src} controls playsInline preload="metadata" className="w-full block bg-black" style={{ aspectRatio: '16 / 9' }} />
      </div>
    ) : (
      <div className="w-full rounded-2xl flex items-center justify-center text-slate-400 text-sm" style={{ aspectRatio: '16 / 9', background: '#10101c', border: '1.5px solid rgba(255,255,255,0.1)' }}>
        Video is being published — please check back shortly.
      </div>
    )
  }

  if (embed === '1') {
    return <div className="min-h-screen w-full flex items-center justify-center bg-black p-0">{player}</div>
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#0A0A14' }}>
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{meta.title}</h1>
        <p className="text-slate-400 text-sm md:text-base mb-6">{meta.tagline}</p>
        {player}
        {meta.cta && (
          <a href={ctaHref} className="inline-flex items-center gap-1.5 mt-7 px-5 py-2.5 rounded-xl font-semibold text-white text-sm" style={{ background: '#FF2D78' }}>
            {meta.cta.label}
          </a>
        )}
        <ShareButtons url={pageUrl} youtubeUrl={youtubeUrl} title={meta.title} tagline={meta.tagline} />
        <p className="mt-7"><a href="/videos" className="text-pink-300 hover:text-white text-sm underline">← All videos</a></p>
        <p className="text-slate-600 text-xs mt-5">oStaran — a fully autonomous platform for AI education.</p>
      </div>
    </div>
  )
}
