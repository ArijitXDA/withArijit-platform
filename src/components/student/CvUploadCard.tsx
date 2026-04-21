'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText, Upload, Loader2, CheckCircle2, AlertCircle, Eye, Download, ArrowRight,
} from 'lucide-react'

// ────────────────────────────────────────────────────────────────────────────
// CvUploadCard — self-contained CV upload / view / re-upload widget.
// Used on /dashboard/career (Resume Repository) and can be embedded elsewhere.
//
// Props:
//   initialCvPath  — current student_profiles.cv_url (storage path or legacy URL)
//   onChange       — called after a successful upload with the new path
//   variant        — 'card' (default, full card) | 'inline' (compact row, no header)
//   showStructuredFormCta — when true, shows a secondary link to /resume/apply
// ────────────────────────────────────────────────────────────────────────────

interface Props {
  initialCvPath?: string | null
  onChange?: (path: string | null) => void
  variant?: 'card' | 'inline'
  showStructuredFormCta?: boolean
  className?: string
}

const T = {
  navy: '#0f1f3d',
  blue: '#2563eb',
  blueLight: '#eff6ff',
  bluePale: '#dbeafe',
  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
  purpleBorder: '#ddd6fe',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  greenBorder: '#bbf7d0',
  red: '#dc2626',
  redBg: '#fef2f2',
  redBorder: '#fecaca',
  textPrimary: '#0f1f3d',
  textSec: '#475569',
  textMuted: '#94a3b8',
  border: '#dce6f5',
}

const ACCEPT =
  'application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx'

export default function CvUploadCard({
  initialCvPath,
  onChange,
  variant = 'card',
  showStructuredFormCta = true,
  className = '',
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [cvPath, setCvPath] = useState<string | null>(initialCvPath ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Keep in sync if parent replaces initialCvPath
  useEffect(() => {
    setCvPath(initialCvPath ?? null)
  }, [initialCvPath])

  const hasCv = !!cvPath

  // Derive a nice extension label
  const ext = hasCv
    ? (cvPath!.split('?')[0].split('.').pop() ?? '').toUpperCase()
    : ''

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    setError(null); setSuccess(false); setUploading(true)

    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await fetch('/api/student/cv/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      setCvPath(data.path)
      setSuccess(true)
      onChange?.(data.path)
      setTimeout(() => setSuccess(false), 3500)
    } catch (e: any) {
      setError(e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [onChange])

  const openFilePicker = () => fileRef.current?.click()

  const viewHref     = '/api/student/cv/download?redirect=1'
  const downloadHref = '/api/student/cv/download?redirect=1&disposition=attachment'

  // ── Inline variant — compact row ──────────────────────────────────────
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {hasCv ? (
          <>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: T.purpleBg, border: `1px solid ${T.purpleBorder}` }}>
              <FileText size={16} style={{ color: T.purple }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>
                CV on file {ext && <span className="text-xs" style={{ color: T.textMuted }}>· {ext}</span>}
              </p>
              <div className="flex gap-3 text-xs mt-0.5">
                <a href={viewHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline" style={{ color: T.blue }}>
                  <Eye size={11} /> View
                </a>
                <a href={downloadHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline" style={{ color: T.blue }}>
                  <Download size={11} /> Download
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 text-sm" style={{ color: T.textMuted }}>No CV uploaded yet</div>
        )}
        <button onClick={openFilePicker} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
          style={{ background: T.purpleBg, color: T.purple, border: `1px solid ${T.purpleBorder}` }}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading…' : hasCv ? 'Replace' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)} />
        {error && (
          <p className="text-xs flex items-center gap-1" style={{ color: T.red }}>
            <AlertCircle size={12} /> {error}
          </p>
        )}
        {success && (
          <p className="text-xs flex items-center gap-1" style={{ color: T.green }}>
            <CheckCircle2 size={12} /> Updated
          </p>
        )}
      </div>
    )
  }

  // ── Full card variant ──────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl bg-white p-6 ${className}`} style={{ border: `1px solid ${T.border}` }}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: T.purpleBg, border: `1px solid ${T.purpleBorder}` }}>
          <FileText size={18} style={{ color: T.purple }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm mb-1" style={{ color: T.textPrimary }}>Resume Repository</h3>
          <p className="text-sm" style={{ color: T.textSec }}>
            Keep your resume on file so hiring partners can discover you and so we can tailor course recommendations.
          </p>
        </div>
      </div>

      {/* Status row */}
      {hasCv ? (
        <div className="flex items-center gap-3 p-3 rounded-xl mb-4"
          style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
          <CheckCircle2 size={16} style={{ color: T.green }} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: T.textPrimary }}>
              Resume on file {ext && <span className="text-xs font-normal" style={{ color: T.textMuted }}>· {ext}</span>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a href={viewHref} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'white', color: T.blue, border: `1px solid ${T.bluePale}` }}>
              <Eye size={11} /> View
            </a>
            <a href={downloadHref} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'white', color: T.blue, border: `1px solid ${T.bluePale}` }}>
              <Download size={11} /> Download
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-xl mb-4"
          style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
          <AlertCircle size={16} style={{ color: T.blue }} className="shrink-0" />
          <p className="text-sm" style={{ color: T.textSec }}>
            You haven&apos;t uploaded a resume yet.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={openFilePicker} disabled={uploading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
          style={{ background: T.purple, color: 'white' }}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? 'Uploading…' : hasCv ? 'Replace resume' : 'Upload resume'}
        </button>

        {showStructuredFormCta && (
          <Link href="/resume/apply"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: T.blueLight, color: T.blue, border: `1px solid ${T.bluePale}` }}>
            Use the detailed form <ArrowRight size={14} />
          </Link>
        )}
      </div>

      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)} />

      <p className="text-xs mt-3" style={{ color: T.textMuted }}>
        Accepted formats: PDF, DOC, DOCX. Max 10 MB. Your resume stays private — only you and oStaran staff can access it.
      </p>

      {/* Feedback */}
      {error && (
        <div className="mt-3 p-3 rounded-xl flex items-center gap-2"
          style={{ background: T.redBg, border: `1px solid ${T.redBorder}` }}>
          <AlertCircle size={14} style={{ color: T.red }} />
          <p className="text-sm" style={{ color: T.red }}>{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-3 p-3 rounded-xl flex items-center gap-2"
          style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
          <CheckCircle2 size={14} style={{ color: T.green }} />
          <p className="text-sm" style={{ color: T.green }}>Resume updated successfully.</p>
        </div>
      )}
    </div>
  )
}
