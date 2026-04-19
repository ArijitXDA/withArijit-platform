'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, RefreshCw, Sparkles, Video, BookOpen, ChevronRight } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message { role: 'user' | 'assistant'; content: string }

interface NextSession {
  title:    string
  date:     string
  time:     string
  link:     string | null
  daysAway: number
}

interface ClientCtx {
  studentName:   string
  firstName:     string
  email:         string
  courseName:    string
  courseId:      string | null
  enrolmentCount:number
  courses:       { id: string; name: string }[]
  sessionsPast:  number
  totalSessions: number
  progressPct:   number
  certCount:     number
  nextSession:   NextSession | null
  batchLabel:    string | null
  batchTime:     string | null
  meetingLink:   string | null
}

// ── Design tokens (matches dashboard) ─────────────────────────────────────────
const T = {
  border:      '#dce6f5',
  borderLight: '#e8f0fc',
  navy:        '#0f1f3d',
  blue:        '#2563eb',
  indigo:      '#4f46e5',
  purple:      '#7c3aed',
  blueLight:   '#eff6ff',
  bluePale:    '#dbeafe',
  textPrimary: '#0f1f3d',
  textSec:     '#475569',
  textMuted:   '#94a3b8',
  green:       '#16a34a',
  greenBg:     '#f0fdf4',
  greenBorder: '#bbf7d0',
  amber:       '#d97706',
  amberBg:     '#fffbeb',
  amberBorder: '#fde68a',
}

