import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import { auth as sharedAuth } from './firebase';

/**
 * Exact OAuth scopes requested via set_up_oauth (principle of least privilege):
 * - spreadsheets: create and populate Google Sheets spreadsheets
 * - drive.file: manage sharing permissions strictly on files created by this app
 * - gmail.send: send explicit user-confirmed KPI threshold alert emails
 */
export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send',
] as const;

export const GOOGLE_SHEETS_SCOPES = GOOGLE_WORKSPACE_SCOPES;

// Strictly in-memory OAuth access token cache (NEVER persisted to localStorage/sessionStorage)
let inMemoryAccessToken: string | null = null;
let inMemoryTokenObtainedAt = 0;

function ensureFirebaseAuth(): Auth {
  return sharedAuth;
}

export function getInMemoryGoogleAccessToken(): string | null {
  if (!inMemoryAccessToken) return null;
  // Firebase Google OAuth access tokens typically expire after ~3600s; proactively require refresh after 50 mins
  const ageMs = Date.now() - inMemoryTokenObtainedAt;
  if (ageMs > 50 * 60 * 1000) {
    inMemoryAccessToken = null;
    return null;
  }
  return inMemoryAccessToken;
}

export function clearInMemoryGoogleAccessToken(): void {
  inMemoryAccessToken = null;
  inMemoryTokenObtainedAt = 0;
}

export function subscribeGoogleAuthUser(callback: (user: User | null) => void): () => void {
  const auth = ensureFirebaseAuth();
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      clearInMemoryGoogleAccessToken();
    }
    callback(user);
  });
}

export function getCurrentGoogleUser(): User | null {
  try {
    return ensureFirebaseAuth().currentUser;
  } catch {
    return null;
  }
}

export async function signInWithGoogleForSheets(): Promise<{
  user: User;
  accessToken: string;
}> {
  const auth = ensureFirebaseAuth();
  const provider = new GoogleAuthProvider();
  GOOGLE_SHEETS_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: 'consent select_account',
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error(
      "Le jeton d'accès Google Sheets n'a pas pu être récupéré. Veuillez réessayer la connexion."
    );
  }

  inMemoryAccessToken = token;
  inMemoryTokenObtainedAt = Date.now();

  return {
    user: result.user,
    accessToken: token,
  };
}

export async function signOutGoogleSheets(): Promise<void> {
  clearInMemoryGoogleAccessToken();
  const auth = ensureFirebaseAuth();
  await signOut(auth);
}
