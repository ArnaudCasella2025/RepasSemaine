import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, signInAnonymously } from 'firebase/auth';
import { Firestore, initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  // React Native's networking layer doesn't reliably support Firestore's default
  // streaming (WebChannel) transport, so fall back to long-polling. Safari fails
  // that long-polling transport's fetch()-based implementation with a CORS-like
  // "access control checks" error; useFetchStreams forces the older XHR-based
  // implementation instead, which Safari handles fine. It's a real, working
  // option supported by the SDK at runtime, just not exposed on the public
  // settings type — hence the cast.
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false,
  } as Parameters<typeof initializeFirestore>[1]);
}

export { auth, db };

export async function ensureSignedIn(): Promise<void> {
  if (!auth) return;
  if (auth.currentUser) return;
  await signInAnonymously(auth);
}

export const HOUSEHOLD_DOC_PATH = ['households', process.env.EXPO_PUBLIC_HOUSEHOLD_ID || 'default'] as const;
