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
    ]
  },
};

export default nextConfig;
