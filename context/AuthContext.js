'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para Login con Google
  const googleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Verificar si el usuario ya existe en Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Crear perfil inicial (Creyente)
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          rank: 'Creyente',
          elo: 800, // ELO base
          rimaCoins: 100, // Bono de bienvenida
          createdAt: serverTimestamp(),
          stats: {
            battles: 0,
            wins: 0,
            losses: 0
          }
        });
      }
    } catch (error) {
      console.error("Error en login:", error);
    }
  };

  const logout = () => {
    signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, googleLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUserAuth = () => {
  return useContext(AuthContext);
};
