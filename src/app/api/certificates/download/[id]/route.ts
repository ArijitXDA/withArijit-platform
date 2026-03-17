import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateCertificate } from '@/lib/pdf'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const service = createServiceClient()
  const { data: cert } = await (service as any)
    .from('certificates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!cert) return new NextResponse('Not found', { status: 404 })

  // Fetch student name
  const { data: student } = await (service as any)
    .from('student_master_table')
    .select('name')
    .eq('email', user.email)
    .maybeSingle()

  const pdfBuffer = await generateCertificate(cert, student?.name)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${id}.pdf"`,
    },
  })
}
