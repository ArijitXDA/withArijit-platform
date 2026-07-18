import { firebaseConfig } from './firebaseConfig'

// Client-side FCM push registration. Browser-only and fully guarded: it no-ops on
// SSR, unsupported browsers, a missing VAPID key, or a denied permission — so it can
// never break the dashboard. Registers the FCM service worker, obtains this device's
// push token, and saves it via /api/student/push/register (the server-side sender
// then reaches this phone for reminders + announcements).
// Reports why no token was produced, so an admin can tell "denied" from "never opened the app".
// Best-effort and non-blocking: a failed report must never change what the student sees.
async function report(status: string, reason?: string): Promise<void> {
  try {
    await fetch('/api/student/push/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    })
  } catch { /* diagnostics only */ }
}

// Single-flight. PushRegistrar fires on a 2.5s timer and EnableNotifications fires on tap, so both
// can run at once — and two concurrent getToken() calls against a just-registered service worker can
// mint two DIFFERENT tokens for the same browser. Observed live: one student ended up with 3 tokens
// created within 2.5 minutes, which would deliver the same push to that browser three times.
// Sharing one in-flight promise means one registration attempt, one token.
let inflight: Promise<{ ok: boolean; reason?: string }> | null = null

export function registerPushForStudent(): Promise<{ ok: boolean; reason?: string }> {
  if (inflight) return inflight
  inflight = doRegister().finally(() => { inflight = null })
  return inflight
}

async function doRegister(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    void report('unsupported', 'no serviceWorker/Notification')
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
    if (!(await isSupported())) { void report('unsupported', 'firebase isSupported() false'); return { ok: false, reason: 'unsupported' } }

    let permission = Notification.permission
    if (permission === 'default') permission = await Notification.requestPermission()
    if (permission !== 'granted') { void report('denied', `permission=${permission}`); return { ok: false, reason: 'denied' } }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const messaging = getMessaging(app)
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
    if (!token) { void report('no_token', 'getToken returned empty'); return { ok: false, reason: 'no-token' } }

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
    void report('error', e?.message)
    return { ok: false, reason: e?.message || 'error' }
  }
}
