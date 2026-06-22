'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
      style={{ background: '#7c3aed', color: '#fff' }}
    >
      ⬇ Download / Print PDF
    </button>
  )
}
