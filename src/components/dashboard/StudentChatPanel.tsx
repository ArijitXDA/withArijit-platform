'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, ChevronDown, ChevronUp } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function StudentChatPanel() {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your personal AI tutor. Ask me about your upcoming sessions, recordings, payments, or anything about your course.' }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (expanded) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, expanded])

  async function send() {
    if (!input.trim() || streaming) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/agent/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong.' }
          return updated
        })
        setStreaming(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value, { stream: true }).split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const { text } = JSON.parse(line.slice(6))
              if (text) {
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: updated[updated.length - 1].content + text,
                  }
                  return updated
                })
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Connection error. Please retry.' }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="border rounded-2xl overflow-hidden bg-white">
      {/* Toggle header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-indigo-700">
          <Bot size={18} />
          <span className="font-semibold text-sm">AI Tutor</span>
        </div>
        {expanded ? <ChevronDown size={16} className="text-indigo-600" /> : <ChevronUp size={16} className="text-indigo-600" />}
      </button>

      {expanded && (
        <>
          {/* Messages */}
          <div className="h-64 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm rounded-xl px-3 py-2 max-w-[90%] ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white ml-auto'
                    : 'bg-white text-gray-800 mr-auto border border-gray-100'
                }`}
              >
                {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2 bg-white">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask your AI tutor…"
              className="text-sm flex-1"
              disabled={streaming}
            />
            <Button size="sm" onClick={send} disabled={streaming || !input.trim()}>
              <Send size={14} />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
