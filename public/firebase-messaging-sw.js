/* oStaran Student — Firebase Cloud Messaging service worker.
   Handles background push (app closed / backgrounded) and, via the no-op fetch
   handler, satisfies the PWA installability criteria for the Android TWA.
   The config below is PUBLIC Firebase client config (not a secret). */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
// A (no-op) fetch handler is required for the app to be installable.
self.addEventListener('fetch', () => {});

try {
  firebase.initializeApp({
    apiKey: 'AIzaSyCujy-4c5hs6qqVRzU9Zn2_5Abpy47_c50',
    authDomain: 'ostaran-android-student-app.firebaseapp.com',
    projectId: 'ostaran-android-student-app',
    messagingSenderId: '182197012241',
    appId: '1:182197012241:web:81e6be8724cb027f636eb0',
  });
  const messaging = firebase.messaging();
  // Sends are DATA-ONLY (see src/lib/fcm.ts) so the SDK neither displays nor intercepts anything —
  // this is the single place a background notification is rendered, and the data carries the link.
  messaging.onBackgroundMessage((payload) => {
    const d = payload.data || {};
    self.registration.showNotification(d.title || 'oStaran', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: d,
    });
  });
} catch (e) { /* messaging unavailable in this browser */ }

// Tapping a notification opens its deep link.
//
// Class reminders point at a Teams meeting, so the destination is often off-site. WindowClient
// .navigate() only accepts same-origin URLs and returns a PROMISE — the previous version wrapped it
// in a synchronous try/catch (which cannot catch an async rejection) and then called focus()
// regardless, so an off-site tap surfaced the app on whatever page it happened to be on and quietly
// dropped the link. Cross-origin destinations therefore go through openWindow(), which allows them.
//
// It also took the FIRST window client unconditionally, so an unrelated ostaran.com tab open in
// Chrome could be hijacked and navigated instead of the app. Now only a client already on our
// origin is reused.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/dashboard';

  let sameOrigin = true;
  try { sameOrigin = new URL(link, self.location.origin).origin === self.location.origin; }
  catch (e) { sameOrigin = true; }

  event.waitUntil((async () => {
    if (!sameOrigin) return clients.openWindow(link);
    const target = new URL(link, self.location.origin).href;
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (!w.url || new URL(w.url).origin !== self.location.origin) continue;
      try { await w.navigate(target); } catch (e) { /* fall through to focus */ }
      return w.focus();
    }
    return clients.openWindow(target);
  })());
});
