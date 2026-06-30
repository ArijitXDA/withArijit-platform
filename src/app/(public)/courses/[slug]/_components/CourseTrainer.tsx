import Image from 'next/image'

// Default trainer = oStaran's own courses (Arijit Chowdhury). A course with
// trainer_name set (a mentor's course) overrides this from its DB fields, so the
// SAME section renders any trainer. Keeping the default here means oStaran course
// pages are visually unchanged.
interface Cred { label: string; value: string; sub: string }
interface Trainer {
  name: string; title: string; location: string
  photo: string | null; linkedin: string | null
  research: string[]; bio: string[]; credentials: Cred[]
}

const DEFAULT_TRAINER: Trainer = {
  name:     'Arijit Chowdhury',
  title:    'CAIO · AI Educator · Entrepreneur',
  location: 'Mumbai, India 🇮🇳',
  photo:    '/arijit-image.png',
  linkedin: 'https://www.linkedin.com/in/arijit-chowdhury-86020b19/',
  research: ['Agentic AI', 'AGI', 'Quantum Computing', 'Industrial AI', 'AI Defence'],
  bio: [
    "Arijit Chowdhury is one of India's most sought-after AI educators, researchers, and corporate trainers. With 19 years of global experience spanning HSBC, Reliance, Yes Bank, Murugappa Group, Qubit Microsystems, and Star Analytix — and current roles as CAIO at a Global Fintech and Founder of Star Analytix Pvt Ltd — he brings deep, real-world AI expertise into every live session.",
    "His research spans Agentic AI, AGI, Quantum Computing, Industrial AI, and AI Defence. As Guest Lecturer at IIT Bombay and corporate coach for Deloitte, PwC, McKinsey, Capgemini, and Cognizant, Arijit has trained 50,000+ learners across India, USA, and Canada. He doesn't use slides or pre-recorded content — everything is built live, from scratch, in front of you.",
  ],
  credentials: [
    { label: 'Global Corporate Experience', value: '19 Years',       sub: 'HSBC · Reliance · Yes Bank · Murugappa · Qubit Microsystems · Star Analytix' },
    { label: 'Current Role',                 value: 'CAIO & Founder',  sub: 'Global Fintech Firm · Star Analytix Pvt Ltd' },
    { label: 'Guest Lecturer',               value: 'IIT Bombay',      sub: 'KJ Somaiya · NL Dalmia Institute' },
    { label: 'Corporate Coach',              value: 'Big 4 & MNCs',    sub: 'Deloitte · PwC · McKinsey · Capgemini · Cognizant' },
    { label: 'Learners Trained',             value: '50,000+',         sub: 'India · USA · Canada' },
    { label: 'Platform Rating',              value: '4.9 / 5',         sub: 'From verified learner reviews' },
  ],
}

