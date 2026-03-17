'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

export function ReferralCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 bg-white border rounded px-3 py-2 text-xs text-gray-700 truncate">{url}</code>
      <Button size="sm" variant="outline" onClick={handleCopy}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </Button>
    </div>
  )
}
