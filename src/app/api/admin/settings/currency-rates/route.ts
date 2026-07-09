import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromToken, canAccess } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { DEFAULT_FX } from '@/lib/currency-config'

export const dynamic = 'force-dynamic'

/**
 * GET  → current FX rates (₹ per 1 USD / 1 EUR).
 * POST → upsert app_config.fx_rates. super_admin only (money-sensitive: with true
 *        multi-currency charging this rate sets the amount charged).
 */
export async function GET() {
  const admin = await getAdminFromToken()
  if (!canAccess(admin, 'settings')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  const { data } = await supabase.from('app_config').select('value').eq('key', 'fx_rates').maybeSingle()
  const v = (data?.value ?? {}) as { usd_inr?: number; eur_inr?: number }
  return NextResponse.json({
    usd_inr: Number(v.usd_inr) > 0 ? Number(v.usd_inr) : DEFAULT_FX.usd_inr,
    eur_inr: Number(v.eur_inr) > 0 ? Number(v.eur_inr) : DEFAULT_FX.eur_inr,
  })
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken()
  if (!canAccess(admin, 'settings')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const usd = Number(body?.usd_inr)
  const eur = Number(body?.eur_inr)

  // Sanity range — ₹40–₹500 per 1 USD/EUR. Rejects a fat-fingered rate that could
  // badly mis-price live international sales (this rate drives the charged amount).
  const inRange = (n: number) => Number.isFinite(n) && n >= 40 && n <= 500
  if (!inRange(usd) || !inRange(eur)) {
    return NextResponse.json(
      { error: 'Each rate must be a number between 40 and 500 (₹ per 1 USD / 1 EUR).' },
      { status: 400 },
    )
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('app_config').upsert(
    {
      key: 'fx_rates',
      value: { usd_inr: usd, eur_inr: eur },
      description: 'Manual FX: value of 1 USD / 1 EUR in INR.',
      updated_by: admin?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  )

  if (error) {
    console.error('[currency-rates]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, usd_inr: usd, eur_inr: eur, actor: admin?.email ?? null })
}
