import { redirect } from 'next/navigation'

/**
 * /ai-spots — DEPRECATED, redirects to Partner Programme.
 *
 * AI Spots (cafes/restaurants) is now one of five partner archetypes managed
 * via partner.ostaran.com. The primary redirect is declared in next.config.ts
 * (runs at the edge, before any React rendering). This server component is a
 * belt-and-braces fallback — if the config redirect is ever removed/broken,
 * this file still sends visitors to the right place.
 *
 * Safe to delete this directory entirely (`rm -rf src/app/(public)/ai-spots`)
 * once the config redirect has been live for 2+ weeks and analytics confirm
 * no traffic is hitting the legacy page path.
 */
export default function AISpotsPage(): never {
  redirect('https://partner.ostaran.com')
}
