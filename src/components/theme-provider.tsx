'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * oStaran marketing theme provider.
 *
 * Drives a DEDICATED `os-light` / `os-dark` class on <html> (via next-themes'
 * value map) — deliberately NOT shadcn's `.dark` class, so switching the
 * marketing theme never flips form/dashboard/admin primitives. Default = dark,
 * i.e. the site looks exactly as it does today until a visitor opts into light.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={['light', 'dark']}
      value={{ light: 'os-light', dark: 'os-dark' }}
      disableTransitionOnChange
      storageKey="ostaran-theme"
    >
      {children}
    </NextThemesProvider>
  )
}
