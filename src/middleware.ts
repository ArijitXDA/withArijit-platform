import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware-client'
import { jwtVerify } from 'jose'

// Admin-protected routes (login page /admin is excluded)
const ADMIN_PROTECTED = /^\/admin\/(dashboard|students|sessions|session-links|certificates|library|courses|payments|email-queue|ai-spots|crm|partners|audit-log)(\/.*)?$/

// Student-protected routes
const STUDENT_PROTECTED = /^\/dashboard(\/.*)?$/

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Admin route protection ────────────────────────────────────────────────
  if (ADMIN_PROTECTED.test(pathname)) {
    const token = request.cookies.get('admin_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    try {
      await jwtVerify(
        token,
        new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
      )
      // Valid admin token — allow through
      return NextResponse.next()
    } catch {
      // Invalid / expired token
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('admin_token')
      return response
    }
  }

  // ── Student route protection ──────────────────────────────────────────────
  if (STUDENT_PROTECTED.test(pathname)) {
    const { supabaseResponse, user } = await updateSession(request)

    if (!user) {
      const redirectUrl = new URL('/signin', request.url)
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  }

  // ── Public routes — refresh Supabase session if present ──────────────────
  const { supabaseResponse } = await updateSession(request)
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public image/font files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf)$).*)',
  ],
}
