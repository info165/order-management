/**
 * Firebase Client Configuration & Service Initializer
 */
import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, browserLocalPersistence, setPersistence, createUserWithEmailAndPassword, signOut as fbSignOutSecondary } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import defaultConfig from '../../firebase-applet-config.json';

// Support both static json file and Cloudflare/Vercel Vite environment variables
const env = (import.meta as any).env || {};
const resolvedConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || defaultConfig.firestoreDatabaseId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || defaultConfig.measurementId || '',
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(resolvedConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);

// Keep Firebase auth session active across page refreshes
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase Auth persistence notice:', err);
  });
}

export const googleProvider = new GoogleAuthProvider();

// Use provisioned firestore database ID (supports custom named databases or standard '(default)')
const dbId = resolvedConfig.firestoreDatabaseId && resolvedConfig.firestoreDatabaseId !== '(default)'
  ? resolvedConfig.firestoreDatabaseId
  : undefined;

export const db: Firestore = dbId ? getFirestore(app, dbId) : getFirestore(app);

// Connection test helper
export async function verifyFirestoreConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    return { connected: true };
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.warn('Firestore status:', msg);
    return { connected: false, error: msg };
  }
}

// Creates a real Firebase Authentication account for a staff member issued
// username/password credentials by the Super Admin, WITHOUT signing the
// admin's own active session out (createUserWithEmailAndPassword on the
// primary auth instance would otherwise switch the current session to the
// newly created user). Runs on a throwaway secondary app instance instead.
// Returns the newly created account's Firebase Auth UID - callers need this to
// write the matching users/{uid} Firestore document that the security rules'
// hasUserDoc()/currentUserDoc() helpers look up by request.auth.uid.
export async function createAuthAccountForUser(email: string, password: string): Promise<string> {
  const secondaryApp = initializeApp(resolvedConfig, `secondary-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;
    await fbSignOutSecondary(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

export { app, resolvedConfig };

