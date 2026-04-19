import { redirect, permanentRedirect } from 'next/navigation'

/**
 * /dashboard/ai-monitor → /dashboard/assistant-professor
 *
 * This route was renamed from "Class Monitor" / "AI Monitor" to
 * "Assistant Professor (AI)" on 2026-04-19. Kept as a permanent redirect
 * so any existing bookmarks, email links, or in-app references don't
 * break. Safe to remove once the old path hasn't been hit for 90+ days
 * (check Vercel access logs).
 */
export default function LegacyAIMonitorPage() {
  permanentRedirect('/dashboard/assistant-professor')
}
