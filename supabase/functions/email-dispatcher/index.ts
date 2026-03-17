import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Subject mapping for templates
const SUBJECTS: Record<string, string> = {
  enrollment_confirmation: 'Welcome to withArijit! Your enrollment is confirmed 🎉',
  webinar_reminder: 'Your webinar starts soon!',
  class_reminder: "Your class is tomorrow — Don't miss it!",
  gift_enrollment: "You've received an AI course as a gift! 🎁",
  gift_enrollment_confirmation: 'Your gift enrollment was successful',
  bulk_enrollment_invite: "You've been enrolled! Activate your account",
  payment_failure: 'Action required: Payment failed',
  installment_due: 'Upcoming installment due reminder',
}

async function sendViaSmtp(params: {
  to: string
  subject: string
  html: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  fromName: string
  fromEmail: string
}): Promise<void> {
  // Use fetch to a relay or direct SMTP
  // Deno does not have native nodemailer — use fetch to an SMTP-over-HTTP relay if available
  // For direct SMTP, use deno-smtp package
  const { default: SmtpClient } = await import('https://deno.land/x/smtp@v0.7.0/mod.ts')
  const client = new SmtpClient()
  await client.connectTLS({
    hostname: params.smtpHost,
    port: params.smtpPort,
    username: params.smtpUser,
    password: params.smtpPass,
  })
  await client.send({
    from: `${params.fromName} <${params.fromEmail}>`,
    to: params.to,
    subject: params.subject,
    content: params.html,
    html: true,
  })
  await client.close()
}

serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Fetch up to 50 pending emails due now
  const { data: queue, error: fetchError } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .lt('retry_count', 3)
    .order('scheduled_at')
    .limit(50)

  if (fetchError) {
    console.error('Failed to fetch queue:', fetchError.message)
    return new Response('Error fetching queue', { status: 500 })
  }

  const items = queue ?? []
  let sent = 0
  let failed = 0

  for (const item of items) {
    // Mark as processing to prevent duplicate sends
    await supabase
      .from('email_queue')
      .update({ status: 'processing' })
      .eq('id', item.id)

    try {
      const subject = item.subject ?? SUBJECTS[item.template_name] ?? 'Update from withArijit'

      // Simple HTML from payload (full template rendering requires Next.js runtime)
      const payload = item.payload ?? {}
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h2>withArijit</h2>
          <p>${Object.entries(payload).map(([k, v]) => `<strong>${k}:</strong> ${v}`).join('<br>')}</p>
          <hr>
          <p style="font-size: 12px; color: #6b7280;">withArijit — AI Education Platform</p>
        </div>
      `

      await sendViaSmtp({
        to: item.recipient_email,
        subject,
        html,
        smtpHost: 'smtp.hostinger.com',
        smtpPort: 465,
        smtpUser: Deno.env.get('SMTP_USER') ?? '',
        smtpPass: Deno.env.get('SMTP_PASS') ?? '',
        fromName: Deno.env.get('SMTP_FROM_NAME') ?? 'withArijit',
        fromEmail: Deno.env.get('SMTP_USER') ?? '',
      })

      // Mark as sent
      await supabase
        .from('email_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', item.id)

      // Log to awa_email_log
      await supabase.from('awa_email_log').insert({
        recipient_email: item.recipient_email,
        template_name: item.template_name,
        subject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        ref_id: item.ref_id ?? null,
        ref_type: item.ref_type ?? null,
      })

      sent++
    } catch (err) {
      console.error(`Failed to send email ${item.id}:`, err)
      await supabase
        .from('email_queue')
        .update({
          status: 'pending',
          retry_count: (item.retry_count ?? 0) + 1,
          error_message: String(err),
        })
        .eq('id', item.id)
      failed++
    }
  }

  return new Response(
    JSON.stringify({ processed: items.length, sent, failed }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  )
})
