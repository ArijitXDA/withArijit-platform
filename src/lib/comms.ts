/**
 * Calls the send-student-comms Supabase Edge Function.
 * Fire-and-forget safe — all errors are caught and logged, never thrown.
 */
export async function sendStudentComm(payload: {
  event_type: string
  enrolment_id?: string
  session_id?: number
  target_batch_ids?: string[]
  target_course_ids?: string[]
  channels?: ('email' | 'whatsapp')[]
  triggered_by?: string
  triggered_by_name?: string
  extra?: Record<string, any>
  preview_only?: boolean
}): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-student-comms`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[sendStudentComm] Edge function error:', data)
      return { ok: false, error: data?.error ?? 'Edge function failed' }
    }
    return { ok: true, data }
  } catch (err: any) {
    console.error('[sendStudentComm] Network error:', err.message)
    return { ok: false, error: err.message }
  }
}
