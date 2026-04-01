import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { enrolment_id } = await req.json()
    if (!enrolment_id) {
      return NextResponse.json({ error: 'enrolment_id required' }, { status: 400 })
    }

    const service = createServiceClient()

    // Verify this enrolment belongs to the authenticated student
    const { data: enrolment, error: enrolErr } = await service
      .from('student_enrolments')
      .select('id, student_email, student_name, course_id, course_name, balance_due, amount_paid, net_after_discount')
      .eq('id', enrolment_id)
      .eq('student_email', user.email)
      .eq('is_active', true)
      .maybeSingle()

    if (enrolErr || !enrolment) {
      return NextResponse.json({ error: 'Enrolment not found' }, { status: 404 })
    }

    // Only allow claiming if fully paid (balance_due = 0 or null)
    const balanceDue = Number(enrolment.balance_due ?? 0)
    if (balanceDue > 0) {
      return NextResponse.json(
        { error: 'Balance outstanding — pay the full course fee first' },
        { status: 403 }
      )
    }

    // Check if an interim cert already exists for this enrolment
    const { data: existing } = await service
      .from('completion_certificates')
      .select('id, cert_id, cert_type, issued_at')
      .eq('enrolment_id', enrolment_id)
      .in('cert_type', ['interim_provisional', 'final_completion'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      // Return existing cert (idempotent — student can re-claim)
      return NextResponse.json({ success: true, cert: existing, already_existed: true })
    }

    // Generate a cert ID using a DB call to get the next sequence value
    const { data: seqRow } = await service
      .rpc('nextval', { seq: 'completion_cert_serial' })
      .single()
      .catch(() => ({ data: null }))

    // Fallback: use timestamp if RPC isn't available
    const seqNum = seqRow
      ? String(seqRow).padStart(5, '0')
      : String(Date.now()).slice(-5)

    const year  = new Date().getFullYear()
    const certId = `OST-CERT-${year}-${seqNum}`

    // Insert the interim provisional cert row
    const { data: newCert, error: insertErr } = await service
      .from('completion_certificates')
      .insert({
        enrolment_id:  enrolment.id,
        student_email: enrolment.student_email,
        student_name:  enrolment.student_name,
        course_id:     enrolment.course_id,
        course_name:   enrolment.course_name,
        cert_type:     'interim_provisional',
        cert_id:       certId,
        issued_at:     new Date().toISOString(),
      })
      .select('id, cert_id, cert_type, issued_at')
      .single()

    if (insertErr) {
      // If it's a unique violation on cert_id, try one more time with a timestamp suffix
      if (insertErr.code === '23505') {
        const fallbackId = `OST-CERT-${year}-${Date.now().toString().slice(-5)}`
        const { data: retryCert, error: retryErr } = await service
          .from('completion_certificates')
          .insert({
            enrolment_id:  enrolment.id,
            student_email: enrolment.student_email,
            student_name:  enrolment.student_name,
            course_id:     enrolment.course_id,
            course_name:   enrolment.course_name,
            cert_type:     'interim_provisional',
            cert_id:       fallbackId,
            issued_at:     new Date().toISOString(),
          })
          .select('id, cert_id, cert_type, issued_at')
          .single()

        if (retryErr) {
          console.error('[claim-interim] retry insert error:', retryErr)
          return NextResponse.json({ error: 'Failed to issue certificate' }, { status: 500 })
        }
        return NextResponse.json({ success: true, cert: retryCert, already_existed: false })
      }

      console.error('[claim-interim] insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to issue certificate' }, { status: 500 })
    }

    return NextResponse.json({ success: true, cert: newCert, already_existed: false })

  } catch (err) {
    console.error('[claim-interim] unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
