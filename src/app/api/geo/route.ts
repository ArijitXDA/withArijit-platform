import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { geoDefaultCurrency } from '@/lib/currency-config'

// Suggest a display currency from the visitor's IP country (Vercel edge header).
// Called once by the CurrencyProvider when no currency cookie exists yet, so the
// storefront pages themselves stay static/ISR.
export const dynamic = 'force-dynamic'

export async function GET() {
  const h = await headers()
  const country = h.get('x-vercel-ip-country')
  return NextResponse.json({ country: country ?? null, currency: geoDefaultCurrency(country) })
}
