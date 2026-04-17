'use client'
import React from 'react'

// Renders markdown-like content from community messages
// Handles: **bold**, _italic_, --- dividers, bare URLs, line breaks
export function renderContent(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  lines.forEach((line, i) => {
    if (line.trim() === '---') {
      elements.push(<hr key={i} className="my-3" style={{ borderColor: '#e5e7eb' }} />)
      return
    }
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />)
      return
    }
    elements.push(<p key={i} className="leading-relaxed">{parseInline(line)}</p>)
  })

  return <>{elements}</>
}

// Returns plain text preview (no HTML) — used for thread list snippets
export function plainPreview(text: string, maxChars = 180): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/---/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxChars)
    + (text.length > maxChars ? '…' : '')
}

let _key = 0
function nextKey() { return ++_key }

function parseInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text

  const patterns: Array<{
    re: RegExp
    render: (m: RegExpMatchArray) => React.ReactNode
  }> = [
    { re: /\*\*(.+?)\*\*/, render: m => <strong key={nextKey()} className="font-semibold">{m[1]}</strong> },
    { re: /_(.+?)_/,        render: m => <em key={nextKey()} className="italic opacity-80">{m[1]}</em> },
    { re: /https?:\/\/\S+/, render: m => (
      <a key={nextKey()} href={m[0]} target="_blank" rel="noopener noreferrer"
        className="underline break-all" style={{ color: '#7c3aed' }}>{m[0]}</a>
    )},
  ]

  while (remaining.length > 0) {
    let earliest = -1
    let matchIdx = -1
    let bestMatch: RegExpMatchArray | null = null

    patterns.forEach((p, pi) => {
      const m = remaining.match(p.re)
      if (m && m.index !== undefined && (earliest === -1 || m.index < earliest)) {
        earliest = m.index; matchIdx = pi; bestMatch = m
      }
    })

    if (earliest === -1 || !bestMatch) {
      parts.push(<span key={nextKey()}>{remaining}</span>)
      break
    }

    if (earliest > 0) parts.push(<span key={nextKey()}>{remaining.slice(0, earliest)}</span>)
    parts.push(patterns[matchIdx].render(bestMatch!))
    remaining = remaining.slice(earliest + bestMatch[0].length)
  }

  return <>{parts}</>
}
