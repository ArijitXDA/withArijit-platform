import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { email, mobile } = await req.json()

    if (!email?.trim() && !mobile?.trim()) {
      return NextResponse.json({ error: 'Provide email or mobile' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Build query — match on email OR mobile (or both)
    let query = supabase
      .from('webinar_participation_certificates')
      .select('cert_id, full_name, course_name, webinar_date, duration_minutes, rating, is_5_star, certificate_url, issued_at, is_valid')
      .order('issued_at', { ascending: false })

    if (email?.trim() && mobile?.trim()) {
      // Both provided — must match both
      query = query
        .eq('email', email.trim().toLowerCase())
        .eq('mobile', mobile.trim())
    } else if (email?.trim()) {
      query = query.eq('email', email.trim().toLowerCase())
    } else {
      query = query.eq('mobile', mobile.trim())
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ certificates: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
