import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { email, mobile_last5 } = await req.json()

    if (!email?.trim() && !mobile_last5?.trim()) {
      return NextResponse.json({ error: 'Provide email or last 5 digits of mobile' }, { status: 400 })
    }

    // Validate mobile_last5 — must be exactly 5 digits
    if (mobile_last5?.trim() && !/^\d{5}$/.test(mobile_last5.trim())) {
      return NextResponse.json({ error: 'Mobile suffix must be exactly 5 digits' }, { status: 400 })
    }

    const supabase = createServiceClient()

    let data: any[] = []
    let error: any   = null

    if (email?.trim() && mobile_last5?.trim()) {
      // Both provided — email exact match + last 5 digits of mobile
      const result = await supabase
        .from('webinar_participation_certificates')
        .select('cert_id, full_name, course_name, webinar_date, duration_minutes, rating, is_5_star, certificate_url, issued_at, is_valid')
        .eq('email', email.trim().toLowerCase())
        .order('issued_at', { ascending: false })
      error = result.error
      // Filter by last 5 of mobile in JS (Supabase doesn't expose RIGHT() in client filters easily)
      data = (result.data ?? []).filter(
        (c: any) => c.mobile && String(c.mobile).replace(/\D/g,'').slice(-5) === mobile_last5.trim()
      )
    } else if (email?.trim()) {
      const result = await supabase
        .from('webinar_participation_certificates')
        .select('cert_id, full_name, course_name, webinar_date, duration_minutes, rating, is_5_star, certificate_url, issued_at, is_valid')
        .eq('email', email.trim().toLowerCase())
        .order('issued_at', { ascending: false })
      error = result.error
      data  = result.data ?? []
    } else {
      // Last 5 digits only — use raw SQL via rpc isn't available, use ilike suffix trick
      // Strip non-digits from input then match with LIKE '%XXXXX'
      const suffix = mobile_last5.trim()
      const result = await supabase
        .from('webinar_participation_certificates')
        .select('cert_id, full_name, course_name, webinar_date, duration_minutes, rating, is_5_star, certificate_url, issued_at, is_valid')
        .like('mobile', `%${suffix}`)
        .order('issued_at', { ascending: false })
      error = result.error
      data  = result.data ?? []
    }

    if (error) throw error

    // Strip mobile from response for privacy
    const safe = data.map(({ mobile: _m, ...rest }: any) => rest)

    return NextResponse.json({ certificates: safe })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
