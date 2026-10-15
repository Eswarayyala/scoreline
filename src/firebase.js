import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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

export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}
