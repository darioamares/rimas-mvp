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
      
      // Referencia al documento del usuario en la colección "users"
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      // Si el usuario no existe en la base de datos, lo creamos
      if (!userSnap.exists()) {
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
      } else {
        // Si ya existe, opcionalmente actualizamos su última conexión
        await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
      }
    } catch (error) {
      console.error("Error en login:", error);
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Monitor de estado de autenticación
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