// ── Quick prompt chips ─────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  'When is my next class?',
  'Show my upcoming sessions',
  'Explain Agentic AI to me',
  'What is RAG and how does it work?',
  'Show my certificates',
  'Get my study materials',
  'What topics are in Session 5?',
  'How do I join my live class?',
  'How do I become a partner?',
  'What is my course progress?',
]

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:0.85em;font-family:monospace">$1</code>')
    .replace(/^• /gm, '&bull; ')
    .replace(/^- /gm, '&bull; ')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5 px-1">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full animate-bounce"
          style={{ background: T.indigo, animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }} />
      ))}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: T.borderLight }}>
      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${T.indigo}, ${T.purple})` }} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AssistantProfessorClient({
  welcomeMessage,
  existingMessages,
  clientCtx: ctx,
}: {
  welcomeMessage:    string
  existingMessages:  Message[]
  clientCtx:         ClientCtx
}) {
  // If returning student with history, start from history; else start with welcome
  const initMessages: Message[] = existingMessages.length > 0
    ? existingMessages
    : [{ role: 'assistant', content: welcomeMessage }]

  const [messages,       setMessages]       = useState<Message[]>(initMessages)
  const [input,          setInput]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [activeCourseId, setActiveCourseId] = useState<string | null>(ctx.courseId)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q || loading) return

    setInput('')
    setError('')

    const userMsg: Message = { role: 'user', content: q }
    const newMessages      = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/student/assistant-professor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages:  newMessages,
          courseId:  activeCourseId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to get response')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, messages, loading, activeCourseId])

  function reset() {
    setMessages([{ role: 'assistant', content: welcomeMessage }])
    setError('')
  }

  // Next session urgency colour
  const sessionUrgency = ctx.nextSession?.daysAway === 0
    ? { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', label: '🔴 TODAY' }
    : ctx.nextSession?.daysAway === 1
    ? { bg: T.amberBg, border: T.amberBorder, text: T.amber, label: '⏰ TOMORROW' }
    : { bg: T.greenBg, border: T.greenBorder, text: T.green, label: `in ${ctx.nextSession?.daysAway ?? '?'} days` }

  return (
    <div className="flex flex-col max-w-3xl" style={{ height: 'calc(100vh - 110px)' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 mb-3">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})` }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base leading-tight" style={{ color: T.navy }}>
              Assistant Professor (AI)
            </h1>
            <p className="text-xs" style={{ color: T.textMuted }}>
              {ctx.courseName} · {ctx.sessionsPast}/{ctx.totalSessions} sessions · {ctx.progressPct}% complete
            </p>
          </div>
          <button onClick={reset}
            className="p-2 rounded-lg transition-all hover:bg-blue-50 shrink-0"
            title="New conversation"
            style={{ color: T.textMuted }}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <ProgressBar pct={ctx.progressPct} />

        {/* Multi-course selector */}
        {ctx.enrolmentCount > 1 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {ctx.courses.map(c => (
              <button key={c.id} onClick={() => {
                setActiveCourseId(c.id)
                setMessages([{ role: 'assistant', content: welcomeMessage }])
              }}
                className="text-xs px-3 py-1.5 rounded-full font-semibold border transition-all"
                style={activeCourseId === c.id ? {
                  background:  `linear-gradient(135deg, ${T.indigo}, ${T.purple})`,
                  color:       'white',
                  borderColor: T.indigo,
                } : {
                  background:  'white',
                  color:       T.textSec,
                  borderColor: T.border,
                }}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Next session banner ───────────────────────────────────────────── */}
      {ctx.nextSession && (
        <div className="shrink-0 mb-3 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: sessionUrgency.bg, border: `1px solid ${sessionUrgency.border}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'white', border: `1px solid ${sessionUrgency.border}` }}>
              <BookOpen size={14} style={{ color: sessionUrgency.text }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: sessionUrgency.text }}>
                {sessionUrgency.label} · {ctx.nextSession.title}
              </p>
              <p className="text-xs truncate" style={{ color: sessionUrgency.text, opacity: 0.8 }}>
                {ctx.nextSession.date} · {ctx.nextSession.time}
              </p>
            </div>
          </div>
          {ctx.nextSession.link ? (
            <a href={ctx.nextSession.link} target="_blank" rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-xl transition-all hover:opacity-90"
              style={{ background: sessionUrgency.text }}>
              <Video size={12} /> Join
            </a>
          ) : (
            <span className="shrink-0 flex items-center gap-1 text-xs font-semibold"
              style={{ color: sessionUrgency.text }}>
              Scheduled <ChevronRight size={12} />
            </span>
          )}
        </div>
      )}

      {/* ── Privacy badge ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
        style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
        <span className="text-xs">🔒</span>
        <p className="text-xs" style={{ color: T.green }}>
          Strictly <strong>your data only</strong> — no other student's information is accessible here.
        </p>
      </div>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})` }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}

            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
              style={msg.role === 'user' ? {
                background:   `linear-gradient(135deg, ${T.blue}, ${T.indigo})`,
                borderRadius: '16px 16px 4px 16px',
                boxShadow:    '0 2px 8px rgba(37,99,235,0.18)',
                color:        'white',
              } : {
                background:   'white',
                border:       `1px solid ${T.border}`,
                borderRadius: '16px 16px 16px 4px',
                boxShadow:    '0 1px 4px rgba(37,99,235,0.06)',
              }}>
              {msg.role === 'user'
                ? <p style={{ color: 'white' }}>{msg.content}</p>
                : <div className="space-y-1 leading-relaxed"
                    style={{ color: T.textPrimary }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              }
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-black text-white"
                style={{ background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})` }}>
                {ctx.firstName[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})` }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="rounded-2xl px-4 py-3"
              style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: '16px 16px 16px 4px' }}>
              <TypingDots />
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-center py-2 rounded-xl px-3"
            style={{ color: '#dc2626', background: '#fee2e2' }}>
            {error} — please try again
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick prompts ──────────────────────────────────────────────────── */}
      <div className="shrink-0 flex gap-2 overflow-x-auto pb-2 mb-2"
        style={{ scrollbarWidth: 'none' }}>
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => send(p)} disabled={loading}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full whitespace-nowrap border transition-all hover:shadow-sm hover:-translate-y-px disabled:opacity-40"
            style={{ background: 'white', color: T.textSec, borderColor: T.border }}>
            {p}
          </button>
        ))}
      </div>

      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !loading && send()}
          placeholder="Ask anything about your course, sessions, a concept to explain…"
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-2xl text-sm focus:outline-none transition-colors"
          style={{
            background: 'white',
            border:     `1.5px solid ${T.border}`,
            color:      T.textPrimary,
          }}
          onFocus={e => { e.target.style.borderColor = T.indigo }}
          onBlur={e  => { e.target.style.borderColor = T.border }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:opacity-90 active:scale-95 shrink-0"
          style={{ background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})` }}>
          {loading
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Send className="w-5 h-5" />
          }
        </button>
      </div>

    </div>
  )
}
