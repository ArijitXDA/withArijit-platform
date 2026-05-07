import { createServiceClient } from '@/lib/supabase/service'
import { SequenceKillSwitch } from './_components/SequenceKillSwitch'
import { Activity, AlertCircle, CheckCircle2, Clock, Mail, MessageCircle, Pause, X } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface HealthRow {
  sequences_total: number
  sequences_active: number
  enrolments_total: number
  enrolments_active: number
  enrolments_paused: number
  enrolments_exited: number
  enrolments_completed: number
  enrolments_failed: number
  dispatch_24h_sent: number
  dispatch_24h_skipped: number
  dispatch_24h_failed: number
  dispatch_7d_sent: number
  dispatch_7d_skipped: number
  dispatch_7d_failed: number
  suppression_total: number
  suppression_email: number
  suppression_whatsapp: number
  last_dispatch_attempt_at: string | null
  last_organic_event_at: string | null
  organic_events_24h: number
  organic_events_7d: number
  cron_jobs_active: number
  as_of: string
}

function fmtIST(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST'
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function LifecycleStatusPage() {
  const supabase = createServiceClient()

  // ── Parallel data fetches ──────────────────────────────────────────────
  const [
    healthRes,
    sequencesRes,
    skipReasonsRes,
    bySequenceDayRes,
    recentDispatchesRes,
    hotLeadsRes,
    recentSuppressionsRes,
  ] = await Promise.all([
    supabase.from('lifecycle_health').select('*').maybeSingle(),
    supabase.from('lifecycle_sequences')
      .select('sequence_key, name, is_active, priority, trigger_event, description')
      .order('priority').order('sequence_key'),
    supabase.from('lifecycle_health_skip_reasons').select('*'),
    supabase.from('lifecycle_health_by_sequence_day').select('*').limit(100),
    supabase.from('lifecycle_dispatch_log')
      .select('id, recipient_email, channel, template_key, status, skip_reason, error_message, attempted_at')
      .order('attempted_at', { ascending: false }).limit(20),
    supabase.from('lifecycle_contact_profile')
      .select('email, name, lead_score, stage, ever_attended_free, ever_paid_masterclass, last_event_at')
      .eq('is_hot_lead', true).order('lead_score', { ascending: false }).limit(10),
    supabase.from('lifecycle_suppression')
      .select('email, channels, reason, notes, set_at')
      .order('set_at', { ascending: false }).limit(5),
  ])

  const health      = healthRes.data as HealthRow | null
  const sequences   = sequencesRes.data ?? []
  const skipReasons = skipReasonsRes.data ?? []
  const bySeqDay    = bySequenceDayRes.data ?? []
  const recent      = recentDispatchesRes.data ?? []
  const hotLeads    = hotLeadsRes.data ?? []
  const suppressions = recentSuppressionsRes.data ?? []

  // ── Pivot bySeqDay into a sequence × day matrix (last 14 days) ────────
  const last14Days: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    last14Days.push(d.toISOString().slice(0, 10))
  }
  const seqDayMatrix: Record<string, Record<string, number>> = {}
  for (const row of bySeqDay) {
    const key = row.sequence_key as string
    const day = row.day_ist as string
    seqDayMatrix[key] ??= {}
    seqDayMatrix[key][day] = (row.sent ?? 0) as number
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity size={22} className="text-indigo-600" />
            Lifecycle Engine — Status
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            As of {health?.as_of ? fmtIST(health.as_of) : '—'} ·
            Last dispatch attempt: {relativeTime(health?.last_dispatch_attempt_at ?? null)}
          </p>
        </div>
      </div>

      {/* ── Health snapshot — 4 stat cards ─────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active sequences"
          value={`${health?.sequences_active ?? 0} / ${health?.sequences_total ?? 0}`}
          tone={(health?.sequences_active ?? 0) > 0 ? 'green' : 'gray'}
        />
        <StatCard
          label="Active enrolments"
          value={String(health?.enrolments_active ?? 0)}
          subText={`${health?.enrolments_completed ?? 0} completed · ${health?.enrolments_exited ?? 0} exited · ${health?.enrolments_failed ?? 0} failed`}
          tone="indigo"
        />
        <StatCard
          label="Sends (24h / 7d)"
          value={`${health?.dispatch_24h_sent ?? 0} / ${health?.dispatch_7d_sent ?? 0}`}
          subText={`${health?.dispatch_24h_skipped ?? 0} skipped · ${health?.dispatch_24h_failed ?? 0} failed in 24h`}
          tone={(health?.dispatch_24h_failed ?? 0) > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Cron jobs active"
          value={String(health?.cron_jobs_active ?? 0)}
          subText={`Suppression: ${health?.suppression_total ?? 0}`}
          tone={(health?.cron_jobs_active ?? 0) >= 2 ? 'green' : 'red'}
        />
      </section>

      {/* ── Sequences kill-switch table ────────────────────────────────── */}
      <Section title="Sequences" subtitle="Click Pause/Activate to flip is_active. Pausing prevents new enrolments and stops dispatcher from picking up due rows.">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="py-2 pr-4">Key</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Trigger</th>
              <th className="py-2 pr-4">Priority</th>
              <th className="py-2 pr-4">State</th>
              <th className="py-2 pr-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sequences.map((s) => (
              <tr key={s.sequence_key as string} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-4 font-mono text-xs text-gray-700">{s.sequence_key}</td>
                <td className="py-2 pr-4 text-gray-900">{s.name}</td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-600">{s.trigger_event}</td>
                <td className="py-2 pr-4 text-gray-700">P{s.priority}</td>
                <td className="py-2 pr-4">
                  {s.is_active
                    ? <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle2 size={12} /> Active</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Pause size={12} /> Paused</span>}
                </td>
                <td className="py-2 pr-4 text-right">
                  <SequenceKillSwitch sequenceKey={s.sequence_key as string} isActive={Boolean(s.is_active)} />
                </td>
              </tr>
            ))}
            {sequences.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">No sequences configured.</td></tr>}
          </tbody>
        </table>
      </Section>

      {/* ── Sequence × day rollup (table) ──────────────────────────────── */}
      <Section title="Sends by sequence × day (last 14 days, IST)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-gray-200 text-left text-gray-500">
              <tr>
                <th className="py-2 pr-3 sticky left-0 bg-white font-mono">sequence_key</th>
                {last14Days.map(day => (
                  <th key={day} className="py-2 px-2 text-center font-mono whitespace-nowrap">{day.slice(5)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sequences.map((s) => {
                const row = seqDayMatrix[s.sequence_key as string] ?? {}
                return (
                  <tr key={s.sequence_key as string} className="border-b border-gray-100">
                    <td className="py-2 pr-3 sticky left-0 bg-white font-mono">{s.sequence_key}</td>
                    {last14Days.map(day => {
                      const v = row[day] ?? 0
                      return (
                        <td key={day} className={'py-2 px-2 text-center ' + (v > 0 ? 'text-gray-900 font-semibold' : 'text-gray-300')}>
                          {v || '·'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Skip reasons (last 7d) ─────────────────────────────────────── */}
      <Section title="Skip reasons (last 7 days)">
        {skipReasons.length === 0
          ? <p className="text-sm text-gray-400 py-4 text-center">No skips in the last 7 days.</p>
          : <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr><th className="py-2 pr-4">Reason</th><th className="py-2 pr-4">Count</th><th className="py-2 pr-4">Last seen</th></tr>
              </thead>
              <tbody>
                {skipReasons.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-700">{r.skip_reason}</td>
                    <td className="py-2 pr-4 font-semibold">{r.occurrences_7d}</td>
                    <td className="py-2 pr-4 text-gray-500">{relativeTime(r.most_recent_at as string | null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Section>

      {/* ── Recent dispatches ──────────────────────────────────────────── */}
      <Section title="Recent dispatches (last 20)">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Recipient</th>
              <th className="py-2 pr-4">Channel</th>
              <th className="py-2 pr-4">Template</th>
              <th className="py-2 pr-4">Detail</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((d) => (
              <tr key={d.id as string} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">{relativeTime(d.attempted_at as string | null)}</td>
                <td className="py-2 pr-4">{statusBadge(d.status as string)}</td>
                <td className="py-2 pr-4 text-xs text-gray-700 break-all">{d.recipient_email}</td>
                <td className="py-2 pr-4">{channelIcon(d.channel as string)}</td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-600">{d.template_key}</td>
                <td className="py-2 pr-4 text-xs text-gray-500">{(d.skip_reason as string | null) ?? (d.error_message as string | null) ?? '—'}</td>
              </tr>
            ))}
            {recent.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">No dispatches yet.</td></tr>}
          </tbody>
        </table>
      </Section>

      {/* ── Hot leads ──────────────────────────────────────────────────── */}
      <Section title="Hot leads (score ≥ 60, top 10)">
        {hotLeads.length === 0
          ? <p className="text-sm text-gray-400 py-4 text-center">No hot leads currently.</p>
          : <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Stage</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {hotLeads.map((l, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-xs text-gray-700 break-all">{l.email}</td>
                    <td className="py-2 pr-4 text-gray-900">{(l.name as string | null) ?? '—'}</td>
                    <td className="py-2 pr-4 text-xs font-mono text-gray-600">{l.stage}</td>
                    <td className="py-2 pr-4 font-semibold text-indigo-700">{Number(l.lead_score).toFixed(0)}</td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{relativeTime(l.last_event_at as string | null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Section>

      {/* ── Recent suppressions ───────────────────────────────────────── */}
      <Section title="Recent suppressions (last 5)">
        {suppressions.length === 0
          ? <p className="text-sm text-gray-400 py-4 text-center">No suppressions on record.</p>
          : <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Channels</th>
                  <th className="py-2 pr-4">Reason</th>
                </tr>
              </thead>
              <tbody>
                {suppressions.map((s, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">{relativeTime(s.set_at as string | null)}</td>
                    <td className="py-2 pr-4 text-xs text-gray-700 break-all">{s.email}</td>
                    <td className="py-2 pr-4 text-xs font-mono text-gray-600">{Array.isArray(s.channels) ? (s.channels as string[]).join(', ') : '—'}</td>
                    <td className="py-2 pr-4 text-xs text-gray-600">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Section>

    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

function StatCard({ label, value, subText, tone }: {
  label: string; value: string; subText?: string;
  tone: 'green' | 'red' | 'gray' | 'indigo';
}) {
  const toneClasses = {
    green:  'text-green-700  border-green-100  bg-green-50/40',
    red:    'text-red-700    border-red-100    bg-red-50/40',
    gray:   'text-gray-700   border-gray-100   bg-gray-50/40',
    indigo: 'text-indigo-700 border-indigo-100 bg-indigo-50/40',
  }[tone]
  return (
    <div className={'rounded-xl border bg-white p-4 ' + toneClasses}>
      <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subText && <p className="text-xs text-gray-500 mt-1">{subText}</p>}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 overflow-x-auto">
        {children}
      </div>
    </section>
  )
}

function statusBadge(status: string): React.ReactNode {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    sent:    { cls: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle2 size={11} />, label: 'sent' },
    skipped: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertCircle size={11} />,  label: 'skipped' },
    failed:  { cls: 'bg-red-50 text-red-700 border-red-200',       icon: <X size={11} />,            label: 'failed' },
  }
  const m = map[status] ?? { cls: 'bg-gray-50 text-gray-700 border-gray-200', icon: <Clock size={11} />, label: status }
  return (
    <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ' + m.cls}>
      {m.icon}{m.label}
    </span>
  )
}

function channelIcon(channel: string): React.ReactNode {
  if (channel === 'email')    return <span className="inline-flex items-center gap-1 text-xs text-gray-600"><Mail size={12} /> email</span>
  if (channel === 'whatsapp') return <span className="inline-flex items-center gap-1 text-xs text-gray-600"><MessageCircle size={12} /> wa</span>
  return <span className="text-xs text-gray-500">{channel}</span>
}
