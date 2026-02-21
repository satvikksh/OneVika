// app/lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDHlsOJcKCVb3g92iDXlYor77Kjwo1TIwU",
  authDomain: "orbitbytein.firebaseapp.com",
  projectId: "orbitbytein",
  storageBucket: "orbitbytein.firebasestorage.app",
  messagingSenderId: "234913419810",
  appId: "1:234913419810:web:81115400e786ca0012307b",
  measurementId: "G-KGY3SJT1PH",
};

const app = initializeApp(firebaseConfig);

export const messaging =
  typeof window !== "undefined" ? getMessaging(app) : null;

export const requestFCMToken = async () => {
  if (!messaging || typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  if (!("Notification" in window)) return null;

  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const token = await getToken(messaging, {
      vapidKey: "BN6E38PGc6fvgaxX4IKBdxqF8Its2bW3u0NXmXcBh3eeLlccx19Xd8sZrNYC9LWyGY1_zZrOAFL65v820Ryfod8",
      serviceWorkerRegistration: registration,
    });

    return token;
  } catch (error) {
    console.error("FCM Token Error:", error);
    return null;
  }
};
