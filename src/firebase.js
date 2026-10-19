import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Firebase web config is public by design (protected by Auth + security rules, not by hiding the key).
const firebaseConfig = {
  apiKey: "AIzaSyBlQWnHSz_ennegidtyrwiap6Oe_YtNtqI",
  authDomain: "scoreliner.firebaseapp.com",
  projectId: "scoreliner",
  storageBucket: "scoreliner.firebasestorage.app",
  messagingSenderId: "884777080649",
  appId: "1:884777080649:web:bcb97cc996a33e830cac98",
};

const GOOGLE_CLIENT_ID = "884777080649-frh0aih3g40ce6k9uoj9ak9s7mkiieps.apps.googleusercontent.com";
const GOOGLE_NONCE_KEY = "grindinfo-google-nonce";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDb = import.meta.env.VITE_FIREBASE_DATABASE_URL
  ? getDatabase(app, import.meta.env.VITE_FIREBASE_DATABASE_URL)
  : null;
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

function isLocalHost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

function startGoogleRedirect() {
  const nonce = randomNonce();
  sessionStorage.setItem(GOOGLE_NONCE_KEY, nonce);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: window.location.origin,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    prompt: "select_account",
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function signInWithGoogle() {
  if (isLocalHost()) {
    return signInWithPopup(auth, googleProvider);
  }
  startGoogleRedirect();
}

export async function completeGoogleSignInReturn() {
  if (!window.location.hash.startsWith("#")) return false;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const error = hash.get("error");
  const idToken = hash.get("id_token");
  if (!error && !idToken) return false;

  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);

  if (error) {
    const failed = new Error(hash.get("error_description") || error);
    failed.code = error === "redirect_uri_mismatch" ? "auth/unauthorized-domain" : "auth/google-failed";
    throw failed;
  }

  const expectedNonce = sessionStorage.getItem(GOOGLE_NONCE_KEY);
  sessionStorage.removeItem(GOOGLE_NONCE_KEY);
  const payload = decodeJwtPayload(idToken);
  if (expectedNonce && payload.nonce !== expectedNonce) {
    const failed = new Error("Google sign-in could not be verified.");
    failed.code = "auth/google-failed";
    throw failed;
  }

  await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  return true;
}
