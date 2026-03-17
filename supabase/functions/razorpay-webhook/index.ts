import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  // Verify HMAC-SHA256 signature
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const expected = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  if (expected !== signature) {
    return new Response('Invalid signature', { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity
    const { course_id, name, email, mobile, payment_frequency } = payment.notes ?? {}

    // Idempotency check
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('razorpay_payment_id', payment.id)
      .maybeSingle()

    if (existing) {
      return new Response('Already processed', { status: 200 })
    }

    // Insert payment record
    await supabase.from('payments').insert({
      amount: payment.amount / 100,
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      status: 'captured',
      payment_date: new Date().toISOString().split('T')[0],
      payment_time: new Date().toTimeString().split(' ')[0],
      currency: payment.currency ?? 'INR',
      country: 'IN',
    })

    // Queue confirmation email
    await supabase.from('email_queue').insert({
      recipient_email: email,
      template_name: 'enrollment_confirmation',
      payload: {
        name: name ?? 'Student',
        course_id,
        amount: payment.amount / 100,
        dashboard_url: `${Deno.env.get('APP_URL') ?? 'https://www.witharijit.com'}/dashboard`,
      },
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3,
    })

    // Upsert student record
    if (email && name) {
      await supabase.from('student_master_table').upsert(
        {
          name,
          email,
          mobile: mobile ?? null,
          course_name: course_id ?? null,
          enrollment_date: new Date().toISOString(),
          total_payments_count: 1,
          total_amount_paid: payment.amount / 100,
        },
        { onConflict: 'email' }
      )
    }
  }

  return new Response('OK', { status: 200 })
})
