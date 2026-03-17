import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { adminLoginSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = adminLoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { email, passcode } = parsed.data
  const supabase = createServiceClient()

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('id, email, passcode_hash, role, tier, is_active, must_change_password')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  // Use same error message for both "not found" and "wrong password" to prevent enumeration
  if (error || !admin) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(passcode, admin.passcode_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
  const token = await new SignJWT({
    sub: admin.id,
    email: admin.email,
    role: admin.role ?? 'admin',
    tier: admin.tier ?? 'vertical',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret)

  const response = NextResponse.json({
    success: true,
    mustChangePassword: admin.must_change_password ?? false,
    tier: admin.tier,
  })

  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })

  return response
}
