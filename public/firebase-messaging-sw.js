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
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icons/icon-192.png",
  });
});