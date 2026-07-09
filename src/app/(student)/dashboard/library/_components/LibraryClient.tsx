'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Library as LibraryIcon, Search, BookOpen, FileText, Star, User,
  Filter, X, ExternalLink, Lock, GraduationCap,
} from 'lucide-react'
import { PdfViewer } from './PdfViewer'

// ────────────────────────────────────────────────────────────────────────
// Student Library — card grid, faceted search, secure modal reader.
// Content is proxied through /api/student/library/stream/[id] — the source
// URL never appears client-side. Modal overlay adds email watermark and
// soft-blocks context menu / Ctrl-S / Ctrl-P as a deterrent.
// ────────────────────────────────────────────────────────────────────────

type LibraryItem = {
  id: string
  title: string
  category: string | null
  author_team: string | null
  publication_type: string | null
  level: string | null
  pages: number | null
  publication_date: string | null
  rating: number | null
  tags: string[] | null
  thumbnail_url: string | null
  notes: string | null
  contributor: string | null
  file_size_mb: number | null
}

const T = {
  navy:         '#0f1f3d',
  blue:         '#2563eb',
  blueLight:    '#eff6ff',
  bluePale:     '#dbeafe',
  indigo:       '#4f46e5',
  indigoBg:     '#eef2ff',
  indigoBorder: '#c7d2fe',
  purple:       '#7c3aed',
  purpleBg:     '#f5f3ff',
  purpleBorder: '#ddd6fe',
  amber:        '#d97706',
  amberBg:      '#fffbeb',
  green:        '#16a34a',
  greenBg:      '#f0fdf4',
  red:          '#dc2626',
  border:       '#dce6f5',
  borderLight:  '#e8f0fc',
  textPrimary:  '#0f1f3d',
  textSec:      '#475569',
  textMuted:    '#94a3b8',
}

