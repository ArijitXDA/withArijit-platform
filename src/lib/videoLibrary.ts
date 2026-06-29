// Central registry for the public Video Library (/videos) and the /watch/[slug]
// pages. Add an entry here and it auto-appears on /videos — that's all it takes
// to publish a new video. A video is either a YouTube embed (youtubeId) or
// self-hosted on Supabase Storage (selfHosted).

export type VideoCategory = 'Programmes' | 'Webinar' | 'Courses' | 'For You'

export type VideoEntry = {
  slug: string
  title: string
  tagline: string
  category: VideoCategory
  youtubeId?: string   // YouTube-hosted
  selfHosted?: boolean // Supabase: marketing-videos/<slug>.mp4
  cta?: { label: string; href: string }
}

export const CATEGORY_ORDER: VideoCategory[] = ['Programmes', 'Webinar', 'Courses', 'For You']

export const CATEGORY_BLURB: Record<VideoCategory, string> = {
  'Programmes': 'How oStaran works — for partners and mentors.',
  'Webinar': 'Our free, live AI Certification Webinar.',
  'Courses': 'A 60-second look at each oStaran course.',
  'For You': 'Short intros, made for who you are.',
}

export const VIDEO_LIBRARY: VideoEntry[] = [
  // ── Programmes ──────────────────────────────────────────────────────────
  {
    slug: 'ai-partner-intro', category: 'Programmes', youtubeId: 'rspm6VoUh7o',
    title: 'Become an oStaran AI Partner',
    tagline: 'Earn by gifting the FREE AI Certification Webinar — no selling, no tech background, free to start.',
    cta: { label: 'Become an AI Partner →', href: 'https://partner.ostaran.com/' },
  },
  {
    slug: 'partner-tutorial', category: 'Programmes', youtubeId: 'huqfIoZdmqg',
    title: 'Partner Dashboard Tutorial',
    tagline: 'A guided tour of the oStaran AI Partner dashboard — every feature, end to end.',
    cta: { label: 'Open the dashboard →', href: 'https://partner.ostaran.com/dashboard' },
  },
  {
    slug: 'mentor-tutorial', category: 'Programmes', youtubeId: 'kPo2GuBlmRo',
    title: 'Mentor Programme & Dashboard',
    tagline: 'Teach what you know and keep up to 90% — the programme + a full tour of your Mentor Dashboard.',
    cta: { label: 'Become a Mentor →', href: 'https://partner.ostaran.com/dashboard/become-mentor' },
  },

  // ── Webinar ─────────────────────────────────────────────────────────────
  {
    slug: 'free-webinar', category: 'Webinar', selfHosted: true,
    title: 'FREE AI Certification Webinar',
    tagline: 'A free, live 90-minute session — industry-recognized certificate, lifetime AI library & job support.',
    cta: { label: 'Reserve your FREE seat →', href: 'https://webinar.ostaran.com' },
  },

  // ── Courses (60-sec bites) — add a youtubeId for each as it is recorded ───
  // {
  //   slug: 'course-ai-mastery-programme', category: 'Courses', youtubeId: '...',
  //   title: 'AI Mastery Programme',
  //   tagline: 'Go from AI-curious to AI-fluent — applied to your work and life.',
  //   cta: { label: 'Explore the course →', href: 'https://www.ostaran.com/courses/ai-mastery-programme' },
  // },

  // ── For You (audience bites) — add a youtubeId for each as it is recorded ─
  // {
  //   slug: 'aud-students', category: 'For You', youtubeId: '...',
  //   title: 'For Students & Fresh Graduates',
  //   tagline: 'See how AI is used in the jobs you want — and join the free webinar.',
  //   cta: { label: 'Join the free webinar →', href: 'https://webinar.ostaran.com' },
  // },
]

export function getVideo(slug: string): VideoEntry | undefined {
  return VIDEO_LIBRARY.find(v => v.slug === slug)
}

export function videosByCategory(): { category: VideoCategory; blurb: string; items: VideoEntry[] }[] {
  return CATEGORY_ORDER
    .map(category => ({ category, blurb: CATEGORY_BLURB[category], items: VIDEO_LIBRARY.filter(v => v.category === category) }))
    .filter(g => g.items.length > 0)
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}
