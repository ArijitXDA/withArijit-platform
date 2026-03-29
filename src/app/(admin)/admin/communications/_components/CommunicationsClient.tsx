'use client'
import { useState } from 'react'
import {
  Send, CheckCircle, AlertCircle, Loader2, MessageSquare,
  Megaphone, RefreshCw, ChevronDown, ChevronUp, Clock, Users
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function fmtTs(ts: string) {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Status pill ───────────────────────────────────────────────────────────────
function Pill({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    green:  'bg-green-500/15 text-green-400 border-green-500/20',
    red:    'bg-red-500/15 text-red-400 border-red-500/20',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    blue:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
    gray:   'bg-gray-500/15 text-gray-400 border-gray-500/20',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  )
}

// ── Section card ─────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color, children, defaultOpen = true }: {
  title: string; icon: any; color: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-gray-700 overflow-hidden bg-gray-800/50">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-700/30 transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color }} />
          <span className="font-semibold text-white text-sm">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-700/60">{children}</div>}
    </div>
  )
}

// ── Trigger button ────────────────────────────────────────────────────────────
function TriggerButton({ label, campaign, payload, variant = 'default', disabled = false }: {
  label: string; campaign: string; payload: any; variant?: 'default' | 'danger' | 'success'; disabled?: boolean
}) {
  const [state, setState] = useState<'idle'|'loading'|'done'|'error'>('idle')
  const [msg, setMsg] = useState('')

  async function fire() {
    setState('loading'); setMsg('')
    try {
      const res = await fetch('/api/admin/comms/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setState('done')
      setMsg(`✓ Sent ${data.sent ?? 0} · Failed ${data.failed ?? 0} · Skipped ${data.skipped ?? 0}`)
      setTimeout(() => setState('idle'), 8000)
    } catch (e: any) {
      setState('error'); setMsg(e.message)
      setTimeout(() => setState('idle'), 8000)
    }
  }

  const variantStyle = {
    default: 'bg-indigo-600 hover:bg-indigo-500',
    danger:  'bg-amber-600 hover:bg-amber-500',
    success: 'bg-green-600 hover:bg-green-500',
  }[variant]

  return (
    <div className="space-y-1">
      <button
        onClick={fire}
        disabled={state === 'loading' || disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50 ${variantStyle}`}
      >
        {state === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        {state === 'loading' ? 'Sending…' : label}
      </button>
      {msg && (
        <p className={`text-xs ${state === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CommunicationsClient({
  sessions, batches, courses, recentCampaigns
}: {
  sessions: any[]; batches: any[]; courses: any[]; recentCampaigns: any[]
}) {
  const [announcementBody, setAnnouncementBody] = useState('')
  const [announcementSubject, setAnnouncementSubject] = useState('')
  const [announcementWaBody, setAnnouncementWaBody] = useState('')
  const [announcementTarget, setAnnouncementTarget] = useState<'all'|'course'|'batch'>('all')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [announcementChannels, setAnnouncementChannels] = useState<('email'|'whatsapp')[]>(['email','whatsapp'])

  const upcomingSessions = sessions.filter(s => new Date(s.webinar_date) >= new Date(new Date().toISOString().split('T')[0]))
  const pastSessions     = sessions.filter(s => new Date(s.webinar_date) <  new Date(new Date().toISOString().split('T')[0]))

  function toggleChannel(ch: 'email'|'whatsapp') {
    setAnnouncementChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    )
  }

  function announcementPayload() {
    const base: any = {
      extra: {
        custom_subject: announcementSubject,
        custom_body: `<p>${announcementBody.replace(/\n/g, '</p><p>')}</p>`,
        wa_body: announcementWaBody || announcementBody.slice(0, 500),
      },
      channels: announcementChannels,
    }
    if (announcementTarget === 'course' && selectedCourse)  base.target_course_ids = [selectedCourse]
    if (announcementTarget === 'batch' && selectedBatch)    base.target_batch_ids  = [selectedBatch]
    return base
  }

  const inp = "w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600"
  const lbl = "text-xs text-gray-400 uppercase tracking-wide block mb-1"

  return (
    <div className="space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Communications Hub</h1>
        <p className="text-gray-500 text-sm mt-1">Manual trigger panel for WhatsApp + Email campaigns</p>
      </div>

      {/* ── WEBINAR FUNNEL TRIGGERS ─────────────────────────────────────── */}
      <Section title="Webinar Funnel Campaigns" icon={MessageSquare} color="#818cf8">
        <div className="pt-4 space-y-6">

          {/* Upcoming sessions */}
          {upcomingSessions.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Upcoming Sessions</p>
              <div className="space-y-3">
                {upcomingSessions.map(s => (
                  <div key={s.id} className="rounded-lg border border-gray-700 p-4 bg-gray-900/50">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-white font-semibold text-sm">{s.course_name}</p>
                        <p className="text-gray-500 text-xs">{fmtDate(s.webinar_date)} · {fmtTime(s.webinar_time)} IST</p>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {s.countdown_sent_at && <Pill label="Countdown ✓" color="green" />}
                        {s.live_notified_at  && <Pill label="Live ✓" color="green" />}
                        {!s.countdown_sent_at && <Pill label="Countdown pending" color="yellow" />}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <TriggerButton
                        label="Send Promotional"
                        campaign="webinar_promotional"
                        payload={{ webinar_date: s.webinar_date, webinar_time: s.webinar_time }}
                        variant="default"
                      />
                      {!s.countdown_sent_at && (
                        <TriggerButton
                          label="Send Countdown (24h)"
                          campaign="webinar_countdown_reminder"
                          payload={{ webinar_date: s.webinar_date, webinar_time: s.webinar_time }}
                          variant="success"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past sessions */}
          {pastSessions.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Past Sessions — Post-Webinar Actions</p>
              <div className="space-y-3">
                {pastSessions.map(s => (
                  <div key={s.id} className="rounded-lg border border-gray-700 p-4 bg-gray-900/50">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-white font-semibold text-sm">{s.course_name}</p>
                        <p className="text-gray-500 text-xs">{fmtDate(s.webinar_date)} · {fmtTime(s.webinar_time)} IST</p>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {s.feedback_sent_at  && <Pill label="Feedback ✓" color="green" />}
                        {!s.feedback_sent_at && <Pill label="Feedback not sent" color="yellow" />}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!s.feedback_sent_at && (
                        <TriggerButton
                          label="Send Feedback Request"
                          campaign="webinar_feedback_request"
                          payload={{ webinar_date: s.webinar_date, webinar_time: s.webinar_time }}
                          variant="default"
                        />
                      )}
                      <TriggerButton
                        label="Send No-Show Re-Engage"
                        campaign="webinar_noshow_reengage"
                        payload={{ webinar_date: s.webinar_date, webinar_time: s.webinar_time }}
                        variant="default"
                      />
                      <TriggerButton
                        label="Send Nudge 1 (Job Market)"
                        campaign="nudge_1_job_market"
                        payload={{ webinar_date: s.webinar_date, webinar_time: s.webinar_time }}
                        variant="default"
                      />
                      <TriggerButton
                        label="Send Nudge 2 (AI Critical)"
                        campaign="nudge_2_ai_critical"
                        payload={{ webinar_date: s.webinar_date, webinar_time: s.webinar_time }}
                      />
                      <TriggerButton
                        label="Send Nudge 3 (Live Classes)"
                        campaign="nudge_3_live_classes"
                        payload={{ webinar_date: s.webinar_date, webinar_time: s.webinar_time }}
                      />
                      <TriggerButton
                        label="Send Nudge 4 (Real Projects)"
                        campaign="nudge_4_real_projects"
                        payload={{ webinar_date: s.webinar_date, webinar_time: s.webinar_time }}
                      />
                      <TriggerButton
                        label="Send Nudge 5 (Final)"
                        campaign="nudge_5_ai_portfolio"
                        payload={{ webinar_date: s.webinar_date, webinar_time: s.webinar_time }}
                        variant="danger"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── STUDENT BROADCAST ──────────────────────────────────────────── */}
      <Section title="Student Broadcast (Enrolled Students)" icon={Megaphone} color="#34d399">
        <div className="pt-4 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            {/* Target selector */}
            <div>
              <label className={lbl}>Send To</label>
              <select value={announcementTarget} onChange={e => setAnnouncementTarget(e.target.value as any)} className={inp}>
                <option value="all">All Active Students</option>
                <option value="course">Specific Course</option>
                <option value="batch">Specific Batch</option>
              </select>
            </div>
            {announcementTarget === 'course' && (
              <div>
                <label className={lbl}>Course</label>
                <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className={inp}>
                  <option value="">Select course…</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {announcementTarget === 'batch' && (
              <div>
                <label className={lbl}>Batch</label>
                <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} className={inp}>
                  <option value="">Select batch…</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.label} ({b.seats_filled} students)</option>)}
                </select>
              </div>
            )}
            {/* Channels */}
            <div>
              <label className={lbl}>Channels</label>
              <div className="flex gap-3 mt-1.5">
                {(['email','whatsapp'] as const).map(ch => (
                  <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={announcementChannels.includes(ch)}
                      onChange={() => toggleChannel(ch)}
                      className="rounded border-gray-600 bg-gray-900 text-indigo-500" />
                    <span className="text-sm text-gray-300 capitalize">{ch}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Email Subject</label>
            <input value={announcementSubject} onChange={e => setAnnouncementSubject(e.target.value)}
              placeholder="e.g. Special Bonus Session This Saturday!" className={inp} />
          </div>
          <div>
            <label className={lbl}>Email Body (HTML allowed)</label>
            <textarea value={announcementBody} onChange={e => setAnnouncementBody(e.target.value)}
              rows={4} placeholder="Write your announcement here…" className={inp + ' resize-none'} />
          </div>
          <div>
            <label className={lbl}>WhatsApp Message (plain text, max 500 chars)</label>
            <textarea value={announcementWaBody} onChange={e => setAnnouncementWaBody(e.target.value)}
              rows={3} placeholder="Short WA version — leave blank to auto-generate from email body"
              maxLength={500} className={inp + ' resize-none'} />
            <p className="text-xs text-gray-600 mt-1">{announcementWaBody.length}/500</p>
          </div>
          <TriggerButton
            label="Send Announcement"
            campaign="student_announcement"
            payload={announcementPayload()}
            variant="success"
            disabled={!announcementBody.trim() || !announcementSubject.trim()}
          />
        </div>
      </Section>

      {/* ── RECENT CAMPAIGN LOG ────────────────────────────────────────── */}
      <Section title="Recent Campaign History" icon={Clock} color="#fbbf24" defaultOpen={false}>
        <div className="pt-4">
          {recentCampaigns.length === 0 ? (
            <p className="text-gray-500 text-sm">No campaigns yet.</p>
          ) : (
            <div className="divide-y divide-gray-700">
              {recentCampaigns.map(c => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {c.template_snapshot?.name ?? c.template_snapshot?.aisensy_campaign_name ?? 'Campaign'}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {fmtTs(c.created_at)} · {c.triggered_by_name ?? 'Admin'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">
                      {c.total_recipients} recipients
                    </span>
                    {c.status === 'sent' && <Pill label={`✓ ${c.sent_count} sent`} color="green" />}
                    {c.status === 'failed' && <Pill label={`✗ ${c.failed_count} failed`} color="red" />}
                    {c.status === 'partial' && <Pill label={`${c.sent_count}/${c.total_recipients}`} color="yellow" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
