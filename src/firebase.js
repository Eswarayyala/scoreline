import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBlQWnHSz_ennegidtyrwiap6Oe_YtNtqI",
  authDomain: "scoreliner.firebaseapp.com",
  projectId: "scoreliner",
  storageBucket: "scoreliner.firebasestorage.app",
  messagingSenderId: "884777080649",
  appId: "1:884777080649:web:bcb97cc996a33e830cac98",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const realtimeDb = import.meta.env.VITE_FIREBASE_DATABASE_URL
  ? getDatabase(app, import.meta.env.VITE_FIREBASE_DATABASE_URL)
  : null;
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function completeGoogleSignInReturn() {
  if (!window.location.hash.startsWith("#")) return false;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  if (!hash.get("error") && !hash.get("id_token")) return false;
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return false;
}
