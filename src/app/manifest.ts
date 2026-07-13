import type { MetadataRoute } from 'next'

// Web App Manifest → makes the student dashboard installable and is what the Android
// TWA (via PWABuilder) wraps. Served at /manifest.webmanifest; Next auto-links it.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'oStaran AI Education',
    short_name:       'oStaran',
    description:      'Your oStaran student dashboard — live sessions, recordings, study material and the AI Assistant Professor.',
    start_url:        '/dashboard',
    scope:            '/',
    display:          'standalone',
    orientation:      'portrait',
    background_color: '#ffffff',
    theme_color:      '#2563eb',
    categories:       ['education'],
    icons: [
      { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
