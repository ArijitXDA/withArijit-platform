import { firebaseConfig } from './firebaseConfig'

// Client-side FCM push registration. Browser-only and fully guarded: it no-ops on
// SSR, unsupported browsers, a missing VAPID key, or a denied permission — so it can
// never break the dashboard. Registers the FCM service worker, obtains this device's
// push token, and saves it via /api/student/push/register (the server-side sender
// then reaches this phone for reminders + announcements).
export async function registerPushForStudent(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return { ok: false, reason: 'unsupported' }
  }
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) return { ok: false, reason: 'no-vapid' } // stays dormant until the key is set

  try {
    const [{ initializeApp, getApps, getApp }, messagingMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/messaging'),
    ])
    const { isSupported, getMessaging, getToken, onMessage } = messagingMod
    if (!(await isSupported())) return { ok: false, reason: 'unsupported' }

    let permission = Notification.permission
    if (permission === 'default') permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: 'denied' }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const messaging = getMessaging(app)
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
    if (!token) return { ok: false, reason: 'no-token' }

    await fetch('/api/student/push/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, platform: 'web' }),
    })

    // Foreground messages → nudge the NotificationBell to refresh.
    onMessage(messaging, (payload) => {
      try { window.dispatchEvent(new CustomEvent('ostaran:notification', { detail: payload })) } catch {}
    })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'error' }
  }
}
