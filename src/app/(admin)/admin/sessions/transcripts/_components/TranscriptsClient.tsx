'use client'
import { useState, useRef, useCallback } from 'react'
import {
  Upload, CheckCircle2, AlertTriangle, FileText,
  Loader2, Trash2, RefreshCw, ChevronDown,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Batch {
  id:               string
  batch_code:       string
  label:            string
  day_of_week:      string
  start_time:       string
  start_date:       string
  session_batch_id: string | null
  course:           { id: string; name: string; short_name: string | null } | null
}

interface Transcript {
  id:             string
  batch_id:       string
  session_number: number
  session_date:   string | null
  summary:        string | null
  key_topics:     string[] | null
  word_count:     number | null
  uploaded_by:    string | null
  created_at:     string
  updated_at:     string
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// ═════════════════════════════════════════════════════════════════════════════
export default function TranscriptsClient({
  batches,
  existingTranscripts,
}: {
  batches:              Batch[]
  existingTranscripts:  Transcript[]
}) {
  const [selectedBatchId, setSelectedBatchId]     = useState<string>('')
  const [sessionNumber,   setSessionNumber]        = useState<number>(1)
  const [sessionDate,     setSessionDate]          = useState<string>('')
  const [file,            setFile]                 = useState<File | null>(null)
  const [generateSummary, setGenerateSummary]      = useState<boolean>(true)
  const [uploadStatus,    setUploadStatus]         = useState<UploadStatus>('idle')
  const [uploadMessage,   setUploadMessage]        = useState<string>('')
  const [transcripts,     setTranscripts]          = useState<Transcript[]>(existingTranscripts)
  const [dragOver,        setDragOver]             = useState<boolean>(false)
  const [filterBatchId,   setFilterBatchId]        = useState<string>('all')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedBatch = batches.find(b => b.id === selectedBatchId)
  const batchId       = selectedBatch?.session_batch_id ?? selectedBatch?.batch_code ?? ''

  // Filtered transcript list
  const filteredTranscripts = filterBatchId === 'all'
    ? transcripts
    : transcripts.filter(t => {
        const batch = batches.find(b => (b.session_batch_id ?? b.batch_code) === t.batch_id)
        return batch?.id === filterBatchId
      })

  // Batch label for a given batch_id
  function batchLabel(batchId: string) {
    const b = batches.find(b => (b.session_batch_id ?? b.batch_code) === batchId)
    return b?.label ?? batchId
  }

  // Drag and drop
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.name.endsWith('.txt') || dropped.name.endsWith('.vtt'))) {
      setFile(dropped)
    }
  }, [])

  async function handleUpload() {
    if (!selectedBatchId || !sessionNumber || !file || !batchId) return

    setUploadStatus('uploading')
    setUploadMessage('Uploading transcript…')

    try {
      const formData = new FormData()
      formData.append('file',            file)
      formData.append('batch_id',        batchId)
      formData.append('session_number',  String(sessionNumber))
      formData.append('session_date',    sessionDate)
      formData.append('course_id',       selectedBatch?.course?.id ?? '')
      formData.append('generate_summary', generateSummary ? '1' : '0')

      const res  = await fetch('/api/admin/transcripts/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      setUploadStatus('success')
      setUploadMessage(generateSummary
        ? `✅ Transcript uploaded & AI summary generated (${data.word_count?.toLocaleString()} words)`
        : `✅ Transcript uploaded (${data.word_count?.toLocaleString()} words)`
      )

      // Add to local list
      setTranscripts(prev => {
        const filtered = prev.filter(t => !(t.batch_id === batchId && t.session_number === sessionNumber))
        return [...filtered, data.transcript].sort((a, b) =>
          a.batch_id === b.batch_id ? a.session_number - b.session_number : a.batch_id.localeCompare(b.batch_id)
        )
      })

      // Reset form
      setFile(null)
      setSessionDate('')
      if (fileInputRef.current) fileInputRef.current.value = ''

    } catch (err: any) {
      setUploadStatus('error')
      setUploadMessage(err.message)
    }
  }

  async function handleDelete(transcriptId: string) {
    if (!confirm('Delete this transcript? Class Monitor will no longer be able to reference this session.')) return
    try {
      const res = await fetch(`/api/admin/transcripts/${transcriptId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setTranscripts(prev => prev.filter(t => t.id !== transcriptId))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const canUpload = selectedBatchId && sessionNumber >= 1 && file && batchId

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Session Transcripts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload <code className="bg-gray-100 px-1 rounded text-xs">.txt</code> or{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">.vtt</code> transcripts from your Sunday sessions.
          Class Monitor reads these to answer students' questions about past sessions.
        </p>
      </div>

      {/* ── Format guide ──────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
        <p className="font-bold mb-1.5">📄 Accepted formats</p>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-semibold text-blue-700">.txt (recommended)</p>
            <p className="text-blue-600 mt-0.5">Plain text — paste or export the transcript, remove timestamps if possible. Fastest for Class Monitor to read.</p>
          </div>
          <div>
            <p className="font-semibold text-blue-700">.vtt (Teams / Zoom auto-caption)</p>
            <p className="text-blue-600 mt-0.5">WebVTT format exported directly from Teams or Zoom. Timestamps and speaker labels are auto-stripped on upload.</p>
          </div>
        </div>
        <p className="text-xs text-blue-500 mt-2">
          <strong>Where to get it:</strong> Microsoft Teams → Recording → Three-dot menu → Download transcript (.vtt). Zoom → Recordings → Download → Transcript (.vtt).
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* ── Upload form ────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="font-bold text-gray-900">Upload Transcript</h2>

          {/* Batch selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Batch *</label>
            <div className="relative">
              <select
                value={selectedBatchId}
                onChange={e => { setSelectedBatchId(e.target.value); setUploadStatus('idle') }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8"
              >
                <option value="">Select a batch…</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.label} — {b.course?.short_name ?? b.course?.name ?? 'Unknown Course'}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {selectedBatch && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedBatch.course?.name} · {selectedBatch.day_of_week} · {fmtTime(selectedBatch.start_time)} IST · Started {fmtDate(selectedBatch.start_date)}
              </p>
            )}
            {selectedBatch && !selectedBatch.session_batch_id && (
              <p className="text-xs text-amber-600 mt-1">⚠️ This batch has no <code>session_batch_id</code> set — transcript will use batch_code instead.</p>
            )}
          </div>

          {/* Session number + date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Session Number *</label>
              <input
                type="number" min={1} max={52} value={sessionNumber}
                onChange={e => { setSessionNumber(parseInt(e.target.value) || 1); setUploadStatus('idle') }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Session Date</label>
              <input
                type="date" value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Already uploaded? Show warning */}
          {batchId && transcripts.some(t => t.batch_id === batchId && t.session_number === sessionNumber) && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertTriangle size={13} />
              Session {sessionNumber} already has a transcript — uploading will replace it.
            </div>
          )}

          {/* File drop zone */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Transcript File *</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all"
              style={{
                borderColor: dragOver ? '#6366f1' : file ? '#22c55e' : '#d1d5db',
                background:  dragOver ? '#eef2ff' : file ? '#f0fdf4' : '#fafafa',
              }}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={18} className="text-green-600" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-green-700">{file.name}</p>
                    <p className="text-xs text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Drag & drop or click to select</p>
                  <p className="text-xs text-gray-400 mt-1">.txt or .vtt · max 50 MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.vtt,text/plain,text/vtt"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) { setFile(f); setUploadStatus('idle') }
                }}
              />
            </div>
            {file && (
              <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="text-xs text-gray-400 hover:text-red-500 mt-1 transition-colors">
                ✕ Remove file
              </button>
            )}
          </div>

          {/* AI summary option */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={generateSummary} onChange={e => setGenerateSummary(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded" />
            <div>
              <p className="text-xs font-semibold text-gray-700">Generate AI summary & extract key topics</p>
              <p className="text-xs text-gray-400">Uses Claude to summarise the session and identify topics. Adds ~5 seconds.</p>
            </div>
          </label>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!canUpload || uploadStatus === 'uploading'}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            {uploadStatus === 'uploading'
              ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
              : <><Upload size={16} /> Upload Transcript</>
            }
          </button>

          {/* Status message */}
          {uploadMessage && (
            <div className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 ${
              uploadStatus === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : uploadStatus === 'error'
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {uploadStatus === 'success' ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                : uploadStatus === 'error' ? <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                : <Loader2 size={13} className="animate-spin mt-0.5 shrink-0" />}
              {uploadMessage}
            </div>
          )}
        </div>

        {/* ── Right: stats + tips ────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Stats */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Transcript Coverage</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <p className="text-2xl font-black text-indigo-700">{transcripts.length}</p>
                <p className="text-xs text-indigo-500 font-semibold mt-0.5">Transcripts Uploaded</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-green-50 border border-green-100">
                <p className="text-2xl font-black text-green-700">
                  {transcripts.filter(t => t.summary).length}
                </p>
                <p className="text-xs text-green-500 font-semibold mt-0.5">With AI Summary</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-purple-50 border border-purple-100">
                <p className="text-2xl font-black text-purple-700">{batches.length}</p>
                <p className="text-xs text-purple-500 font-semibold mt-0.5">Active Batches</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-2xl font-black text-amber-700">
                  {transcripts.reduce((s, t) => s + (t.word_count ?? 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-amber-500 font-semibold mt-0.5">Total Words</p>
              </div>
            </div>
          </div>

          {/* How Class Monitor uses transcripts */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm mb-3">How Class Monitor uses these</h3>
            <div className="space-y-3 text-xs text-gray-600">
              {[
                ['🔍', 'Student asks about a past session', 'Class Monitor fetches the transcript and answers from the actual session content'],
                ['🧠', 'Detailed concept questions', 'If a student says "explain what Arijit said about RAG in session 7", Class Monitor reads session 7\'s transcript'],
                ['📋', 'AI summary shown first', 'The AI-generated summary gives a quick overview; full content used for detailed questions'],
                ['⚡', 'Falls back gracefully', 'If no transcript exists, Class Monitor uses the session title and its own AI knowledge'],
              ].map(([emoji, title, desc]) => (
                <div key={title as string} className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">{emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-700">{title}</p>
                    <p className="text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Uploaded transcripts list ──────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="font-bold text-gray-900">Uploaded Transcripts ({filteredTranscripts.length})</h2>
          <div className="flex items-center gap-2">
            <select
              value={filterBatchId}
              onChange={e => setFilterBatchId(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none"
            >
              <option value="all">All batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <button
              onClick={() => window.location.reload()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {filteredTranscripts.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No transcripts uploaded yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload your first session transcript using the form above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTranscripts.map(t => (
              <div key={t.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3 min-w-0">

                  {/* Session number badge */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black"
                    style={{ background: '#eef2ff', color: '#4f46e5' }}>
                    S{t.session_number}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">
                        Session {t.session_number}
                        {t.session_date && ` — ${fmtDate(t.session_date)}`}
                      </p>
                      {t.summary && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          AI Summary ✓
                        </span>
                      )}
                      {t.word_count && (
                        <span className="text-[10px] text-gray-400">
                          {t.word_count.toLocaleString()} words
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-0.5">{batchLabel(t.batch_id)}</p>

                    {t.key_topics && t.key_topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {t.key_topics.slice(0, 5).map(topic => (
                          <span key={topic} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {topic}
                          </span>
                        ))}
                        {t.key_topics.length > 5 && (
                          <span className="text-[10px] text-gray-400">+{t.key_topics.length - 5} more</span>
                        )}
                      </div>
                    )}

                    {t.summary && (
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{t.summary}</p>
                    )}

                    <p className="text-[10px] text-gray-400 mt-1">
                      Uploaded {fmtDate(t.created_at)}{t.uploaded_by ? ` by ${t.uploaded_by}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(t.id)}
                  className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete transcript"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
