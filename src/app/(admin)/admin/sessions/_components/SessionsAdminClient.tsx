'use client'
import { useState, useCallback, useMemo } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Batch {
  id: string
  batch_code: string
  label: string
  day_of_week: string
  start_time: string
  start_date: string
  duration_mins: number
  course: { id: string; name: string; short_name: string | null } | null
}

interface SessionRow {
  session_number: number
  session_title: string
  recording_link: string
  study_material_link: string
  meeting_link: string
  notes: string
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  saveError: string
  dirty: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function addWeeks(startDate: string, weeks: number): string {
  const d = new Date(startDate + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

function isDatePast(dateStr: string) { return dateStr < new Date().toISOString().split('T')[0] }
function isDateToday(dateStr: string) { return dateStr === new Date().toISOString().split('T')[0] }

function blankSessions(): SessionRow[] {
  return Array.from({ length: 26 }, (_, i) => ({
    session_number: i + 1,
    session_title: '', recording_link: '',
    study_material_link: '', meeting_link: '', notes: '',
    saveState: 'idle', saveError: '', dirty: false,
  }))
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SessionsAdminClient({ batches }: { batches: Batch[] }) {
  const [selectedId, setSelectedId] = useState<string>(batches[0]?.id ?? '')
  const [rows, setRows]             = useState<SessionRow[]>(blankSessions())
  const [loading, setLoading]       = useState(false)
  const [loadErr, setLoadErr]       = useState('')
  const [expanded, setExpanded]     = useState<Set<number>>(new Set())
  const [search, setSearch]         = useState('')

  const batch = useMemo(() => batches.find(b => b.id === selectedId) ?? null, [batches, selectedId])

  // Load saved links for a batch from the API
  const loadBatch = useCallback(async (batchId: string) => {
    setLoading(true); setLoadErr(''); setRows(blankSessions()); setExpanded(new Set())
    try {
      const res  = await fetch(`/api/admin/session-links?batch_id=${batchId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Load failed')
      const saved: any[] = json.links ?? []
      setRows(prev => prev.map(r => {
        const found = saved.find(l => l.session_number === r.session_number)
        if (!found) return r
        return {
          ...r,
          session_title:       found.session_title       ?? '',
          recording_link:      found.recording_link      ?? '',
          study_material_link: found.study_material_link ?? '',
          meeting_link:        found.meeting_link        ?? '',
          notes:               found.notes               ?? '',
          dirty: false,
        }
      }))
    } catch (e: any) { setLoadErr(e.message) }
    finally { setLoading(false) }
  }, [])

  function onBatchChange(id: string) { setSelectedId(id); loadBatch(id) }

  function setField(num: number, field: keyof SessionRow, val: string) {
    setRows(prev => prev.map(r =>
      r.session_number === num ? { ...r, [field]: val, dirty: true, saveState: 'idle', saveError: '' } : r
    ))
  }

  async function saveRow(num: number) {
    const r = rows.find(x => x.session_number === num)
    if (!r) return
    setRows(prev => prev.map(x => x.session_number === num ? { ...x, saveState: 'saving' } : x))
    try {
      const res = await fetch('/api/admin/session-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: selectedId, session_number: num,
          session_title: r.session_title, recording_link: r.recording_link,
          study_material_link: r.study_material_link, meeting_link: r.meeting_link,
          notes: r.notes,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      setRows(prev => prev.map(x => x.session_number === num ? { ...x, saveState: 'saved', dirty: false } : x))
      setTimeout(() => {
        setRows(prev => prev.map(x => x.session_number === num && x.saveState === 'saved' ? { ...x, saveState: 'idle' } : x))
      }, 3000)
    } catch (e: any) {
      setRows(prev => prev.map(x => x.session_number === num ? { ...x, saveState: 'error', saveError: e.message } : x))
    }
  }

  function toggle(n: number) {
    setExpanded(prev => { const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s })
  }

  // Derived
  const savedCount = rows.filter(r => r.recording_link || r.meeting_link || r.study_material_link).length
  const dirtyCount = rows.filter(r => r.dirty).length
  const visible    = search.trim()
    ? rows.filter(r => String(r.session_number).includes(search) || r.session_title.toLowerCase().includes(search.toLowerCase()))
    : rows

  // Group batches by course name for <optgroup>
  const groups = useMemo(() => {
    const map: Record<string, Batch[]> = {}
    for (const b of batches) { const k = b.course?.name ?? 'Other'; (map[k] ??= []).push(b) }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [batches])

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Paste recording links, study materials and live meeting links per session.
            Students see them immediately after you save.
          </p>
        </div>
        {dirtyCount > 0 && (
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            ⚠ {dirtyCount} unsaved change{dirtyCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Batch selector ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Select Batch
            </label>
            <select
              value={selectedId}
              onChange={e => onBatchChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {groups.map(([courseName, bList]) => (
                <optgroup key={courseName} label={courseName}>
                  {bList.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {batch && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>📅 Starts <strong>{fmtDate(batch.start_date)}</strong></span>
              <span>🕐 <strong>{batch.day_of_week}</strong> {fmtTime(batch.start_time)} IST</span>
              <span className="text-green-600">✓ <strong>{savedCount}</strong>/26 with links</span>
            </div>
          )}
        </div>

        {loadErr && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            ⚠ {loadErr}
          </div>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Sessions with links</span>
            <span>{savedCount} / 26</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round((savedCount / 26) * 100)}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
          </div>
        </div>
      </div>

      {/* ── Session rows ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 flex-wrap">
          <span className="text-gray-300">🔍</span>
          <input
            type="text" placeholder="Search sessions…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm text-gray-700 bg-transparent outline-none flex-1 min-w-32 placeholder:text-gray-300"
          />
          <div className="flex items-center gap-2 ml-auto text-xs">
            <button onClick={() => setExpanded(new Set(Array.from({length:26},(_,i)=>i+1)))}
              className="text-indigo-600 hover:text-indigo-800 font-medium">Expand all</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => setExpanded(new Set())}
              className="text-gray-500 hover:text-gray-700 font-medium">Collapse all</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
            <span className="animate-spin">⟳</span> Loading…
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visible.map(r => {
              if (!batch) return null
              const date  = addWeeks(batch.start_date, r.session_number - 1)
              const past  = isDatePast(date)
              const today = isDateToday(date)
              const open  = expanded.has(r.session_number)
              const hasLinks = !!(r.recording_link || r.meeting_link || r.study_material_link)

              return (
                <div key={r.session_number}
                  className={today ? 'bg-green-50/50' : past ? 'bg-gray-50/30' : ''}>

                  {/* Row header */}
                  <div className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                    onClick={() => toggle(r.session_number)}>

                    {/* Number badge */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      today ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                            : past ? 'bg-purple-50 text-purple-600'
                                   : 'bg-gray-100 text-gray-400'
                    }`}>
                      {r.session_number}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">
                          {r.session_title || `Session ${r.session_number}`}
                        </span>
                        {today && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700 animate-pulse">TODAY</span>}
                        {r.dirty && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Unsaved</span>}
                        {r.saveState === 'saved' && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">✓ Saved</span>}
                        {r.saveState === 'error' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500">{r.saveError}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(date)} · {fmtTime(batch.start_time)} IST
                        {past && !today && <span className="ml-1 text-purple-400">· Completed</span>}
                        {!past && !today && <span className="ml-1 text-blue-400">· Upcoming</span>}
                      </p>
                    </div>

                    {/* Link chips */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.recording_link      && <span title="Recording"     className="w-6 h-6 rounded bg-purple-50 flex items-center justify-center text-xs">🎬</span>}
                      {r.study_material_link && <span title="Study material" className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center text-xs">📄</span>}
                      {r.meeting_link        && <span title="Meeting link"   className="w-6 h-6 rounded bg-green-50  flex items-center justify-center text-xs">🔗</span>}
                      <span className="text-gray-300 ml-1 text-sm">{open ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded edit panel */}
                  {open && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-white">
                      <div className="grid md:grid-cols-2 gap-4 mt-2">

                        {/* Session Title */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">
                            Session Title <span className="font-normal text-gray-400">(optional — overrides "Session N" in student dashboard)</span>
                          </label>
                          <input type="text" value={r.session_title}
                            onChange={e => setField(r.session_number, 'session_title', e.target.value)}
                            placeholder="e.g. Python Functions & Decorators"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
                          />
                        </div>

                        {/* Recording Link */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">
                            🎬 Recording Link <span className="font-normal text-gray-400">SharePoint / Drive / YouTube</span>
                          </label>
                          <input type="url" value={r.recording_link}
                            onChange={e => setField(r.session_number, 'recording_link', e.target.value)}
                            placeholder="https://staranalytix-my.sharepoint.com/..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-gray-300"
                          />
                          {r.recording_link && (
                            <a href={r.recording_link} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-purple-500 hover:underline mt-1 inline-block">▶ Test link ↗</a>
                          )}
                        </div>

                        {/* Study Materials */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">
                            📄 Study Material Link <span className="font-normal text-gray-400">PDF / Notion / Slides</span>
                          </label>
                          <input type="url" value={r.study_material_link}
                            onChange={e => setField(r.session_number, 'study_material_link', e.target.value)}
                            placeholder="https://..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
                          />
                          {r.study_material_link && (
                            <a href={r.study_material_link} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-indigo-500 hover:underline mt-1 inline-block">📄 Test link ↗</a>
                          )}
                        </div>

                        {/* Live Meeting Link */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">
                            🔗 Live Meeting Link <span className="font-normal text-gray-400">Teams / Zoom — for upcoming sessions</span>
                          </label>
                          <input type="url" value={r.meeting_link}
                            onChange={e => setField(r.session_number, 'meeting_link', e.target.value)}
                            placeholder="https://teams.microsoft.com/..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 placeholder:text-gray-300"
                          />
                          {r.meeting_link && (
                            <a href={r.meeting_link} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-green-500 hover:underline mt-1 inline-block">🔗 Test link ↗</a>
                          )}
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">
                            📝 Internal Notes <span className="font-normal text-gray-400">not shown to students</span>
                          </label>
                          <input type="text" value={r.notes}
                            onChange={e => setField(r.session_number, 'notes', e.target.value)}
                            placeholder="e.g. Covered extra content from session 4"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300"
                          />
                        </div>
                      </div>

                      {/* Save */}
                      <div className="mt-4 flex items-center gap-3">
                        <button onClick={() => saveRow(r.session_number)}
                          disabled={r.saveState === 'saving'}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                          style={{ background: r.saveState === 'saved' ? '#16a34a' : '#6366f1' }}>
                          {r.saveState === 'saving' ? '⟳ Saving…'
                           : r.saveState === 'saved' ? '✓ Saved!'
                           : `Save Session ${r.session_number}`}
                        </button>
                        {r.saveState === 'error' && (
                          <p className="text-xs text-red-500">⚠ {r.saveError}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">
        Each session saves independently. Students see recordings immediately after you hit Save.
        Meeting links appear as a "Join →" button for upcoming sessions on the student dashboard.
      </p>
    </div>
  )
}
