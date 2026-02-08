'use client';

import React, { useEffect, useState } from 'react';
import { useUserAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import Link from 'next/link';
// Usamos iconos simples. Si falla, borra esta línea y quita los iconos del HTML
import { Zap, LogOut, Trophy, Mic2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, googleLogin, logout } = useUserAuth();
  const [rivals, setRivals] = useState([]);

  // 1. Cargar lista de rivales
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users")); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filtramos para que no te veas a ti mismo en la lista
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid);
      setRivals(docs);
    });
    return () => unsubscribe();
  }, [user]);

  // Generar ID único para la sala de chat
  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join("_");
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-cyan-500">CARGANDO...</div>;

  // LOGIN (Si no estás conectado)
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className="text-4xl font-bold mb-8">RIMAS MVP</h1>
        <button onClick={googleLogin} className="bg-white text-black px-6 py-3 rounded-lg font-bold">
          ENTRAR CON GOOGLE
        </button>
      </div>
    );
  }

  // LOBBY (Si ya entraste)
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex justify-between items-center mb-8 border-b border-white/20 pb-4">
        <h1 className="text-xl font-bold text-cyan-400">HOLA, {user.displayName?.toUpperCase()}</h1>
        <button onClick={logout} className="text-red-500 text-sm font-bold border border-red-500 px-3 py-1 rounded">SALIR</button>
      </div>

      <h2 className="text-white/50 mb-4 font-bold text-sm">RIVALES DISPONIBLES:</h2>

      <div className="flex flex-col gap-3">
        {rivals.map((rival) => (
          <Link 
            key={rival.id} 
            href={`/rooms/${getChatId(user.uid, rival.id)}`}
            className="bg-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-white/20 transition-all border border-white/5"
          >
            <span className="font-bold">{rival.displayName || 'Usuario Anónimo'}</span>
            <span className="bg-cyan-500 text-black text-xs font-black px-3 py-1 rounded">RETAR AHORA</span>
          </Link>
        ))}
        
        {rivals.length === 0 && (
          <p className="text-white/30 italic text-center mt-10">No hay nadie más conectado...</p>
        )}
      </div>
    </div>
  );
}
