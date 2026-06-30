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
  {
    slug: 'ai-partner-invite', category: 'Programmes', youtubeId: 'oxXZlgVBayE',
    title: 'Become an oStaran AI Partner (2-min)',
    tagline: 'Earn by gifting free AI education — no selling, no tech background, free to start.',
    cta: { label: 'Become an AI Partner →', href: 'https://partner.ostaran.com/' },
  },

  // ── Webinar ─────────────────────────────────────────────────────────────
  {
    slug: 'free-webinar', category: 'Webinar', selfHosted: true,
    title: 'FREE AI Certification Webinar',
    tagline: 'A free, live 90-minute session — industry-recognized certificate, lifetime AI library & job support.',
    cta: { label: 'Reserve your FREE seat →', href: 'https://webinar.ostaran.com' },
  },

  // ── Courses (60-sec bites) ────────────────────────────────────────────────
  {
    slug: 'ai-mastery-for-students', category: 'Courses', youtubeId: 'zRzg-341IwA',
    title: 'AI Mastery for Students & Fresh Graduates',
    tagline: 'Graduate already knowing the AI skills employers screen for — live, from scratch.',
    cta: { label: 'Explore the course →', href: 'https://www.ostaran.com/courses/ai-mastery-for-students' },
  },
  {
    slug: 'ai-mastery-for-working-professionals', category: 'Courses', youtubeId: 'r5vTAz-ylhg',
    title: 'AI Mastery for Working Professionals',
    tagline: 'Do your job faster and get noticed — reusable AI workflows, live, from scratch.',
    cta: { label: 'Explore the course →', href: 'https://www.ostaran.com/courses/ai-mastery-for-working-professionals' },
  },
  {
    slug: 'ai-mastery-for-entrepreneurs', category: 'Courses', youtubeId: 'CnjLyUgw85M',
    title: 'AI Mastery for Entrepreneurs & Business Owners',
    tagline: 'Run marketing, sales, support & operations with AI — not a big team.',
    cta: { label: 'Explore the course →', href: 'https://www.ostaran.com/courses/ai-mastery-for-entrepreneurs' },
  },
  {
    slug: 'ai-mastery-for-homemakers', category: 'Courses', youtubeId: 'DJRItJ8WT1E',
    title: 'AI Mastery for Homemakers & Career Returners',
    tagline: 'A confident restart with AI — no tech background, at your own pace.',
    cta: { label: 'Explore the course →', href: 'https://www.ostaran.com/courses/ai-mastery-for-homemakers' },
  },
  {
    slug: 'ai-mastery-for-school-students', category: 'Courses', youtubeId: 'O6Mb-jvKCjk',
    title: 'AI Mastery for School Students',
    tagline: 'Robotics, games, Python & AI agents — a safe, fun head start with a real AI portfolio.',
    cta: { label: 'Explore the course →', href: 'https://www.ostaran.com/courses/ai-mastery-for-school-students' },
  },
  {
    slug: 'ai-mastery-for-leaders', category: 'Courses', youtubeId: 'pvvfqsbcMY4',
    title: 'AI Mastery for Senior Leaders & Executives',
    tagline: 'Lead an AI-first organisation — governance, the boardroom & the real agent stack.',
    cta: { label: 'Explore the course →', href: 'https://www.ostaran.com/courses/ai-mastery-for-leaders' },
  },
  {
    slug: 'agentic-ai-development', category: 'Courses', youtubeId: 'RI7gXBwzEM8',
    title: 'Master of Agentic AI Development',
    tagline: 'Build autonomous AI agents — the most in-demand skill in tech. Live, from scratch.',
    cta: { label: 'Explore the course →', href: 'https://www.ostaran.com/courses/agentic-ai-development' },
  },
  {
    slug: 'quantum-computing-and-ai', category: 'Courses', youtubeId: 'FrOkozS6lUY',
    title: 'Master of Quantum Computing & AI',
    tagline: 'Master the frontier where quantum meets AI — the next magic. Live, from scratch.',
    cta: { label: 'Explore the course →', href: 'https://www.ostaran.com/courses/quantum-computing-and-ai' },
  },
  {
    slug: 'quantum-ai-continued', category: 'Courses', youtubeId: 'WTVo3s1QThw',
    title: 'Quantum & AI — Continued Up-skilling',
    tagline: 'Stay current with quantum & AI — ongoing, monthly upskilling for alumni.',
    cta: { label: 'Explore the course →', href: 'https://www.ostaran.com/courses/quantum-ai-continued' },
  },
  // (AI Mastery Programme flagship + the 6 audience "For You" bites — add a youtubeId here as each is recorded.)

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
