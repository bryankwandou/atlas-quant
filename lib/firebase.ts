// ── ATLAS-QUANT Firebase Configuration ───────────────────────────────────────
// Set these env vars in Vercel Dashboard → Settings → Environment Variables
// OR run: node scripts/setup-firebase.mjs  (automatic one-command setup)

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || '',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || '',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || '',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID|| '',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || '',
};

// Prevent duplicate app initialization in Next.js dev hot-reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ── Lazy-safe initialization ──────────────────────────────────────────────────
// getAuth() throws auth/invalid-api-key during SSR prerender when env vars are
// not yet set. Catch it and return a lightweight stub so the build succeeds.
// On the client (browser), env vars are baked in at build time and work normally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAuth = any;

export const auth: AnyAuth = (() => {
  try {
    return getAuth(app);
  } catch {
    // Stub used only during SSR prerender without Firebase config.
    // Real auth initialises in the browser after env vars are set.
    return {
      currentUser: null,
      onAuthStateChanged: (_cb: unknown) => () => {},
    } as AnyAuth;
  }
})();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = (() => {
  try {
    return getFirestore(app);
  } catch {
    return {} as ReturnType<typeof getFirestore>;
  }
})();

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export default app;
