import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { bulkEnrollmentSchema } from '@/lib/validations/enrollment'
import { queueEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = bulkEnrollmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { course_id, batch_id, members } = parsed.data
    const supabase = createServiceClient()
    const now = new Date()

    const results = await Promise.allSettled(
      members.map(async member => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('student_master_table').upsert(
          {
            name: member.name,
            email: member.email,
            mobile: member.mobile,
            course_name: course_id,
            batch_id,
            enrollment_date: now.toISOString(),
          },
          { onConflict: 'email' }
        )
        await queueEmail({
          to: member.email,
          template_name: 'bulk_enrollment_invite',
          payload: {
            name: member.name,
            course_id,
            signup_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup`,
          },
        })
      })
    )

    const failed = results.filter(r => r.status === 'rejected').length
    return NextResponse.json({ success: true, enrolled: members.length - failed, failed })
  } catch (error) {
    console.error('Bulk enrollment error:', error)
    return NextResponse.json({ error: 'Bulk enrollment failed' }, { status: 500 })
  }
}
