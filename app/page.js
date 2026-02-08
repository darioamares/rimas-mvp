'use client';

import React, { useEffect, useState } from 'react';
import { useUserAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import Link from 'next/link';

// NOTA: He quitado todos los iconos para asegurar que Vercel construya la página sin errores.

export default function HomePage() {
  const { user, loading, googleLogin, logout } = useUserAuth();
  const [rivals, setRivals] = useState([]);

  // 1. Cargar lista de rivales
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users")); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid);
      setRivals(docs);
    });
    return () => unsubscribe();
  }, [user]);

  // Generar ID único
  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join("_");
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-cyan-500">CARGANDO SISTEMA...</div>;

  // LOGIN
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className="text-4xl font-bold mb-8">RIMAS MVP (Modo Seguro)</h1>
        <button 
          onClick={googleLogin} 
          className="bg-white text-black px-8 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition-all"
        >
          INICIAR SESIÓN CON GOOGLE
        </button>
      </div>
    );
  }

  // LOBBY
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex justify-between items-center mb-8 border-b border-white/20 pb-4">
        <h1 className="text-xl font-bold text-cyan-400">HOLA, {user.displayName?.toUpperCase()}</h1>
        <button 
          onClick={logout} 
          className="text-red-500 text-xs font-bold border border-red-500 px-4 py-2 rounded uppercase"
        >
          Cerrar Sesión
        </button>
      </div>

      <h2 className="text-white/50 mb-4 font-bold text-sm tracking-widest">RIVALES DISPONIBLES ({rivals.length}):</h2>

      <div className="flex flex-col gap-3">
        {rivals.length > 0 ? (
          rivals.map((rival) => (
            <Link 
              key={rival.id} 
              href={`/rooms/${getChatId(user.uid, rival.id)}`}
              className="bg-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-cyan-900/40 border border-white/10 transition-all"
            >
              <span className="font-bold text-sm">{rival.displayName || 'ANONIMO'}</span>
              <span className="bg-cyan-500 text-black text-[10px] font-black px-3 py-1.5 rounded">RETAR</span>
            </Link>
          ))
        ) : (
          <p className="text-white/30 italic text-center py-10 border border-dashed border-white/10 rounded-xl">
            Esperando a que entre más gente...
          </p>
        )}
      </div>
    </div>
  );
}
