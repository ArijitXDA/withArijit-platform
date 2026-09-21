'use client'

import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { CookieConsent } from '@/components/shared/CookieConsent'

/**
 * Global chrome that must NOT render inside the embeddable /embed/* widget — a cookie-consent
 * banner or the Razorpay checkout script appearing inside a partner's iframe would be junk on
 * their site. Everywhere else this renders exactly as before.
 */
export function ChromeExtras() {
  const pathname = usePathname() || ''
  if (pathname.startsWith('/embed')) return null
  return (
    <>
      <CookieConsent />
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
    </>
  )
}
