// ── Shared-content course group ───────────────────────────────────────────────
// These courses teach the SAME curriculum and share ONE batch pool: the AI Mastery
// Programme plus its audience-specific landing pages (working professionals, leaders,
// entrepreneurs, students, homemakers). A student enrolled in ANY of them picks from
// ALL the group's cohorts, and each audience course page shows the shared next-batch
// date (the audience pages carry no batches of their own).
//
// SINGLE SOURCE OF TRUTH — imported by /select-batch (batch picker) and
// /courses/[slug] (hero batch date). Add a new audience course's slug here to funnel
// it into the shared pool everywhere at once.
export const SHARED_CONTENT_SLUGS: string[] = [
  'ai-mastery-programme',
  'ai-mastery-for-working-professionals',
  'ai-mastery-for-leaders',
  'ai-mastery-for-entrepreneurs',
  'ai-mastery-for-students',
  'ai-mastery-for-homemakers',
]

export function isSharedContentSlug(slug?: string | null): boolean {
  return !!slug && SHARED_CONTENT_SLUGS.includes(slug)
}
