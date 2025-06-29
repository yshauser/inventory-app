// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging } from 'firebase/messaging';

// Determine if we're in development mode
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('192.168');

// Dynamically set authDomain based on environment
const authDomain = isDevelopment
  ? 'localhost'
  : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log('firebase config loaded');

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log('Environment:', isDevelopment ? 'Development' : 'Production');
console.log('Current hostname:', window.location.hostname);

let messaging = null;
try {
  if (!isDevelopment || import.meta.env.VITE_ENABLE_MESSAGING === 'true') {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.warn('Firebase messaging not available:', error.message);
}

export { app, db, auth, messaging };
