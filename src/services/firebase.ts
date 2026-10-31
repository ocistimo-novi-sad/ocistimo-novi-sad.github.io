import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY ?? '').trim(),
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
  projectId: (env.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim(),
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '').trim(),
  appId: (env.VITE_FIREBASE_APP_ID ?? '').trim(),
};

/**
 * Firebase web config is public. When it is missing, the application runs in
 * an explicit demo mode instead of pretending to save data.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

export const firebaseProjectId = firebaseConfig.projectId || null;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // IndexedDB may be unavailable (private browsing). Fall back to memory.
      db = getFirestore(app);
    }
    auth = getAuth(app);
    // Photos live in Cloud Storage for Firebase; without a bucket the app
    // simply runs without photo uploads.
    if (firebaseConfig.storageBucket) storage = getStorage(app);
  } catch (error) {
    console.error('[Kuka i Motika] Firebase initialization failed', error);
  }
}

export { app, db, auth, storage };

export function requireDb(): Firestore {
  if (!db) {
    throw new Error('Firebase is not configured. Set the VITE_FIREBASE_* variables.');
  }
  return db;
}

export function requireAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.');
  }
  return auth;
}

export function requireStorage(): FirebaseStorage {
  if (!storage) {
    throw new Error('Cloud Storage for Firebase is not configured.');
  }
  return storage;
}
