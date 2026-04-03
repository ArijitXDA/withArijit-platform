'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2, Minimize2, Maximize2, ChevronDown } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Message {
  role:    'user' | 'assistant'
  content: string
  ts?:     number
}

interface QuickChip {
  label: string
  message: string
}

// ── Quick suggestion chips ─────────────────────────────────────────────────────
const QUICK_CHIPS: QuickChip[] = [
  { label: '💰 What\'s the fee?',       message: 'What is the course fee?' },
  { label: '📅 Next class when?',       message: 'When is the next live session?' },
  { label: '🎓 Which course for me?',   message: 'Which course is right for me?' },
  { label: '🏢 Team enrolment',         message: 'How does group enrolment work?' },
  { label: '📜 Certificate info',       message: 'What certificates will I get?' },
  { label: '🎁 What\'s the AI Kit?',    message: 'Tell me about the AI Kit' },
]

// ── Session token — persisted in localStorage ──────────────────────────────────
function getSessionToken(): string {
  if (typeof window === 'undefined') return ''
  let token = localStorage.getItem('ari_session')
  if (!token) {
    token = `vs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('ari_session', token)
  }
  return token
}

// ── Markdown-lite renderer (bold, bullets) ─────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^• /gm, '&bull; ')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

// ── Typing indicator ───────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <div key={i}
          className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export function VisitorChatWidget() {
  const [open,      setOpen]      = useState(false)
  const [expanded,  setExpanded]  = useState(false)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showChips, setShowChips] = useState(true)
  const [showPulse, setShowPulse] = useState(true)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const sessionToken = useRef(getSessionToken())

  // Stop pulse after first open
  useEffect(() => {
    if (open) setShowPulse(false)
  }, [open])

  // Welcome message when first opened
  useEffect(() => {
    if (open && messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          role: 'assistant',
          content: "Hi there! 👋 I'm **Ask Ari** — your guide to oStaran's AI programmes.\n\nI can help you find the right course, tell you about our next live session this Sunday, or answer any questions about AI learning. What brings you here today?",
          ts: Date.now(),
        }])
      }, 400)
    }
  }, [open, messages.length])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  const pagePath = typeof window !== 'undefined' ? window.location.pathname : '/'
  const meta     = typeof window !== 'undefined' ? {
    referrer:     document.referrer,
    utm_source:   new URLSearchParams(window.location.search).get('utm_source'),
    utm_medium:   new URLSearchParams(window.location.search).get('utm_medium'),
    utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
  } : {}

  const send = useCallback(async (messageText?: string) => {
    const text = (messageText ?? input).trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text, ts: Date.now() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setShowChips(false)
    setStreaming(true)

    // Add empty streaming message
    setMessages(prev => [...prev, { role: 'assistant', content: '', ts: Date.now() }])

    try {
      const res = await fetch('/api/agent/visitor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:     newMessages,
          sessionToken: sessionToken.current,
          pagePath,
          meta,
        }),
      })

      if (!res.ok) throw new Error('Request failed')

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value, { stream: true }).split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const { text: chunk } = JSON.parse(line.slice(6))
              if (chunk) {
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: updated[updated.length - 1].content + chunk,
                  }
                  return updated
                })
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "I hit a brief issue. Please try again, or email us at ai@ostaran.com 🙏",
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }, [input, messages, streaming, pagePath, meta])

  // ── Collapsed bubble ─────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 group flex items-center gap-3"
        aria-label="Chat with Ask Ari"
      >
        {/* Label pill — appears on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0
          bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-gray-100 whitespace-nowrap">
          Chat with Ask Ari
        </div>

        {/* Bubble */}
        <div className="relative w-14 h-14">
          {/* Pulse ring */}
          {showPulse && (
            <div className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }} />
          )}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-200 group-hover:scale-110"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            {/* Ari avatar */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/arijit-image.png" alt="Ari" className="w-full h-full object-cover object-top" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
            </div>
          </div>
        </div>
      </button>
    )
  }

  // ── Open widget ───────────────────────────────────────────────────────────────
  const widgetH = expanded ? '85vh' : '520px'
  const widgetW = expanded ? '420px' : '360px'

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-all duration-300"
      style={{
        width:       widgetW,
        height:      widgetH,
        maxHeight:   '90vh',
        background:  '#ffffff',
        borderColor: 'rgba(79,70,229,0.15)',
        boxShadow:   '0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(79,70,229,0.08)',
      }}
    >

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3.5"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arijit-image.png" alt="Ari" className="w-full h-full object-cover object-top" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight">Ask Ari</p>
          <p className="text-indigo-200 text-xs">AI Guide · oStaran</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title={expanded ? 'Compact' : 'Expand'}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Messages area ─────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ background: '#f8f9ff' }}
      >
        {messages.map((m, i) => (
          <div key={i}
            className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Ari avatar on assistant messages */}
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-indigo-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/arijit-image.png" alt="Ari" className="w-full h-full object-cover object-top" />
              </div>
            )}

            {/* Bubble */}
            <div
              className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'text-gray-800 rounded-bl-sm border border-indigo-50'
              }`}
              style={{
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                  : '#ffffff',
                boxShadow: m.role === 'assistant'
                  ? '0 1px 8px rgba(79,70,229,0.08)'
                  : 'none',
              }}
            >
              {m.content === '' && streaming && i === messages.length - 1
                ? <TypingDots />
                : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
              }
            </div>
          </div>
        ))}

        {/* Quick chips — shown only at start after first AI message */}
        {showChips && messages.length === 1 && !streaming && (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs text-gray-400 font-medium pl-9">Quick questions:</p>
            <div className="pl-9 flex flex-col gap-1.5">
              {QUICK_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => send(chip.message)}
                  className="text-left text-xs font-semibold px-3 py-2 rounded-xl border transition-all hover:shadow-sm hover:-translate-y-0.5 active:scale-95"
                  style={{
                    background:  'white',
                    borderColor: 'rgba(79,70,229,0.15)',
                    color:       '#4f46e5',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── CTA strip — above input ────────────────────────────────────────── */}
      {messages.length > 2 && !streaming && (
        <div
          className="shrink-0 px-4 py-2 flex items-center justify-between border-t"
          style={{ background: '#faf9ff', borderColor: 'rgba(79,70,229,0.1)' }}
        >
          <p className="text-xs text-gray-400">Ready to join?</p>
          <a
            href="/masterclass"
            className="text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            Register This Sunday →
          </a>
        </div>
      )}

      {/* ── Input area ────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 p-3 border-t"
        style={{ background: '#ffffff', borderColor: 'rgba(79,70,229,0.1)' }}
      >
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-2 border"
          style={{ borderColor: 'rgba(79,70,229,0.2)', background: '#f8f9ff' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !streaming && send()}
            placeholder="Ask anything…"
            disabled={streaming}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
          />
          <button
            onClick={() => send()}
            disabled={streaming || !input.trim()}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            {streaming
              ? <Loader2 size={14} className="text-white animate-spin" />
              : <Send size={14} className="text-white" />
            }
          </button>
        </div>

        {/* Footer branding */}
        <p className="text-center text-[10px] text-gray-300 mt-2">
          Powered by oStaran AI · <a href="https://ostaran.com" className="hover:text-indigo-400 transition-colors">ostaran.com</a>
        </p>
      </div>
    </div>
  )
}
