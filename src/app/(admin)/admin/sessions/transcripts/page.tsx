import { createServiceClient } from '@/lib/supabase/service'
import TranscriptsClient from './_components/TranscriptsClient'

export default async function TranscriptsPage() {
  const service = createServiceClient()

  // Fetch all active batches with course info
  const { data: batches } = await service
    .from('awa_batches')
    .select(`
      id, batch_code, label, day_of_week,
      start_time, start_date, session_batch_id,
      course:course_id(id, name, short_name)
    `)
    .eq('is_active', true)
    .order('sort_order')

  // Fetch all existing transcripts
  const { data: transcripts } = await service
    .from('session_transcripts')
    .select('id, batch_id, session_number, session_date, summary, key_topics, word_count, uploaded_by, created_at, updated_at')
    .order('batch_id')
    .order('session_number')

  return (
    <TranscriptsClient
      batches={(batches as any) ?? []}
      existingTranscripts={(transcripts as any) ?? []}
    />
  )
}
