import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/service'

function getHostingerTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

function getBrevoTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
  })
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string
  subject: string
  html: string
  from?: string
}): Promise<void> {
  const mailOptions = {
    from: from ?? `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  }

  try {
    await getHostingerTransporter().sendMail(mailOptions)
  } catch (err: any) {
    // Fallback to Brevo when Hostinger daily quota is exhausted (550 or auth error)
    if (err.responseCode === 550 || err.code === 'EAUTH' || err.responseCode === 421) {
      const brevoFrom = `${process.env.SMTP_FROM_NAME} <${process.env.BREVO_FROM_EMAIL ?? process.env.SMTP_USER}>`
      await getBrevoTransporter().sendMail({ ...mailOptions, from: brevoFrom })
    } else {
      throw err
    }
  }
}

interface QueueEmailParams {
  to: string
  template_name: string
  payload: Record<string, unknown>
  scheduled_at?: string
  ref_id?: string
  ref_type?: string
}

export async function queueEmail(params: QueueEmailParams): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await (supabase as any).from('email_queue').insert({
    recipient_email: params.to,
    template_name: params.template_name,
    payload: params.payload,
    scheduled_at: params.scheduled_at ?? new Date().toISOString(),
    status: 'pending',
    retry_count: 0,
    max_retries: 3,
    ref_id: params.ref_id ?? null,
    ref_type: params.ref_type ?? null,
  })

  if (error) {
    console.error('Failed to queue email:', error.message)
  }
}
