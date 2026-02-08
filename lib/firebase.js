import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Credenciales extraídas directamente de tu consola de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDf-Q4z8PmmJpUODXt-jON8dAMuHD0WAuU",
  authDomain: "rimas-mvp.firebaseapp.com",
  projectId: "rimas-mvp",
  storageBucket: "rimas-mvp.firebasestorage.app",
  messagingSenderId: "792213805621",
  appId: "1:792213805621:web:402b889cdba5dba8d66f7c"
};

// Singleton pattern para evitar reinicializaciones en Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
