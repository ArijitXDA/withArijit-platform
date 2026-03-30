'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, RefreshCw, Sparkles } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'When is my next class?',
  'What is my batch timeslot?',
  'Show me my payment summary',
  'How do I join my live class?',
  'What topics will we cover?',
  'How can I refer a friend?',
  'How do I become a partner?',
  'Show my past session recordings',
  'What certificates have I earned?',
  'What study materials are available?',
]

// ── Light theme tokens (matches dashboard) ────────────────────────────────────
const T = {
  bg:          '#eef3fb',
  surface:     '#ffffff',
  surfaceAlt:  '#f8faff',
  border:      '#dce6f5',
  borderLight: '#e8f0fc',
  navy:        '#0f1f3d',
  blue:        '#2563eb',
  indigo:      '#4f46e5',
  indigoDark:  '#4338ca',
  blueLight:   '#eff6ff',
  bluePale:    '#dbeafe',
  textPrimary: '#0f1f3d',
  textSec:     '#475569',
  textMuted:   '#94a3b8',
  green:       '#16a34a',
  greenBg:     '#f0fdf4',
  greenBorder: '#bbf7d0',
  purple:      '#7c3aed',
}

export default function AiMonitorClient({ studentContext }: { studentContext: any }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello ${studentContext.name?.split(' ')[0] ?? 'there'}! 👋\n\nI'm your **oStaran Class Monitor** — your personal AI assistant for everything about your AI certification journey.\n\nI can help you with:\n• Your class schedule & batch details\n• Upcoming and past sessions\n• Study materials & recordings\n• Your payments & certificates\n• Referring friends to the webinar\n• Becoming an AI Partner & earning opportunities\n\nWhat would you like to know?`,
    }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput(''); setError('')

    const newMessages: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/student/ai-monitor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: newMessages, studentContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to get response')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      setError(e.message)
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function renderMessage(content: string, role: 'user' | 'assistant') {
    const isUser = role === 'user'
    return content.split('\n').map((line, i) => {
      const bolded   = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      const bulleted = bolded.startsWith('•') || bolded.startsWith('-')
      return (
        <p key={i}
          className={`${bulleted ? 'pl-2' : ''} ${i > 0 && line === '' ? 'mt-2' : ''} leading-relaxed`}
          style={{ color: isUser ? '#ffffff' : T.textPrimary }}
          dangerouslySetInnerHTML={{ __html: bolded }} />
      )
    })
  }

  return (
    <div className="flex flex-col max-w-3xl" style={{ height: 'calc(100vh - 120px)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})` }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-tight" style={{ color: T.navy }}>
            oStaran Class Monitor
          </h1>
          <p className="text-xs" style={{ color: T.textMuted }}>
            Your personal AI course assistant · Strictly your data only
          </p>
        </div>
        <button
          onClick={() => setMessages([{
            role: 'assistant',
            content: `Hello ${studentContext.name?.split(' ')[0]}! How can I help you today?`,
          }])}
          className="ml-auto p-2 rounded-lg transition-all hover:bg-blue-50"
          style={{ color: T.textMuted }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Privacy notice ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 shrink-0"
        style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
        <span className="text-xs">🔒</span>
        <p className="text-xs" style={{ color: T.green }}>
          This assistant only has access to <strong>your own</strong> data — your courses,
          payments, sessions and certificates. No other student's information is shared.
        </p>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

            {/* AI avatar */}
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})` }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Bubble */}
            <div
              className="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
              style={msg.role === 'user' ? {
                background:   `linear-gradient(135deg, ${T.blue}, ${T.indigo})`,
                borderRadius: '16px 16px 4px 16px',
                boxShadow:    '0 2px 8px rgba(37,99,235,0.2)',
              } : {
                background:   T.surface,
                border:       `1px solid ${T.border}`,
                borderRadius: '16px 16px 16px 4px',
                boxShadow:    '0 1px 4px rgba(37,99,235,0.06)',
              }}>
              <div className="space-y-0.5">
                {renderMessage(msg.content, msg.role)}
              </div>
            </div>

            {/* User avatar */}
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})` }}>
                {studentContext.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
          </div>
        ))}

        {/* Thinking dots */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})` }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="rounded-2xl px-4 py-3"
              style={{
                background:   T.surface,
                border:       `1px solid ${T.border}`,
                borderRadius: '16px 16px 16px 4px',
              }}>
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: T.blue, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-center py-2" style={{ color: '#dc2626' }}>{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick prompts ────────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 shrink-0 scrollbar-hide">
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => send(p)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all hover:shadow-sm"
            style={{
              background:  T.surface,
              color:       T.textSec,
              border:      `1px solid ${T.border}`,
            }}>
            {p}
          </button>
        ))}
      </div>

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask anything about your course, sessions, payments…"
          className="flex-1 px-4 py-3 rounded-2xl text-sm focus:outline-none transition-colors"
          style={{
            background:  T.surface,
            border:      `1px solid ${T.border}`,
            color:       T.textPrimary,
          }}
          onFocus={e => { e.target.style.borderColor = T.blue }}
          onBlur={e  => { e.target.style.borderColor = T.border }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${T.blue}, ${T.indigo})` }}>
          {loading
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Send className="w-5 h-5" />
          }
        </button>
      </div>

    </div>
  )
}
