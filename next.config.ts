import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/create-qr-code/**',
      },
    ],
  },
  async redirects() {
    return [
      // Class Monitor → Assistant Professor (AI) rename — 2026-04-19.
      // Keep these 301s live indefinitely. External links (social, past
      // emails, Google cache) may still point to /dashboard/ai-monitor.
      {
        source: '/dashboard/ai-monitor',
        destination: '/dashboard/assistant-professor',
        permanent: true,
      },
      // Mirror for the API route so any cached client still works through one deploy cycle.
      {
        source: '/api/student/ai-monitor',
        destination: '/api/student/assistant-professor',
        permanent: true,
      },
      // AI Spots consolidated into Partner Programme — 2026-04-20.
      // The /ai-spots page was a placeholder; AI Spot (cafes/restaurants) is one
      // of five partner archetypes now managed at partner.ostaran.com. AI Spot
      // signup continues separately via AIwithArijit.com (Make scenarios 7811188
      // + 7542384 still active on aispot_master table).
      {
        source: '/ai-spots',
        destination: 'https://partner.ostaran.com',
        permanent: true,
      },
      // Library moved behind auth — 2026-04-21. Old public /library page used
      // the `library_items` table (10 items); new /dashboard/library uses the
      // richer `library` table (29 items) with category/author/level search,
      // modal reader, and URL-hiding proxy at /api/student/library/stream/[id].
      // Student auth middleware handles the sign-in prompt when unauthenticated.
      {
        source: '/library',
        destination: '/dashboard/library',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    // ── Recruiter module proxy — 2026-05-22 ─────────────────────────────────
    // The recruiter product lives in the partner.ostaran.com codebase
    // (with-arijit-mar26): pages, APIs, DB access, recruiter auth. We surface
    // it under www.ostaran.com/recruit via a server-side rewrite so the public
    // URL stays clean. ONLY the recruiter-scoped paths are proxied — the
    // student platform's own /auth/callback and /api/* are untouched.
    //
    // Recruiter auth is self-contained: /recruit/auth/callback verifies the
    // OTP and /api/recruit/send-otp sends it, both under the proxied prefixes.
    // Both apps share the same Supabase project, so the session cookie set on
    // www.ostaran.com is forwarded to partner on each proxied request.
    return [
      { source: '/recruit',          destination: 'https://partner.ostaran.com/recruit' },
      { source: '/recruit/:path*',    destination: 'https://partner.ostaran.com/recruit/:path*' },
      { source: '/api/recruit/:path*', destination: 'https://partner.ostaran.com/api/recruit/:path*' },
    ]
  },
};

export default nextConfig;
