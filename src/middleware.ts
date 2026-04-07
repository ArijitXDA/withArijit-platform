import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware-client'
import { jwtVerify } from 'jose'
// ── Route patterns ────────────────────────────────────────────────────────────
const ADMIN_PROTECTED = /^\/admin\/(dashboard|students|sessions|session-links|certificates|library|courses|payments|email-queue|ai-spots|crm|partners|audit-log|communications|journey)(\/.*)?$/

function isStudentProtected(pathname: string) {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/select-batch')
}

// ── Role access levels (mirror of admin-auth.ts — no import since middleware
//    runs on Edge runtime which can't import from lib with Node.js deps) ────────
const ROLE_LEVEL: Record<string, number> = {
  dev_admin:          100,
  super_admin:         80,
  channel_admin:       40,
  root_partner_admin:  20,
}

const PAGE_MIN_LEVEL: Record<string, number> = {
  dashboard:      20,   // root_partner_admin+
  students:       20,
  sessions:       40,   // channel_admin+
  'session-links':40,
  certificates:   40,
  library:        40,
  courses:        40,
  'ai-spots':     40,
  communications: 40,
  journey:        40,
  payments:       80,   // super_admin+
  'email-queue':  80,
  partners:       80,
  crm:            80,
  'audit-log':    80,
}

// Inline route→page map (kept here to avoid importing next/headers into Edge runtime)
const ROUTE_PAGE_MAP: Record<string, string> = {
  '/admin/dashboard':     'dashboard',
  '/admin/students':      'students',
  '/admin/sessions':      'sessions',
  '/admin/session-links': 'session-links',
  '/admin/certificates':  'certificates',
  '/admin/library':       'library',
  '/admin/courses':       'courses',
  '/admin/payments':      'payments',
  '/admin/email-queue':   'email-queue',
  '/admin/ai-spots':      'ai-spots',
  '/admin/communications':'communications',
  '/admin/journey':       'journey',
  '/admin/crm':           'crm',
  '/admin/partners':      'partners',
  '/admin/audit-log':     'audit-log',
}

function getPageKey(pathname: string): string | null {
  for (const [route, page] of Object.entries(ROUTE_PAGE_MAP)) {
    if (pathname === route || pathname.startsWith(route + '/')) return page
  }
  return null
}

// ── Main middleware ───────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Admin route protection ─────────────────────────────────────────────────
  if (ADMIN_PROTECTED.test(pathname)) {
    const token = request.cookies.get('admin_token')?.value

    // No token → login page
    if (!token) return NextResponse.redirect(new URL('/admin', request.url))

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
      )

      const role      = (payload.role as string) ?? 'channel_admin'
      const roleLevel = ROLE_LEVEL[role] ?? 0

      // dev_admin → always pass through
      if (role === 'dev_admin') return NextResponse.next()

      // Check minimum level for this specific page
      const pageKey  = getPageKey(pathname)
      const minLevel = pageKey ? (PAGE_MIN_LEVEL[pageKey] ?? 100) : 100

      if (roleLevel < minLevel) {
        // Redirect to dashboard with a query param so we can show a toast
        const url = new URL('/admin/dashboard', request.url)
        url.searchParams.set('denied', '1')
        return NextResponse.redirect(url)
      }

      return NextResponse.next()

    } catch {
      // Invalid / expired token → clear and redirect to login
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('admin_token')
      return response
    }
  }

  // ── Student route protection ───────────────────────────────────────────────
  if (isStudentProtected(pathname)) {
    const { supabaseResponse, user } = await updateSession(request)
    if (!user) {
      const redirectUrl = new URL('/signin', request.url)
      const fullPath = pathname + (request.nextUrl.search ?? '')
      redirectUrl.searchParams.set('next', fullPath)
      return NextResponse.redirect(redirectUrl)
    }
    return supabaseResponse
  }

  // ── Public routes — refresh session ───────────────────────────────────────
  const { supabaseResponse } = await updateSession(request)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf)$).*)',
  ],
}
