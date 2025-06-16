declare module '../firebase' {
  import { FirebaseApp } from 'firebase/app';
  import { Firestore } from 'firebase/firestore';
  import { Auth } from 'firebase/auth';
  import { Messaging } from 'firebase/messaging';
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

//   const app: FirebaseApp;
//   const db: Firestore;
//   const auth: Auth;
//   const messaging: Messaging;

  // Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const messaging = getMessaging(app);
}
  export { app, db, auth, messaging };

