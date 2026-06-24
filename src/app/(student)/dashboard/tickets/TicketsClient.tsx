'use client'
import { useEffect, useState, useCallback } from 'react'
import { Ticket, Plus, X, Loader2, Send, ChevronLeft, MessageSquare } from 'lucide-react'

type Party = { type: string; id: string; name?: string }
const inp = 'w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-indigo-500'
const lbl = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
const cardBox = { background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(15,31,61,0.05)' }

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  open:        { label: 'Open',        bg: '#dbeafe', color: '#1d4ed8' },
  responded:   { label: 'Responded',   bg: '#dcfce7', color: '#15803d' },
  in_progress: { label: 'In progress', bg: '#fef9c3', color: '#a16207' },
  resolved:    { label: 'Resolved',    bg: '#f1f5f9', color: '#475569' },
  closed:      { label: 'Closed',      bg: '#f1f5f9', color: '#64748b' },
}
const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

export default function TicketsClient() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [thread, setThread] = useState<any | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [compose, setCompose] = useState(false)

  const loadTickets = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/tickets').then(r => r.json()).catch(() => ({ tickets: [] }))
    setTickets(r.tickets ?? []); setLoading(false)
  }, [])
  useEffect(() => { loadTickets() }, [loadTickets])
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('open')
    if (id) openTicket(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openTicket(id: string) {
    setOpenId(id); setThread(null)
    setThread(await fetch(`/api/tickets/${id}`).then(r => r.json())); loadTickets()
  }
  async function sendReply() {
    if (!reply.trim() || !openId) return
    setBusy(true)
    await fetch(`/api/tickets/${openId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: reply }) })
    setReply('')
    setThread(await fetch(`/api/tickets/${openId}`).then(r => r.json())); setBusy(false); loadTickets()
  }

  if (openId) {
    const t = thread?.ticket
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => { setOpenId(null); setThread(null) }} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 mb-3"><ChevronLeft className="w-4 h-4" /> All tickets</button>
        {!t ? <div className="py-20 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> : (
          <>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{t.subject}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium" style={{ background: STATUS[t.status]?.bg, color: STATUS[t.status]?.color }}>{STATUS[t.status]?.label ?? t.status}</span>
            </div>
            <p className="text-gray-500 text-xs mb-4">{t.ticket_code} · {t.category.replace(/_/g, ' ')} · To: {(thread.recipients ?? []).map((r: any) => r.party_name).join(', ')}</p>
            <div className="space-y-3 mb-4">
              {(thread.messages ?? []).map((m: any) => {
                const mine = m.author_type === 'student'
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%] rounded-2xl px-4 py-2.5" style={{ background: mine ? '#e0e7ff' : '#f1f5f9', border: '1px solid #e5e7eb' }}>
                      {!mine && <p className="text-[11px] font-semibold text-indigo-700 mb-0.5">{m.author_name || m.author_type}</p>}
                      <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{fmt(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-end gap-2 sticky bottom-3">
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Write a reply…" className={inp} />
              <button onClick={sendReply} disabled={busy || !reply.trim()} className="p-3 rounded-xl text-white disabled:opacity-50 shrink-0" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2"><Ticket className="w-6 h-6 text-indigo-600" /><h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1></div>
        <button onClick={() => setCompose(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}><Plus className="w-4 h-4" /> Raise a Ticket</button>
      </div>
      <p className="text-gray-500 text-sm mb-5">Reach your mentor, your partner, or oStaran support — and track their responses here.</p>

      {loading ? (
        <div className="py-20 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl py-14 text-center" style={cardBox}>
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tickets yet. Raise one to ask a question or report an issue.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <button key={t.id} onClick={() => openTicket(t.id)} className="w-full text-left rounded-xl px-4 py-3 transition-all hover:shadow-md" style={cardBox}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-gray-900 text-sm font-semibold truncate">{t.subject}</p>
                <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0 font-medium" style={{ background: STATUS[t.status]?.bg, color: STATUS[t.status]?.color }}>{STATUS[t.status]?.label ?? t.status}</span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{t.ticket_code} · {t.category.replace(/_/g, ' ')} · {fmt(t.last_message_at)}</p>
            </button>
          ))}
        </div>
      )}

      {compose && <Compose onClose={() => setCompose(false)} onCreated={() => { setCompose(false); loadTickets() }} />}
    </div>
  )
}

function Compose({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [options, setOptions] = useState<Party[]>([])
  const [categories, setCategories] = useState<[string, string][]>([])
  const [to, setTo] = useState<Set<string>>(new Set())
  const [f, setF] = useState({ category: 'query', subject: '', body: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { fetch('/api/tickets/recipients').then(r => r.json()).then(d => { setOptions(d.options ?? []); setCategories(d.categories ?? []) }) }, [])
  const key = (o: Party) => `${o.type}:${o.id}`
  const toggle = (o: Party) => setTo(s => { const n = new Set(s); const k = key(o); n.has(k) ? n.delete(k) : n.add(k); return n })

  async function submit() {
    setErr('')
    if (!f.subject.trim() || !f.body.trim()) { setErr('Add a subject and a message.'); return }
    const recipients = options.filter(o => to.has(key(o)))
    if (!recipients.length) { setErr('Choose at least one recipient.'); return }
    setBusy(true)
    const res = await fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, recipients }) })
    const j = await res.json()
    if (!res.ok) { setErr(j.error || 'Failed'); setBusy(false); return }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 md:p-6" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 20px 60px rgba(15,31,61,0.25)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-gray-900">Raise a Ticket</h2><button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
        <div className="space-y-3">
          <div><label className={lbl}>Category</label><select value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))} className={inp}>{categories.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className={lbl}>To</label>
            {options.length === 0 ? <p className="text-gray-400 text-xs">Loading recipients…</p> : (
              <div className="flex flex-wrap gap-2">{options.map(o => { const on = to.has(key(o)); return <button key={key(o)} type="button" onClick={() => toggle(o)} className="text-xs px-3 py-1.5 rounded-full border transition-all" style={on ? { background: '#e0e7ff', borderColor: '#6366f1', color: '#3730a3' } : { borderColor: '#d1d5db', color: '#475569' }}>{o.name}</button> })}</div>
            )}
          </div>
          <div><label className={lbl}>Subject</label><input value={f.subject} onChange={e => setF(p => ({ ...p, subject: e.target.value }))} className={inp} placeholder="Brief summary" /></div>
          <div><label className={lbl}>Message</label><textarea value={f.body} onChange={e => setF(p => ({ ...p, body: e.target.value }))} rows={5} className={inp} placeholder="Describe your query, complaint or request…" /></div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button onClick={submit} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send ticket</button>
        </div>
      </div>
    </div>
  )
}