// Level → small colour system
const LEVEL_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  Beginner:     { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
  Intermediate: { bg: '#fffbeb', border: '#fde68a', color: '#d97706' },
  Advanced:     { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  Manager:      { bg: '#eef2ff', border: '#c7d2fe', color: '#4f46e5' },
}

// Publication type → icon
const TYPE_ICON = (t: string | null) =>
  t === 'Article' ? FileText : BookOpen

// ────────────────────────────────────────────────────────────────────────
export default function LibraryClient({
  items,
  studentEmail,
}: {
  items: LibraryItem[]
  studentEmail: string
}) {
  // ── Filter / search state ─────────────────────────────────────────────
  const [q,            setQ]            = useState('')
  const [categoryFilt, setCategoryFilt] = useState<string>('')
  const [levelFilt,    setLevelFilt]    = useState<string>('')
  const [typeFilt,     setTypeFilt]     = useState<string>('')
  const [authorFilt,   setAuthorFilt]   = useState<string>('')

  // ── Modal state ───────────────────────────────────────────────────────
  const [openItem, setOpenItem] = useState<LibraryItem | null>(null)

  // Derive facet values from the actual data
  const categories = useMemo(
    () => Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[],
    [items],
  )
  const levels = useMemo(
    () => Array.from(new Set(items.map(i => i.level).filter(Boolean))) as string[],
    [items],
  )
  const types = useMemo(
    () => Array.from(new Set(items.map(i => i.publication_type).filter(Boolean))) as string[],
    [items],
  )
  const authors = useMemo(() => {
    const s = new Set<string>()
    items.forEach(i => i.author_team && s.add(i.author_team))
    return Array.from(s).sort()
  }, [items])

  // ── Apply filters ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase()
    return items.filter(i => {
      if (categoryFilt && i.category !== categoryFilt) return false
      if (levelFilt    && i.level    !== levelFilt)    return false
      if (typeFilt     && i.publication_type !== typeFilt) return false
      if (authorFilt   && i.author_team !== authorFilt) return false
      if (qLower) {
        const hay = [
          i.title, i.author_team, i.category, i.level, i.publication_type,
          (i.tags ?? []).join(' '), i.notes,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(qLower)) return false
      }
      return true
    })
  }, [items, q, categoryFilt, levelFilt, typeFilt, authorFilt])

  // Group by category for tidy section rendering when no active filter
  const grouped = useMemo(() => {
    const map: Record<string, LibraryItem[]> = {}
    for (const it of filtered) {
      const key = it.category || 'Uncategorised'
      if (!map[key]) map[key] = []
      map[key].push(it)
    }
    return map
  }, [filtered])

  const clearFilters = () => {
    setQ('')
    setCategoryFilt('')
    setLevelFilt('')
    setTypeFilt('')
    setAuthorFilt('')
  }

  const anyFilterActive = q || categoryFilt || levelFilt || typeFilt || authorFilt

  return (
    <div className="space-y-5 pb-12">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: T.navy }}>
          <LibraryIcon size={20} style={{ color: T.blue }} /> Library
        </h1>
        <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
          {items.length} curated resources across {categories.length} categories · books, articles &amp; research papers
        </p>
      </div>

      {/* ── Search + filters ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${T.border}` }}>
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textMuted }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by title, author, tag, topic…"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#f8fafc', border: `1px solid ${T.border}`, color: T.textPrimary }}
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} style={{ color: T.textMuted }} />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <SelectChip label="Category" value={categoryFilt} onChange={setCategoryFilt} options={categories} />
          <SelectChip label="Level"    value={levelFilt}    onChange={setLevelFilt}    options={levels} />
          <SelectChip label="Type"     value={typeFilt}     onChange={setTypeFilt}     options={types} />
          <SelectChip label="Author"   value={authorFilt}   onChange={setAuthorFilt}   options={authors} />
        </div>

        {anyFilterActive && (
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs" style={{ color: T.textSec }}>
              <strong>{filtered.length}</strong> of {items.length} resources
            </p>
            <button onClick={clearFilters}
              className="text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: T.blueLight, color: T.blue, border: `1px solid ${T.bluePale}` }}>
              <X size={11} /> Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Results ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center" style={{ border: `1px solid ${T.border}` }}>
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
            <Search size={18} style={{ color: T.blue }} />
          </div>
          <p className="font-semibold text-sm mb-1" style={{ color: T.textPrimary }}>No resources match your filters</p>
          <p className="text-xs" style={{ color: T.textMuted }}>Try clearing filters or a broader search term.</p>
        </div>
      ) : (
        // Grouped by category (natural default)
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, list]) => (
            <section key={cat}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: T.textSec }}>
                  {cat}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: T.indigoBg, color: T.indigo, border: `1px solid ${T.indigoBorder}` }}>
                  {list.length}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map(item => (
                  <LibraryCard key={item.id} item={item} onOpen={() => setOpenItem(item)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Reader modal ─────────────────────────────────────────── */}
      {openItem && (
        <LibraryReaderModal
          item={openItem}
          studentEmail={studentEmail}
          onClose={() => setOpenItem(null)}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
function SelectChip({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-3 pr-7 py-2 rounded-xl text-xs appearance-none outline-none cursor-pointer"
        style={{
          background: value ? T.indigoBg : '#ffffff',
          border: `1px solid ${value ? T.indigoBorder : T.border}`,
          color: value ? T.indigo : T.textSec,
          fontWeight: value ? 600 : 500,
        }}
      >
        <option value="">{label} · All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <Filter size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: value ? T.indigo : T.textMuted }} />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
function LibraryCard({ item, onOpen }: { item: LibraryItem; onOpen: () => void }) {
  const Icon  = TYPE_ICON(item.publication_type)
  const level = (item.level || '').trim()
  const ls    = LEVEL_STYLE[level] ?? { bg: T.blueLight, border: T.bluePale, color: T.blue }

  return (
    <button
      onClick={onOpen}
      className="group text-left bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
      style={{ border: `1px solid ${T.border}` }}
    >
      {/* Thumbnail / gradient header */}
      <div className="relative h-28 overflow-hidden"
        style={{
          background: item.thumbnail_url
            ? `url(${item.thumbnail_url}) center/cover`
            : `linear-gradient(135deg, ${T.indigo}22, ${T.purple}22)`,
        }}>
        {/* Fallback icon when no thumb */}
        {!item.thumbnail_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon size={36} style={{ color: T.indigo, opacity: 0.55 }} />
          </div>
        )}
        {/* Level pill (top-right) */}
        {level && (
          <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: ls.bg, color: ls.color, border: `1px solid ${ls.border}` }}>
            {level}
          </span>
        )}
        {/* Type pill (top-left) */}
        {item.publication_type && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: '#ffffffee', color: T.indigo, border: `1px solid ${T.border}` }}>
            <Icon size={10} /> {item.publication_type}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-bold text-sm leading-snug mb-1.5 line-clamp-2" style={{ color: T.textPrimary, minHeight: 38 }}>
          {item.title}
        </h3>

        {item.author_team && (
          <p className="text-xs mb-2 line-clamp-1 flex items-center gap-1" style={{ color: T.textSec }}>
            <User size={10} /> {item.author_team}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px]" style={{ color: T.textMuted }}>
          {item.pages    && <span>{item.pages} pages</span>}
          {item.rating   && (
            <span className="inline-flex items-center gap-0.5">
              <Star size={10} style={{ color: T.amber, fill: T.amber }} /> {Number(item.rating).toFixed(1)}
            </span>
          )}
          {item.file_size_mb && <span>{Number(item.file_size_mb).toFixed(1)} MB</span>}
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: T.indigoBg, color: T.indigo }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Secure reader modal
// ────────────────────────────────────────────────────────────────────────
function LibraryReaderModal({
  item, studentEmail, onClose,
}: { item: LibraryItem; studentEmail: string; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false)

  // Raw PDF bytes are served by the auth-gated stream proxy; PdfViewer fetches
  // them and renders each page to a <canvas> in a scrollable list. This
  // replaces the old <iframe> + native PDF plugin, which on mobile (iOS
  // Safari) showed only page 1 and would not scroll. setLoaded(true) fires
  // once page 1 renders → the watermark overlay appears over the content.
  const streamSrc = `/api/student/library/stream/${item.id}`

  // ── Close on Esc + soft-block save/print shortcuts ───────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }

      const isCtrl = e.ctrlKey || e.metaKey
      if (!isCtrl) return
      const k = e.key.toLowerCase()
      if (k === 's' || k === 'p') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', onKey, { capture: true })

    // Lock body scroll while modal is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey, { capture: true } as any)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  // Dynamic watermark text — repeated diagonally
  const watermarkText = `${studentEmail} · oStaran · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3"
      style={{ background: 'rgba(4, 8, 20, 0.86)', backdropFilter: 'blur(4px)' }}
      onContextMenu={e => e.preventDefault()}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0b1426', border: `1px solid ${T.border}44` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-start md:items-center gap-3 px-4 py-3 border-b flex-col md:flex-row"
          style={{ background: '#0f1f3d', borderColor: '#1e2a4a' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(79,70,229,0.4)' }}>
            {item.publication_type === 'Article'
              ? <FileText size={16} className="text-indigo-300" />
              : <BookOpen  size={16} className="text-indigo-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white line-clamp-1">{item.title}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-300">
              {item.author_team    && <span>{item.author_team}</span>}
              {item.level          && <span>· {item.level}</span>}
              {item.publication_type && <span>· {item.publication_type}</span>}
              {item.pages          && <span>· {item.pages} pages</span>}
            </div>
          </div>
          <button onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold self-end md:self-auto"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)' }}>
            <X size={12} /> Close
          </button>
        </div>

        {/* Warning strip */}
        <div className="px-4 py-2 text-[11px] flex items-center gap-2"
          style={{ background: '#0e1a33', color: '#94a3b8', borderBottom: '1px solid #1e2a4a' }}>
          <Lock size={11} style={{ color: '#c7d2fe' }} />
          <span>
            Private to you. Views are logged. Redistribution of this material is not permitted and may result in loss of library access.
          </span>
        </div>

        {/* Viewer (pdf.js canvas — scrollable on every device) + watermark */}
        <div className="relative flex-1 overflow-hidden" style={{ background: '#0b1426' }}>
          <PdfViewer src={streamSrc} onReady={() => setLoaded(true)} />

          {/* Watermark overlay — pointer-events:none so it doesn't block viewer */}
          {loaded && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-20 opacity-[0.12] select-none"
                style={{ transform: 'rotate(-30deg)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="whitespace-nowrap text-xs md:text-sm font-bold tracking-wider"
                    style={{ color: '#ffffff' }}>
                    {watermarkText}  ·  {watermarkText}  ·  {watermarkText}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
