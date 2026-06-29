import type { Metadata } from 'next'
import Link from 'next/link'
import { videosByCategory, youtubeThumb } from '@/lib/videoLibrary'

export const metadata: Metadata = {
  title: 'Video Library · oStaran',
  description: 'Watch oStaran in 60 seconds — programmes, the free webinar, every course, and a short intro made for you.',
}

export default function VideosPage() {
  const groups = videosByCategory()
  return (
    <div className="min-h-screen px-4 py-12 md:py-16" style={{ background: '#0A0A14' }}>
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white">oStaran Video Library</h1>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto">
            Short, no-fluff videos — how oStaran works, the free webinar, and a 60-second look at every course and learner type.
          </p>
        </header>

        {groups.map(g => (
          <section key={g.category} className="mb-12">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-5">
              <h2 className="text-xl md:text-2xl font-bold text-white">{g.category}</h2>
              <span className="text-slate-500 text-sm">{g.blurb}</span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map(v => (
                <Link
                  key={v.slug}
                  href={`/watch/${v.slug}`}
                  className="group rounded-2xl overflow-hidden border border-white/10 hover:border-pink-500/50 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="relative w-full" style={{ aspectRatio: '16 / 9', background: '#10101c' }}>
                    {v.youtubeId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={youtubeThumb(v.youtubeId)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, rgba(255,45,120,0.25), rgba(124,58,237,0.18))' }} />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'rgba(255,45,120,0.92)', boxShadow: '0 0 28px rgba(255,45,120,0.4)' }}>
                        <span className="text-white text-xl" style={{ marginLeft: 3 }}>▶</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-white font-semibold text-sm">{v.title}</p>
                    <p className="text-slate-400 text-xs mt-1">{v.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <p className="text-center text-slate-600 text-xs mt-4">More course &amp; learner videos are being added — check back soon.</p>
      </div>
    </div>
  )
}
