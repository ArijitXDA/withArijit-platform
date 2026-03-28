'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Send, Loader2, Bot, User, RefreshCw, Sparkles } from 'lucide-react'

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, studentContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to get response')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      setError(e.message)
      setMessages(prev => prev.slice(0, -1)) // remove the user message on error
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function renderMessage(content: string) {
    // Simple markdown: bold, bullet points, line breaks
    return content
      .split('\n')
      .map((line, i) => {
        const bolded = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        const bulleted = bolded.startsWith('•') || bolded.startsWith('-')
        return (
          <p key={i} className={`${bulleted ? 'pl-2' : ''} ${i > 0 && line === '' ? 'mt-2' : ''} leading-relaxed`}
            dangerouslySetInnerHTML={{ __html: bolded }} />
        )
      })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-extrabold text-lg leading-tight">oStaran Class Monitor</h1>
          <p className="text-slate-500 text-xs">Your personal AI course assistant · Strictly your data only</p>
        </div>
        <button onClick={() => setMessages([{
          role: 'assistant',
          content: `Hello ${studentContext.name?.split(' ')[0]}! How can I help you today?`,
        }])} className="ml-auto p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Privacy notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 shrink-0"
        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
        <span className="text-green-400 text-xs">🔒</span>
        <p className="text-green-400/80 text-xs">
          This assistant only has access to <strong className="text-green-400">your own</strong> data — your courses, payments, sessions and certificates. No other student's information is shared.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'text-white rounded-br-sm'
                : 'text-slate-200 rounded-bl-sm'
            }`}
              style={{
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                  : 'rgba(255,255,255,0.05)',
                border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}>
              <div className="space-y-0.5">
                {renderMessage(msg.content)}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                {studentContext.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="rounded-2xl rounded-bl-sm px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex gap-1 items-center h-5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: '#818cf8', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs text-center py-2">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 shrink-0 scrollbar-hide">
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => send(p)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all hover:text-white"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask anything about your course, sessions, payments…"
          className="flex-1 px-4 py-3 rounded-2xl text-white text-sm focus:outline-none transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-40 transition-all"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}