function resolveTrainer(course?: any): { t: Trainer; isCustom: boolean } {
  if (!course?.trainer_name) return { t: DEFAULT_TRAINER, isCustom: false }
  const bioRaw = course.trainer_bio
  return {
    isCustom: true,
    t: {
      name:     course.trainer_name,
      title:    course.trainer_title    ?? '',
      location: course.trainer_location ?? '',
      photo:    course.trainer_photo_url ?? null,
      linkedin: course.trainer_linkedin  ?? null,
      research: Array.isArray(course.trainer_research_areas) ? course.trainer_research_areas : [],
      bio:      typeof bioRaw === 'string' ? bioRaw.split(/\n\n+/).map((s: string) => s.trim()).filter(Boolean) : [],
      credentials: Array.isArray(course.trainer_credentials) ? course.trainer_credentials : [],
    },
  }
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

const LINKEDIN_PATH = 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'

// Compact card for an approved co-mentor ("Co-Instructor").
function CoInstructorCard({ t }: { t: Trainer }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {t.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.photo} alt={t.name} className="w-20 h-20 rounded-full object-cover object-top border-2" style={{ borderColor: 'rgba(139,92,246,0.5)' }} />
          ) : (
            <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center text-xl font-extrabold text-white"
              style={{ borderColor: 'rgba(139,92,246,0.5)', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
              {initials(t.name)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-1.5"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}>Co-Instructor</span>
          <p className="font-extrabold text-white text-lg leading-tight">{t.name}</p>
          {t.title && <p className="text-indigo-400 text-xs mt-0.5 font-semibold">{t.title}</p>}
          {t.location && <p className="text-slate-500 text-xs mt-0.5">{t.location}</p>}
        </div>
      </div>

      {t.research.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {t.research.slice(0, 6).map(area => (
            <span key={area} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
              style={{ background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.25)', color: '#a78bfa' }}>{area}</span>
          ))}
        </div>
      )}

      {t.bio.length > 0 && <p className="text-slate-400 text-sm leading-relaxed mt-4 line-clamp-4">{t.bio[0]}</p>}

      {t.linkedin && (
        <a href={t.linkedin} target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90" style={{ background: '#0077B5' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d={LINKEDIN_PATH} /></svg>
          View on LinkedIn
        </a>
      )}
    </div>
  )
}

export function CourseTrainer({ course, coMentors = [] }: { course?: any; coMentors?: Trainer[] }) {
  const { t, isCustom } = resolveTrainer(course)
  const hasCo = coMentors.length > 0

  return (
    <section className="py-16 px-4" style={{ background: '#06080f' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white mb-2">{hasCo ? 'Your Trainers' : 'Your Trainer'}</h2>
          <p className="text-slate-500 text-sm">
            {hasCo ? 'The mentors who will personally teach your live sessions' : 'The person who will personally teach every single live session'}
          </p>
        </div>

        <div className="rounded-3xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="grid md:grid-cols-[260px_1fr]">

            {/* ── Left: Photo + identity ──────────────────────────────────────── */}
            <div className="flex flex-col items-center justify-start pt-8 pb-8 px-8 text-center border-b md:border-b-0 md:border-r"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(79,70,229,0.06)' }}>

              {/* Photo */}
              <div className="relative mb-4">
                {t.photo ? (
                  isCustom ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photo} alt={t.name}
                      className="w-32 h-32 rounded-full object-cover object-top border-2"
                      style={{ borderColor: 'rgba(139,92,246,0.5)' }} />
                  ) : (
                    <Image src={t.photo} alt={t.name} width={128} height={128}
                      className="w-32 h-32 rounded-full object-cover object-top border-2"
                      style={{ borderColor: 'rgba(139,92,246,0.5)' }} />
                  )
                ) : (
                  <div className="w-32 h-32 rounded-full border-2 flex items-center justify-center text-3xl font-extrabold text-white"
                    style={{ borderColor: 'rgba(139,92,246,0.5)', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                    {initials(t.name)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-black flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>

              {/* Lead label (only when there are co-instructors) */}
              {hasCo && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>Lead Instructor</span>
              )}

              {/* Name */}
              <p className="font-extrabold text-white text-xl leading-tight">{t.name}</p>

              {/* Primary title */}
              {t.title && <p className="text-indigo-400 text-xs mt-1 font-semibold">{t.title}</p>}

              {/* Location */}
              {t.location && <p className="text-slate-500 text-xs mt-1">{t.location}</p>}

              {/* Research & Trainer areas */}
              {t.research.length > 0 && (
                <div className="mt-4 w-full">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Researcher &amp; Trainer</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {t.research.map(area => (
                      <span key={area} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{ background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.25)', color: '#a78bfa' }}>
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* LinkedIn button */}
              {t.linkedin && (
                <a href={t.linkedin} target="_blank" rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 hover:shadow-lg w-full justify-center"
                  style={{ background: '#0077B5' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  View &amp; Follow on LinkedIn
                </a>
              )}
            </div>

            {/* ── Right: Bio + credentials ──────────────────────────────────── */}
            <div className="p-8">
              {t.bio.map((para, i) => (
                <p key={i} className={`${i === 0 ? 'text-slate-300' : 'text-slate-400'} leading-relaxed ${i === t.bio.length - 1 ? 'mb-7' : 'mb-6'} text-sm`}>
                  {para}
                </p>
              ))}

              {t.credentials.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {t.credentials.map(({ label, value, sub }) => (
                    <div key={label} className="rounded-xl p-3 border"
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">{label}</p>
                      <p className="text-white font-extrabold text-sm">{value}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{sub}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {coMentors.length > 0 && (
          <div className={`grid gap-4 mt-6 ${coMentors.length === 1 ? 'max-w-2xl mx-auto' : 'md:grid-cols-2'}`}>
            {coMentors.map((c, i) => <CoInstructorCard key={i} t={c} />)}
          </div>
        )}
      </div>
    </section>
  )
}
