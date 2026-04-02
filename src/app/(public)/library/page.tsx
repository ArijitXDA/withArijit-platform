import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Lock, BookOpen, FileText, Zap, Video, Wrench, CheckSquare, FileCode, Download } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'AI Resource Library | oStaran',
  description: 'Free AI guides, prompt packs, templates, cheatsheets and tools. Full library access for enrolled students.',
  keywords: ['AI resources', 'AI templates', 'ChatGPT prompts', 'AI guides India', 'free AI tools'],
}

type LibraryItem = {
  id: string
  title: string
  type: string
  category: string
  description: string | null
  access_level: string
  tags: string[]
  downloads: number
  preview_url: string | null
  file_url: string | null
}

const TYPE_META: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  ebook:       { icon: BookOpen,   label: 'eBook',        color: '#4f46e5', bg: '#eef2ff' },
  template:    { icon: FileText,   label: 'Template',     color: '#059669', bg: '#ecfdf5' },
  prompt_pack: { icon: Zap,        label: 'Prompt Pack',  color: '#d97706', bg: '#fffbeb' },
  guide:       { icon: FileCode,   label: 'Guide',        color: '#0284c7', bg: '#f0f9ff' },
  video:       { icon: Video,      label: 'Video',        color: '#7c3aed', bg: '#f5f3ff' },
  tool:        { icon: Wrench,     label: 'Tool',         color: '#dc2626', bg: '#fef2f2' },
  cheatsheet:  { icon: CheckSquare,label: 'Cheatsheet',   color: '#0891b2', bg: '#ecfeff' },
  checklist:   { icon: CheckSquare,label: 'Checklist',    color: '#65a30d', bg: '#f7fee7' },
}

const CATEGORY_LABELS: Record<string, string> = {
  generative_ai: 'Generative AI',
  productivity:  'Productivity',
  python:        'Python & Code',
  career:        'Career & Jobs',
  agentic_ai:    'Agentic AI',
  data:          'Data & Analytics',
  business:      'Business',
}

export default async function LibraryPage() {
  const supabase = await createClient()

  const [{ data: publicItems }, { data: enrolledItems }] = await Promise.all([
    supabase
      .from('library_items')
      .select('id, title, type, category, description, access_level, tags, downloads, preview_url, file_url')
      .eq('is_active', true)
      .eq('access_level', 'public')
      .order('sort_order'),
    supabase
      .from('library_items')
      .select('id, title, type, category, description, access_level, tags, downloads, preview_url')
      .eq('is_active', true)
      .eq('access_level', 'enrolled')
      .order('sort_order'),
  ])

  const allCategories = Array.from(
    new Set([...(publicItems ?? []), ...(enrolledItems ?? [])].map(i => i.category))
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-5">
            AI Resource Library
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-5">
            Everything You Need to
            <span className="text-transparent bg-clip-text block" style={{ backgroundImage: 'linear-gradient(90deg, #a78bfa, #60a5fa)' }}>
              Master AI Faster
            </span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Guides, prompt packs, templates, cheatsheets and tools — curated for every stage of your AI journey.
            Free previews available. Full access for enrolled students.
          </p>
          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{((publicItems?.length ?? 0) + (enrolledItems?.length ?? 0))}+</p>
              <p className="text-xs text-gray-400">Resources</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{allCategories.length}</p>
              <p className="text-xs text-gray-400">Categories</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">Free</p>
              <p className="text-xs text-gray-400">Public Resources</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-14 space-y-16">

        {/* ── Free / Public section ─────────────────────────────────── */}
        {(publicItems ?? []).length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Download size={16} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Free Resources</h2>
                <p className="text-sm text-gray-500">No sign-in required — download and use immediately</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(publicItems ?? []).map(item => (
                <LibraryCard key={item.id} item={item} locked={false} />
              ))}
            </div>
          </section>
        )}

        {/* ── Enrolled / locked section ─────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Lock size={16} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Student Library</h2>
                <p className="text-sm text-gray-500">Full access for enrolled oStaran students</p>
              </div>
            </div>
            <Link href="/free-webinar"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              Get Access Free
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(enrolledItems ?? []).map(item => (
              <LibraryCard key={item.id} item={item} locked={true} />
            ))}
          </div>

          {/* ── Access CTA ───────────────────────────────────────────── */}
          <div className="mt-10 rounded-3xl overflow-hidden">
            <div className="p-8 md:p-12 text-center" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-5">
                <Lock size={24} className="text-indigo-300" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Unlock the Full Library</h3>
              <p className="text-indigo-200 max-w-lg mx-auto mb-6 text-sm leading-relaxed">
                Enrol in any oStaran AI programme and get lifetime access to every resource in this library —
                including all future additions. Start with our free webinar.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/free-webinar"
                  className="px-6 py-3 rounded-xl text-sm font-bold text-indigo-900 bg-white hover:bg-indigo-50 transition-colors">
                  Join Free Webinar First
                </Link>
                <Link href="/courses"
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white border border-indigo-400/40 hover:bg-indigo-500/20 transition-colors">
                  View Programmes
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function LibraryCard({ item, locked }: { item: LibraryItem; locked: boolean }) {
  const meta = TYPE_META[item.type] ?? TYPE_META.guide
  const { icon: Icon, label, color, bg } = meta

  return (
    <div className={`group relative flex flex-col bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${locked ? 'border-gray-100' : 'border-green-100 hover:-translate-y-1 hover:shadow-xl hover:border-transparent'}`}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

      {/* Top accent */}
      <div className="h-1 w-full" style={{ background: locked ? '#e5e7eb' : color }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: locked ? '#f3f4f6' : bg }}>
            <Icon size={18} style={{ color: locked ? '#9ca3af' : color }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ color: locked ? '#9ca3af' : color, background: locked ? '#f3f4f6' : bg }}>
              {label}
            </span>
            {locked && (
              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                <Lock size={10} className="text-gray-400" />
              </span>
            )}
          </div>
        </div>

        {/* Category */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          {CATEGORY_LABELS[item.category] ?? item.category}
        </p>

        {/* Title */}
        <h3 className={`font-bold text-sm leading-snug mb-2 ${locked ? 'text-gray-500' : 'text-gray-900'}`}>
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{item.description}</p>
        )}

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto mb-3">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">#{tag}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">{item.downloads > 0 ? `${item.downloads} downloads` : 'New'}</span>
          {locked ? (
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
              <Lock size={10} /> Enrol to access
            </span>
          ) : (
            <a href={item.file_url ?? '#'}
              className="text-xs font-bold flex items-center gap-1 transition-colors hover:opacity-80"
              style={{ color }}
              download>
              <Download size={12} /> Download
            </a>
          )}
        </div>
      </div>

      {/* Locked overlay */}
      {locked && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Link href="/free-webinar"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            Get Access Free
          </Link>
        </div>
      )}
    </div>
  )
}
