'use client'
import { useEffect } from 'react'
import { registerPushForStudent } from '@/lib/pushClient'

// Mounts on the student dashboard (logged-in only). After a short delay (so the
// permission prompt isn't the first thing on load), it registers the FCM service
// worker + this device's push token. No UI, no-ops until the VAPID key is set and
// the student grants notification permission.
export default function PushRegistrar() {
  useEffect(() => {
    const t = setTimeout(() => { registerPushForStudent().catch(() => {}) }, 2500)
    return () => clearTimeout(t)
  }, [])
  return null
}
