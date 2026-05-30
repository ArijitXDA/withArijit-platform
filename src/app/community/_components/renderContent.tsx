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
    elements.push(<p key={i} className="leading-relaxed">{parseInline(line, i)}</p>)
  })

  return <>{elements}</>
}

// Returns plain text preview (no HTML) — used for thread list snippets
export function plainPreview(text: string, maxChars = 180): string {
  const stripped = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^---$/gm, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n+/g, ' ')
    .trim()
  return stripped.length <= maxChars ? stripped : stripped.slice(0, maxChars) + '…'
}

type Pattern = {
  re: RegExp
  render: (match: RegExpMatchArray, key: number) => React.ReactNode
}

const PATTERNS: Pattern[] = [
  {
    re: /\*\*(.+?)\*\*/,
    render: (m, k) => <strong key={k} className="font-semibold">{m[1]}</strong>,
  },
  {
    re: /_(.+?)_/,
    render: (m, k) => <em key={k} className="italic opacity-80">{m[1]}</em>,
  },
  {
    re: /https?:\/\/\S+/,
    render: (m, k) => (
      <a key={k} href={m[0]} target="_blank" rel="noopener noreferrer"
        className="underline break-all" style={{ color: '#7c3aed' }}>
        {m[0]}
      </a>
    ),
  },
]

function parseInline(text: string, lineKey: number): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyCounter = lineKey * 1000

  while (remaining.length > 0) {
    // Find the earliest matching pattern
    let earliestIndex = -1
    let matchedPatternIdx = -1
    let matchedResult: RegExpMatchArray | null = null

    for (let pi = 0; pi < PATTERNS.length; pi++) {
      const m = remaining.match(PATTERNS[pi].re)
      if (m != null && m.index != null) {
        if (earliestIndex === -1 || m.index < earliestIndex) {
          earliestIndex = m.index
          matchedPatternIdx = pi
          matchedResult = m
        }
      }
    }

    // No pattern found — push the rest as plain text
    if (earliestIndex === -1 || matchedResult === null) {
      parts.push(<span key={keyCounter++}>{remaining}</span>)
      break
    }

    // Text before the match
    if (earliestIndex > 0) {
      parts.push(<span key={keyCounter++}>{remaining.slice(0, earliestIndex)}</span>)
    }

    // Render the matched pattern
    parts.push(PATTERNS[matchedPatternIdx].render(matchedResult, keyCounter++))

    // Advance past the matched text
    remaining = remaining.slice(earliestIndex + matchedResult[0].length)
  }

  return <>{parts}</>
}
