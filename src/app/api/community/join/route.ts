import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Resolve a member's tier by email ────────────────────────────────────────
// Priority: enrolled > webinar/masterclass > guest
async function resolveTier(email: string): Promise<{
  tier: 'guest' | 'webinar' | 'enrolled'
  expiresAt: Date | null
}> {
  const db = admin()
  const emailLower = email.toLowerCase()

  // 1. Paid enrolled student? → lifetime
  const { data: enrolment } = await db
    .from('student_enrolments')
    .select('id')
    .eq('student_email', emailLower)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (enrolment) return { tier: 'enrolled', expiresAt: null }

  // 2. Masterclass paid registrant? → 30 days from paid_at
  const { data: mc } = await db
    .from('qr_landing_registrations')
    .select('registered_at')
    .eq('email', emailLower)
    .eq('payment_status', 'paid')
    .order('registered_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (mc) {
    const base = new Date(mc.registered_at)
    base.setDate(base.getDate() + 30)
    return { tier: 'webinar', expiresAt: base }
  }

  // 3. Free webinar registrant? → 30 days from registration
  const { data: reg } = await db
    .from('qr_landing_registrations')
    .select('registered_at')
    .eq('email', emailLower)
    .order('registered_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (reg) {
    const base = new Date(reg.registered_at)
    base.setDate(base.getDate() + 30)
    return { tier: 'webinar', expiresAt: base }
  }

  // 4. Guest → 60 days from now
  const exp = new Date()
  exp.setDate(exp.getDate() + 60)
  return { tier: 'guest', expiresAt: exp }
}

// POST /api/community/join
// Body: { email, whatsapp?, display_name? }
export async function POST(req: NextRequest) {
  try {
    const { email, whatsapp, display_name } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    const emailLower = email.toLowerCase().trim()
    const db = admin()

    // Check if member already exists
    const { data: existing } = await db
      .from('community_members')
      .select('id, tier, expires_at, is_banned, display_name, points, rank, badges')
      .eq('email', emailLower)
      .maybeSingle()

    if (existing?.is_banned) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }

    // Check expiry
    if (existing?.expires_at && new Date(existing.expires_at) < new Date()) {
      // Expired — redirect to masterclass
      return NextResponse.json({ expired: true }, { status: 200 })
    }

    if (existing) {
      // Refresh last_seen + return member
      await db.from('community_members')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existing.id)
      return NextResponse.json({ member: { ...existing, points: existing.points ?? 0, rank: existing.rank ?? 'Explorer', badges: existing.badges ?? [] } })
    }

    // New member — resolve tier
    const { tier, expiresAt } = await resolveTier(emailLower)
    const name = display_name?.trim() || emailLower.split('@')[0]

    const { data: newMember, error } = await db
      .from('community_members')
      .insert({
        email: emailLower,
        display_name: name,
        whatsapp: whatsapp?.trim() || null,
        tier,
        expires_at: expiresAt?.toISOString() ?? null,
        last_seen_at: new Date().toISOString(),
      })
      .select('id, tier, expires_at, display_name, points, rank, badges')
      .single()

    if (error) throw error
    return NextResponse.json({ member: { ...newMember, points: 0, rank: 'Explorer', badges: [] } })
  } catch (err: any) {
    console.error('/api/community/join error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
