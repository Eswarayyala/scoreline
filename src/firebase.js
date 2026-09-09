import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();