'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle, X, Send, Bot } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function VisitorChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m Ari 👋 Ask me anything about withArijit courses or the free webinar.' }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || streaming) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/agent/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }
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
        updated[updated.length - 1] = { role: 'assistant', content: 'Connection error. Please try again.' }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-500 transition-colors z-50 flex items-center gap-2"
        aria-label="Open AI chat"
      >
        <MessageCircle size={22} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[420px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Bot size={18} />
          <span className="font-semibold text-sm">Ask Ari</span>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close chat">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm rounded-xl px-3 py-2 max-w-[90%] ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white ml-auto'
                : 'bg-gray-100 text-gray-800 mr-auto'
            }`}
          >
            {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask anything…"
          className="text-sm flex-1"
          disabled={streaming}
        />
        <Button size="sm" onClick={send} disabled={streaming || !input.trim()}>
          <Send size={14} />
        </Button>
      </div>
    </div>
  )
}
