'use client';

import { useContext, createContext, useState, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";

// Creamos el contexto con un valor por defecto seguro para evitar el error "undefined"
const AuthContext = createContext({
  user: null,
  loading: true,
  googleLogin: () => {},
  logout: () => {}
});

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const googleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const logout = () => {
    signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Cuando Firebase responde, dejamos de cargar
    });
    return () => unsubscribe();
  }, []);

  // IMPORTANTE: El value nunca debe ser undefined
  return (
    <AuthContext.Provider value={{ user, loading, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(AuthContext);
  // Si por alguna razón el contexto es undefined (error de build), devolvemos un objeto vacío seguro
  if (context === undefined) {
    return { user: null, loading: true, googleLogin: () => {}, logout: () => {} };
  }
  return context;
};
