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
  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    self.registration.showNotification(n.title || 'oStaran', {
      body: n.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data || {},
    });
  });
} catch (e) { /* messaging unavailable in this browser */ }

// Tapping a notification focuses/opens the app at the notification's deep link.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { try { w.navigate(link); } catch (e) {} return w.focus(); }
      }
      return clients.openWindow(link);
    })
  );
});
