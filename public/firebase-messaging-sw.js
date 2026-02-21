importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDHlsOJcKCVb3g92iDXlYor77Kjwo1TIwU",
  authDomain: "orbitbytein.firebaseapp.com",
  projectId: "orbitbytein",
  storageBucket: "orbitbytein.firebasestorage.app",
  messagingSenderId: "234913419810",
  appId: "1:234913419810:web:81115400e786ca0012307b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notification = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(notification.title || "New Notification", {
    body: notification.body || "",
    icon: notification.icon || "/icons/icon-192.png",
    badge: notification.badge || "/icons/icon-192.png",
    data: {
      url: data.url || "/chat",
    },
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/chat";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "OPEN_URL", url: targetUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
