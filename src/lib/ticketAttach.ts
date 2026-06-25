// Client-side helpers for ticket attachments: resize big images, then upload.
export interface Attachment { url: string; name: string; type: string; size: number }

const MAX_DIM = 1280
const QUALITY = 0.82

/** Shrink large images (canvas → JPEG) so attachments stay small. Non-images pass through. */
export async function resizeIfImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file)
    })
    const { width, height } = img
    if (width <= MAX_DIM && height <= MAX_DIM && file.size < 700_000) { URL.revokeObjectURL(img.src); return file }
    const scale = Math.min(1, MAX_DIM / Math.max(width, height))
    const w = Math.round(width * scale), h = Math.round(height * scale)
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    URL.revokeObjectURL(img.src)
    const blob: Blob | null = await new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', QUALITY))
    return blob && blob.size < file.size ? blob : file
  } catch { return file }
}

/** Resize (images) + upload each file to the given endpoint; returns attachment metadata. */
export async function uploadAttachments(endpoint: string, files: File[]): Promise<Attachment[]> {
  const out: Attachment[] = []
  for (const f of files) {
    const blob = await resizeIfImage(f)
    const fd = new FormData()
    fd.append('file', blob, f.name)
    fd.append('name', f.name)
    const res = await fetch(endpoint, { method: 'POST', body: fd })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'Upload failed')
    out.push(j)
  }
  return out
}

export const ACCEPT = 'image/*,application/pdf,.doc,.docx,.txt,.csv'
