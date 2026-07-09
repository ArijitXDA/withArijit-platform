/**
 * admin-auth.ts
 * Shared utility for reading and verifying the admin JWT token in Server Components,
 * Server Actions, and API Route Handlers.
 *
 * The JWT is issued by /api/auth/admin-login and stored in the `admin_token` cookie.
 * Payload: { sub: adminId, email, role, channel_scope? }
 */

import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

// ── Role hierarchy ────────────────────────────────────────────────────────────
export type AdminRole =
  | 'dev_admin'
  | 'super_admin'
  | 'channel_admin'
  | 'root_partner_admin'

/** Numeric power level — higher = more access */
const ROLE_LEVEL: Record<AdminRole, number> = {
  dev_admin:           100,
  super_admin:          80,
  channel_admin:        40,
  root_partner_admin:   20,
}

// ── Decoded admin context ─────────────────────────────────────────────────────
export interface AdminContext {
  id:            string
  email:         string
  role:          AdminRole
  channel_scope: string | null
}

// ── Core reader ───────────────────────────────────────────────────────────────
/**
 * Read the admin_token cookie and verify it.
 * Returns the decoded AdminContext, or null if missing / invalid / expired.
 * Safe to call in any Server Component — never throws.
 */
export async function getAdminFromToken(): Promise<AdminContext | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value
    if (!token) return null

    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)

    return {
      id:            payload.sub as string,
      email:         payload.email as string,
      role:          (payload.role as AdminRole) ?? 'channel_admin',
      channel_scope: (payload.channel_scope as string | null) ?? null,
    }
  } catch {
    return null
  }
}

// ── Convenience helpers ───────────────────────────────────────────────────────

/** Is this admin a dev_admin? (God mode — full access) */
export function isDevAdmin(ctx: AdminContext | null): boolean {
  return ctx?.role === 'dev_admin'
}

/** Is this admin a super_admin or higher? */
export function isSuperAdmin(ctx: AdminContext | null): boolean {
  if (!ctx) return false
  return ROLE_LEVEL[ctx.role] >= ROLE_LEVEL['super_admin']
}

/** Does this admin meet the minimum role level? */
export function hasMinRole(ctx: AdminContext | null, minRole: AdminRole): boolean {
  if (!ctx) return false
  return ROLE_LEVEL[ctx.role] >= ROLE_LEVEL[minRole]
}

// ── Permission map — what each role can access ────────────────────────────────
/**
 * Returns true if the given admin context is allowed to access the given page key.
 * This is the single source of truth — middleware, sidebar, and page guards all
 * call this same function.
 */
export function canAccess(ctx: AdminContext | null, page: AdminPage): boolean {
  if (!ctx) return false
  if (ctx.role === 'dev_admin') return true   // dev_admin: God mode

  const perms = PAGE_PERMISSIONS[page]
  if (!perms) return false
  return perms.includes(ctx.role)
}

// All known admin page keys
export type AdminPage =
  | 'dashboard'
  | 'students'
  | 'sessions'
  | 'session-links'
  | 'certificates'
  | 'library'
  | 'courses'
  | 'payments'
  | 'email-queue'
  | 'ai-spots'
  | 'communications'
  | 'journey'
  | 'crm'
  | 'partners'
  | 'audit-log'
  | 'lifecycle-status'
  | 'settings'

/**
 * Which non-dev roles can access each page.
 * dev_admin always has access (checked above).
 */
const PAGE_PERMISSIONS: Record<AdminPage, AdminRole[]> = {
  // Available to everyone with a valid admin token
  dashboard:      ['super_admin', 'channel_admin', 'root_partner_admin'],
  students:       ['super_admin', 'channel_admin', 'root_partner_admin'],
  sessions:       ['super_admin', 'channel_admin'],
  'session-links':['super_admin', 'channel_admin'],
  certificates:   ['super_admin', 'channel_admin'],
  library:        ['super_admin', 'channel_admin'],
  courses:        ['super_admin', 'channel_admin'],
  'ai-spots':     ['super_admin', 'channel_admin'],
  communications: ['super_admin', 'channel_admin'],
  journey:        ['super_admin', 'channel_admin'],

  // super_admin only
  payments:          ['super_admin'],
  'email-queue':     ['super_admin'],
  partners:          ['super_admin'],
  crm:               ['super_admin'],
  'audit-log':       ['super_admin'],
  'lifecycle-status':['super_admin'],
  settings:          ['super_admin'],
}

// ── URL → page key mapping (used in middleware) ───────────────────────────────
export const ROUTE_PAGE_MAP: Record<string, AdminPage> = {
  '/admin/dashboard':    'dashboard',
  '/admin/students':     'students',
  '/admin/sessions':     'sessions',
  '/admin/session-links':'session-links',
  '/admin/certificates': 'certificates',
  '/admin/library':      'library',
  '/admin/courses':      'courses',
  '/admin/payments':     'payments',
  '/admin/email-queue':  'email-queue',
  '/admin/ai-spots':     'ai-spots',
  '/admin/communications':'communications',
  '/admin/journey':      'journey',
  '/admin/crm':          'crm',
  '/admin/partners':     'partners',
  '/admin/audit-log':       'audit-log',
  '/admin/lifecycle-status':'lifecycle-status',
  '/admin/settings':        'settings',
}
