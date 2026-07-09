import Link from 'next/link'
import {
  Briefcase, GraduationCap, Rocket, Crown,
  BookOpen, Heart, Code2, Atom, Brain,
  Clock, Layers, Star, ChevronRight
} from 'lucide-react'
import { Price } from '@/lib/currency'

interface CourseCardProps {
  course: {
    id: string
    name: string
    slug: string
    description: string | null
    mrp: number | null
    target_audience?: string | null
    total_sessions?: number | null
    session_duration_mins?: number | null
    course_format?: string | null
  }
}

// ── Audience → visual theme mapping ──────────────────────────────────────────
function getCourseTheme(name: string, slug: string) {
  const n = name.toLowerCase()
  const s = slug.toLowerCase()

  if (s.includes('continued'))     return { Icon: Atom,           accent: '#a855f7', bg: '#faf5ff', badge: 'Membership',         audience: 'Everyone — all levels'       }
  if (s.includes('quantum'))       return { Icon: Atom,           accent: '#7c3aed', bg: '#f5f3ff', badge: 'Advanced',          audience: 'Engineers & Researchers'     }
  if (s.includes('agentic'))       return { Icon: Code2,          accent: '#0f172a', bg: '#f8fafc', badge: 'Technical',          audience: 'Tech Developers'             }
  if (n.includes('leader') || n.includes('executive') || n.includes('cxo'))
                                   return { Icon: Crown,           accent: '#7e22ce', bg: '#faf5ff', badge: 'Executive',          audience: 'Leaders & CXOs'              }
  if (n.includes('entrepreneur'))  return { Icon: Rocket,          accent: '#d97706', bg: '#fffbeb', badge: 'Business',           audience: 'Entrepreneurs & Founders'    }
  if (n.includes('school'))        return { Icon: BookOpen,        accent: '#0284c7', bg: '#f0f9ff', badge: 'School',             audience: 'Students aged 13–18'         }
  if (n.includes('homemaker') || n.includes('career return'))
                                   return { Icon: Heart,           accent: '#e11d48', bg: '#fff1f2', badge: 'Flexible',           audience: 'Homemakers & Returners'      }
  if (n.includes('student') || n.includes('graduate'))
                                   return { Icon: GraduationCap,   accent: '#16a34a', bg: '#f0fdf4', badge: 'Career Start',       audience: 'Students & Fresh Graduates'  }
  if (n.includes('working professional') || n.includes('professional'))
                                   return { Icon: Briefcase,       accent: '#4f46e5', bg: '#eef2ff', badge: 'Professional',       audience: 'Working Professionals'       }
  // Default — AI Mastery Programme
  return                             { Icon: Brain,             accent: '#4f46e5', bg: '#eef2ff', badge: 'All Levels',         audience: 'Everyone'                    }
}

export function CourseCard({ course }: CourseCardProps) {
  const theme = getCourseTheme(course.name, course.slug)
  const { Icon, accent, bg, badge, audience } = theme
  const fmt = course.course_format ?? null
  const isMembership = course.slug.includes('continued') || fmt === 'rolling'   // weekly · ongoing
  const sessions = course.total_sessions ?? null
  const duration = course.session_duration_mins ?? null

  // Tenure/structure label — reflects the booked cohort, never a hardcoded count.
  const structureLabel =
      isMembership          ? 'Weekly · ongoing'
    : fmt === 'weekend9'    ? '9 weekend sessions'
    : fmt === 'long26'      ? '26 weekly sessions'
    : sessions              ? `${sessions} Live Sessions`
    :                         'Live sessions'

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group relative flex flex-col rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-transparent bg-white"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* ── Accent top bar ─────────────────────────────────────────── */}
      <div className="h-1.5 w-full transition-all duration-300 group-hover:h-2"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}99)` }} />

      {/* ── Card header ────────────────────────────────────────────── */}
      <div className="p-5 pb-3" style={{ background: bg }}>
        <div className="flex items-start justify-between gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{ background: `${accent}18`, border: `1.5px solid ${accent}30` }}>
            <Icon size={20} style={{ color: accent }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 mt-0.5"
            style={{ color: accent, background: `${accent}12`, borderColor: `${accent}25` }}>
            {badge}
          </span>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{audience}</p>
      </div>

      {/* ── Card body ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-5 pt-3">
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-indigo-700 transition-colors">
          {course.name}
        </h3>

        {course.description && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">{course.description}</p>
        )}

        {/* ── Session info pills ─────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap mb-4 mt-auto">
          <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            <Layers size={11} className="text-gray-400" /> {structureLabel}
          </span>
          {duration && (
            <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              <Clock size={11} className="text-gray-400" /> {duration} min each
            </span>
          )}
          <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            <Star size={11} className="text-amber-400 fill-amber-400" /> 4.9 rated
          </span>
        </div>

        {/* ── Footer: Price + CTA ────────────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 leading-none mb-0.5">{isMembership ? 'Monthly membership' : 'Starting from'}</p>
            <p className="text-xl font-extrabold" style={{ color: accent }}>
              {course.mrp ? <Price inr={course.mrp} /> : 'Free'}{isMembership && <span className="text-xs font-medium text-gray-400">/mo</span>}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold transition-all duration-200 group-hover:gap-2"
            style={{ color: accent }}>
            Learn More <ChevronRight size={16} />
          </div>
        </div>
      </div>

      {/* ── Hover glow overlay ─────────────────────────────────────── */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `0 0 0 2px ${accent}40, 0 20px 60px ${accent}15` }} />
    </Link>
  )
}
