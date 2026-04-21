import { redirect } from 'next/navigation'

// ────────────────────────────────────────────────────────────────────────
// Public /library — retired 2026-04-21. Library is now student-only at
// /dashboard/library. The primary 301 is in next.config.ts; this shim is
// defense-in-depth in case the config redirect is ever removed.
// ────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-static'

export default function LibraryRedirect() {
  redirect('/dashboard/library')
}
