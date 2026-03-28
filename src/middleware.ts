import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware-client'
import { jwtVerify } from 'jose'

// Admin-protected routes
const ADMIN_PROTECTED = /^\/admin\/(dashboard|students|sessions|session-links|certificates|library|courses|payments|email-queue|ai-spots|crm|partners|audit-log)(\/.*)?$/

// Student-protected routes — dashboard + select-batch + ai-monitor
const STUDENT_PROTECTED = /^\/(dashboard|select-batch|)(\/.*)?$/

// More precise: starts with these path segments
function isStudentProtected(pathname: string) {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/select-batch')
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Admin route protection ────────────────────────────────────────────────
  if (ADMIN_PROTECTED.test(pathname)) {
    const token = request.cookies.get('admin_token')?.value
    if (!token) return NextResponse.redirect(new URL('/admin', request.url))
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!))
      return NextResponse.next()
    } catch {
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('admin_token')
      return response
    }
  }

  // ── Student route protection ──────────────────────────────────────────────
  if (isStudentProtected(pathname)) {
    const { supabaseResponse, user } = await updateSession(request)
    if (!user) {
      const redirectUrl = new URL('/signin', request.url)
      // Preserve full path + query string so select-batch params survive
      const fullPath = pathname + (request.nextUrl.search ?? '')
      redirectUrl.searchParams.set('next', fullPath)
      return NextResponse.redirect(redirectUrl)
    }
    return supabaseResponse
  }

  // ── Public routes — refresh session ──────────────────────────────────────
  const { supabaseResponse } = await updateSession(request)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf)$).*)',
  ],
}
