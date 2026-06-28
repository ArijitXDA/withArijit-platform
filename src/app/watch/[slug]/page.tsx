import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

// Branded, shareable watch pages for the marketing intro videos (self-hosted on
// Supabase Storage). ?embed=1 → bare player (for iframing into webinar.ostaran.com).
const VIDEOS: Record<string, { title: string; tagline: string; cta?: { label: string; href: string } }> = {
  'free-webinar': {
    title: 'FREE AI Certification Webinar',
    tagline: 'A free, live 90-minute session — industry-recognized certificate, lifetime AI library & job support. Watch the intro, then reserve your seat.',
    cta: { label: 'Reserve your FREE seat →', href: 'https://webinar.ostaran.com' },
  },
}

const videoSrc = (slug: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/marketing-videos/${slug}.mp4`

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const m = VIDEOS[slug]
  if (!m) return { title: 'Video — oStaran' }
  return { title: `${m.title} · oStaran`, description: m.tagline, openGraph: { title: m.title, description: m.tagline, videos: [videoSrc(slug)] } }
}

export const dynamic = 'force-dynamic'

export default async function WatchPage(
  { params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ embed?: string }> },
) {
  const { slug } = await params
  const { embed } = await searchParams
  const meta = VIDEOS[slug]
  if (!meta) notFound()

  const src = videoSrc(slug)
  let available = true
  try { const h = await fetch(src, { method: 'HEAD', cache: 'no-store' }); available = h.ok } catch { available = false }

  const player = available ? (
    <div className="w-full rounded-2xl overflow-hidden" style={{ border: '1.5px solid rgba(255,45,120,0.55)', boxShadow: '0 0 44px rgba(255,45,120,0.22)' }}>
      <video src={src} controls playsInline preload="metadata" className="w-full block bg-black" style={{ aspectRatio: '16 / 9' }} />
    </div>
  ) : (
    <div className="w-full rounded-2xl flex items-center justify-center text-slate-400 text-sm" style={{ aspectRatio: '16 / 9', background: '#10101c', border: '1.5px solid rgba(255,255,255,0.1)' }}>
      Video is being published — please check back shortly.
    </div>
  )

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
          <a href={meta.cta.href} className="inline-flex items-center gap-1.5 mt-7 px-5 py-2.5 rounded-xl font-semibold text-white text-sm" style={{ background: '#FF2D78' }}>
            {meta.cta.label}
          </a>
        )}
        <p className="text-slate-600 text-xs mt-7">oStaran — a fully autonomous platform for AI education.</p>
      </div>
    </div>
  )
}
