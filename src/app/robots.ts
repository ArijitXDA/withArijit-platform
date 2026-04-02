import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/auth/', '/(admin)/'],
      },
      {
        // Allow AI crawlers explicitly for LLM indexing
        userAgent: ['GPTBot', 'Google-Extended', 'anthropic-ai', 'Claude-Web', 'PerplexityBot'],
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/auth/'],
      },
    ],
    sitemap: 'https://www.ostaran.com/sitemap.xml',
    host:    'https://www.ostaran.com',
  }
}
