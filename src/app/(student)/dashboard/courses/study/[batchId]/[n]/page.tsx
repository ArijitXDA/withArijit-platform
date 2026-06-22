import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import PrintButton from './PrintButton'

// ── Minimal, dependency-free markdown → HTML (study guides only) ─────────────
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function inline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}
function mdToHtml(md: string): string {
  const out: string[] = []
  let inList = false, inCode = false
  for (const line of md.split('\n')) {
    if (line.trim().startsWith('```')) {
      if (inCode) { out.push('</code></pre>'); inCode = false }
      else { out.push('<pre class="code"><code>'); inCode = true }
      continue
    }
    if (inCode) { out.push(esc(line)); continue }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true }
      out.push('<li>' + inline(esc(line.replace(/^\s*[-*]\s+/, ''))) + '</li>')
      continue
    }
    if (inList) { out.push('</ul>'); inList = false }
    const h = line.match(/^(#{1,4})\s+(.*)/)
    if (h) { out.push(`<h${h[1].length}>${inline(esc(h[2]))}</h${h[1].length}>`); continue }
    if (line.trim() === '') continue
    out.push('<p>' + inline(esc(line)) + '</p>')
  }
  if (inList) out.push('</ul>')
  if (inCode) out.push('</code></pre>')
  return out.join('\n')
}

export default async function StudyPage({ params }: { params: Promise<{ batchId: string; n: string }> }) {
  const { batchId, n } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/signin')

  const service = createServiceClient()

  // Enrolment gate — must be actively enrolled in this batch.
  const { data: enrolment } = await service
    .from('student_enrolments')
    .select('id, course:course_id(name)')
    .eq('student_email', user.email)
    .eq('batch_id', batchId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (!enrolment) redirect('/dashboard/courses')

  const { data: link } = await service
    .from('awa_session_links')
    .select('session_title, study_material_md')
    .eq('batch_id', batchId)
    .eq('session_number', Number(n))
    .maybeSingle()

  const courseName = (enrolment as any).course?.name ?? 'Your course'
  const title = link?.session_title ?? `Session ${n}`
  const md    = link?.study_material_md ?? ''

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="flex items-center justify-between gap-3 mb-4 no-print">
        <Link href="/dashboard/courses" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#2563eb' }}>
          <ChevronLeft size={15} /> Back to Courses
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl bg-white p-6 md:p-8" style={{ border: '1px solid #dce6f5' }}>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7c3aed' }}>{courseName} · Study Notes</p>
        <h1 className="text-2xl font-extrabold mt-1 mb-6" style={{ color: '#0f1f3d' }}>{title}</h1>
        {md
          ? <article className="study-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(md) }} />
          : <p className="text-sm" style={{ color: '#64748b' }}>Study notes for this session are being prepared and will appear here shortly.</p>}
      </div>

      <style>{`
        .study-prose h1,.study-prose h2,.study-prose h3,.study-prose h4{font-weight:800;color:#0f1f3d;margin:1.2em 0 .4em}
        .study-prose h2{font-size:1.25rem}.study-prose h3{font-size:1.05rem}
        .study-prose p{margin:.6em 0;line-height:1.7;color:#334155}
        .study-prose ul{margin:.5em 0 .5em 1.2em;list-style:disc}
        .study-prose li{margin:.3em 0;line-height:1.6;color:#334155}
        .study-prose code{background:#f1f5f9;padding:.1em .35em;border-radius:4px;font-size:.9em}
        .study-prose pre.code{background:#0f1f3d;color:#e2e8f0;padding:1em;border-radius:10px;overflow:auto;margin:.8em 0}
        .study-prose pre.code code{background:none;color:inherit}
        @media print { .no-print{display:none!important} aside, header { display:none!important } }
      `}</style>
    </div>
  )
}
