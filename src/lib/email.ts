// src/lib/email.ts - stub, will be completed in Task 27
interface EmailQueueParams {
  to: string
  template_name: string
  payload: Record<string, unknown>
  scheduled_at?: string
}

export async function queueEmail(params: EmailQueueParams): Promise<void> {
  // TODO: implemented in Task 27
  console.log('[queueEmail stub] Would queue email:', params.template_name, 'to', params.to)
}
