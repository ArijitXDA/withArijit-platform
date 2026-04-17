'use client'

// Simple markdown renderer for community messages
// Handles: **bold**, _italic_, ---dividers, numbered lists, URLs, line breaks
export function renderContent(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  lines.forEach((line, i) => {
    // Horizontal rule
    if (line.trim() === '---') {
      elements.push(<hr key={i} className="my-3" style={{ borderColor: '#e5e7eb' }} />)
      return
    }

    // Empty line → spacer
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />)
      return
    }

    // Parse inline markdown within a line
    const parsed = parseInline(line)
    elements.push(<p key={i} className="leading-relaxed">{parsed}</p>)
  })

  return <>{elements}</>
}

function parseInline(text: string): React.ReactNode {
  // Pattern: **bold**, _italic_, [url](url) or bare https:// links
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  const patterns = [
    { re: /\*\*(.+?)\*\*/,     render: (m: RegExpMatchArray) => <strong key={key++} className="font-semibold">{m[1]}</strong> },
    { re: /_(.+?)_/,            render: (m: RegExpMatchArray) => <em key={key++} className="italic opacity-80">{m[1]}</em> },
    { re: /https?:\/\/\S+/,     render: (m: RegExpMatchArray) => <a key={key++} href={m[0]} target="_blank" rel="noopener noreferrer" className="underline break-all" style={{ color: '#7c3aed' }}>{m[0]}</a> },
  ]

  while (remaining.length > 0) {
    let earliest = -1
    let matchIdx = -1
    let bestMatch: RegExpMatchArray | null = null

    patterns.forEach((p, pi) => {
      const m = remaining.match(p.re)
      if (m && m.index !== undefined) {
        if (earliest === -1 || m.index < earliest) {
          earliest = m.index; matchIdx = pi; bestMatch = m
        }
      }
    })

    if (earliest === -1 || !bestMatch) {
      parts.push(<span key={key++}>{remaining}</span>)
      break
    }

    if (earliest > 0) parts.push(<span key={key++}>{remaining.slice(0, earliest)}</span>)
    parts.push(patterns[matchIdx].render(bestMatch!))
    remaining = remaining.slice(earliest + (bestMatch as RegExpMatchArray)[0].length)
  }

  return <>{parts}</>
}
