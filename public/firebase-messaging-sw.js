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
  const isIncomingCall = data.type === "incoming_call";
  const callType = data.callType === "video" ? "Video" : "Audio";
  const callerName = data.callerName || "Someone";

  self.registration.showNotification(
    isIncomingCall ? `Incoming ${callType} Call` : notification.title || "New Notification",
    {
    body: isIncomingCall
      ? `${callerName} is calling`
      : notification.body || "",
    icon: data.callerAvatar || notification.icon || "/icons/icon-192.png",
    badge: notification.badge || "/icons/icon-192.png",
    tag: isIncomingCall
      ? `incoming_call_${data.callId || data.roomId || "active"}`
      : data.tag || undefined,
    renotify: true,
    requireInteraction: isIncomingCall,
    actions: isIncomingCall
      ? [
          { action: "accept_call", title: "Accept" },
          { action: "decline_call", title: "Decline" },
        ]
      : [],
    data: {
      url: data.url || "/chat",
      callId: data.callId || "",
      roomId: data.roomId || "",
      type: data.type || "notification",
    },
    }
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "decline_call") {
    return;
  }

  const baseUrl = event.notification?.data?.url || "/chat";
  const targetUrl =
    event.action === "accept_call" && !baseUrl.includes("acceptCall=1")
      ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}acceptCall=1`
      : baseUrl;

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
