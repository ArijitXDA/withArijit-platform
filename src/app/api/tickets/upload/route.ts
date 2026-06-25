import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { currentStudentParty } from '@/lib/ticketParty'

export const dynamic = 'force-dynamic'

const ALLOWED = /^(image\/|application\/pdf$|text\/plain$|text\/csv$|application\/msword$|application\/vnd\.openxmlformats|application\/octet-stream$)/

// POST /api/tickets/upload — FormData { file, name } → uploads to storage, returns {url,name,type,size}.
export async function POST(req: NextRequest) {
  const me = await currentStudentParty()
  if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const form = await req.formData()
  const file = form.get('file') as File | null
  const name = ((form.get('name') as string) || file?.name || 'file').slice(0, 120)
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > 10_485_760) return NextResponse.json({ error: 'File too large (max 10 MB).' }, { status: 400 })
  if (file.type && !ALLOWED.test(file.type)) return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 })

  const ext = (name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'bin'
  const path = `t/${crypto.randomUUID()}.${ext}`
  const svc = createServiceClient()
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await svc.storage.from('ticket-attachments').upload(path, buf, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = svc.storage.from('ticket-attachments').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, name, type: file.type || 'application/octet-stream', size: file.size })
}
