'use client';
// ── ATLAS-QUANT Firebase Auth Helpers ────────────────────────────────────────
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

// ── Master account emails (also set via Firestore role:'master') ──────────────
const MASTER_EMAILS = [
  process.env.NEXT_PUBLIC_MASTER_EMAIL || 'nayrbryangaming3@gmail.com',
];

// ── Firestore user document ───────────────────────────────────────────────────
export async function createUserDoc(user: User, extraData: Record<string, any> = {}) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const isMaster = MASTER_EMAILS.includes(user.email || '');
    await setDoc(ref, {
      uid:         user.uid,
      email:       user.email,
      displayName: user.displayName || extraData.username || '',
      photoURL:    user.photoURL || '',
      role:        isMaster ? 'master' : 'user',
      status:      'active',
      createdAt:   serverTimestamp(),
      lastLogin:   serverTimestamp(),
      ...extraData,
    });
    return isMaster ? 'master' : 'user';
  } else {
    // Update lastLogin
    await setDoc(ref, { lastLogin: serverTimestamp() }, { merge: true });
    return snap.data()?.role || 'user';
  }
}

// ── Get user role from Firestore ──────────────────────────────────────────────
export async function getUserRole(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.data()?.role || 'user';
  } catch {
    return 'user';
  }
}

// ── Register with email + password ───────────────────────────────────────────
export async function registerWithEmail(email: string, password: string, username: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: username });
  const role = await createUserDoc(user, { username });
  return { user, role };
}

// ── Sign in with email + password ─────────────────────────────────────────────
export async function loginWithEmail(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const role = await createUserDoc(user);
  return { user, role };
}

// ── Sign in with Google ───────────────────────────────────────────────────────
export async function loginWithGoogle() {
  const { user } = await signInWithPopup(auth, googleProvider);
  const role = await createUserDoc(user);
  return { user, role };
}

// ── Sign out ──────────────────────────────────────────────────────────────────
export async function signOut() {
  localStorage.removeItem('session_token');
  localStorage.removeItem('atlas_user');
  localStorage.removeItem('user_pubkey');
  localStorage.removeItem('refresh_token');
  await firebaseSignOut(auth);
}

// ── Persist session to localStorage (for SSR-safe auth checks) ───────────────
export function persistSession(user: User, role: string) {
  const token = `fb_${user.uid}_${Date.now()}`;
  localStorage.setItem('session_token', token);
  localStorage.setItem('atlas_user', JSON.stringify({
    uid:         user.uid,
    email:       user.email,
    displayName: user.displayName,
    photoURL:    user.photoURL,
    role,
  }));
}

// ── Auth state listener ───────────────────────────────────────────────────────
export { onAuthStateChanged, auth };
export type { User };

// ── Password reset ────────────────────────────────────────────────────────────
export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}
