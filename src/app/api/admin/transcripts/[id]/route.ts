import { NextRequest, NextResponse }  from 'next/server'
import { createServiceClient }         from '@/lib/supabase/service'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const service = createServiceClient()

    // Fetch the row first so we can delete from storage too
    const { data: transcript } = await service
      .from('session_transcripts')
      .select('batch_id, session_number')
      .eq('id', id)
      .single()

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    // Delete from storage
    const storagePath = `${transcript.batch_id}/session_${String(transcript.session_number).padStart(2, '0')}.txt`
    await service.storage
      .from('session-transcripts')
      .remove([storagePath])
    // Non-fatal if storage file doesn't exist

    // Delete from DB
    const { error } = await service
      .from('session_transcripts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
