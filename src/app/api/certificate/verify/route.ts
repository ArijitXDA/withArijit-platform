import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Columns returned to the client — mobile is intentionally excluded for privacy
const PUBLIC_COLS = 'cert_id, full_name, course_name, webinar_date, duration_minutes, rating, is_5_star, certificate_url, issued_at, is_valid'

// Columns fetched internally when we need to filter on mobile — stripped before response
const WITH_MOBILE = PUBLIC_COLS + ', mobile'

export async function POST(req: NextRequest) {
  try {
    const { email, mobile_last5 } = await req.json()

    const emailClean  = email?.trim().toLowerCase() ?? ''
    const mobileClean = mobile_last5?.trim() ?? ''

    if (!emailClean && !mobileClean) {
      return NextResponse.json({ error: 'Provide email or last 5 digits of mobile' }, { status: 400 })
    }
    if (mobileClean && !/^\d{5}$/.test(mobileClean)) {
      return NextResponse.json({ error: 'Mobile suffix must be exactly 5 digits (e.g. 43210)' }, { status: 400 })
    }

    const supabase = createServiceClient()
    let data: any[] = []

    if (emailClean && mobileClean) {
      // Both provided — fetch mobile column so we can filter on last 5 digits
      const { data: rows, error } = await supabase
        .from('webinar_participation_certificates')
        .select(WITH_MOBILE)                         // ← include mobile for filtering
        .eq('email', emailClean)
        .order('issued_at', { ascending: false })
      if (error) throw error
      // Filter by last 5 of mobile (strip non-digits first to handle spaces/dashes)
      data = (rows ?? []).filter(
        (c: any) => c.mobile && String(c.mobile).replace(/\D/g, '').slice(-5) === mobileClean
      )

    } else if (emailClean) {
      // Email only
      const { data: rows, error } = await supabase
        .from('webinar_participation_certificates')
        .select(PUBLIC_COLS)
        .eq('email', emailClean)
        .order('issued_at', { ascending: false })
      if (error) throw error
      data = rows ?? []

    } else {
      // Mobile last 5 only — LIKE '%XXXXX' match
      const { data: rows, error } = await supabase
        .from('webinar_participation_certificates')
        .select(PUBLIC_COLS)
        .like('mobile', `%${mobileClean}`)
        .order('issued_at', { ascending: false })
      if (error) throw error
      data = rows ?? []
    }

    // Strip mobile from response for privacy (if it was fetched)
    const safe = data.map(({ mobile: _m, ...rest }: any) => rest)

    return NextResponse.json({ certificates: safe })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
