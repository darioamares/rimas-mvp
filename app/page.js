'use client';

import React, { useEffect, useState } from 'react';
import { useUserAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import Link from 'next/link';
// Si no instalaste iconos, usa texto simple. Si instalaste lucide-react, descomenta la siguiente linea:
// import { Zap, LogOut, Trophy, Mic2 } from 'lucide-react';

export default function HomePage() {
  // 1. TODOS LOS HOOKS PRIMERO (Regla de Oro de React)
  const { user, loading, googleLogin, logout } = useUserAuth();
  const [rivals, setRivals] = useState([]);

  useEffect(() => {
    if (!user) return;
    
    // Escuchar lista de usuarios (menos tú mismo)
    const q = query(collection(db, "users")); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid);
      setRivals(docs);
    });

    return () => unsubscribe();
  }, [user]);

  // Helper para generar ID de sala único
  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join("_");
  };

  // 2. AHORA SÍ, LOS CONDICIONALES DE RENDERIZADO

  // A) Pantalla de Carga
  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-500 font-bold animate-pulse">CARGANDO MATRIZ...</div>
      </div>
    );
  }

  // B) Pantalla de Login (Si no estás conectado)
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
        <h1 className="text-5xl font-black italic mb-4">
          RIMAS <span className="text-cyan-400">MVP</span>
        </h1>
        <p className="text-white/60 mb-8 font-bold tracking-widest">PLATAFORMA DE FREESTYLE</p>
        <button 
          onClick={googleLogin}
          className="bg-white text-black font-black py-4 px-8 rounded-xl hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          INICIAR CON GOOGLE
        </button>
      </div>
    );
  }

  // C) El Lobby (Lista de Rivales)
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-10 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-xs font-bold text-cyan-400 tracking-widest">BIENVENIDO</h2>
          <h1 className="text-2xl font-black uppercase">{user.displayName}</h1>
        </div>
        <button onClick={logout} className="text-[10px] font-bold text-red-500 border border-red-500/30 px-4 py-2 rounded-full hover:bg-red-500/10 transition-all">
          CERRAR SESIÓN
        </button>
      </header>

      <main className="max-w-md mx-auto">
        <h3 className="text-xs font-black text-white/40 mb-6 uppercase tracking-widest">
          Rivales Disponibles ({rivals.length})
        </h3>

        <div className="flex flex-col gap-3">
          {rivals.length > 0 ? (
            rivals.map((rival) => (
              <Link 
                key={rival.id}
                href={`/rooms/${getChatId(user.uid, rival.id)}`}
                className="group p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-cyan-500/50 hover:bg-cyan-900/10 transition-all flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-sm uppercase text-white group-hover:text-cyan-400 transition-colors">
                    {rival.displayName || 'Anonimo'}
                  </h4>
                  <span className="text-[10px] text-yellow-500 font-bold block mt-1">
                    🏆 ELO: {rival.elo || 800}
                  </span>
                </div>
                <div className="bg-cyan-500 text-black text-[10px] font-black px-4 py-2 rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                  RETAR
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
              <p className="text-white/30 italic text-sm">Esperando rivales...</p>
              <p className="text-[10px] text-white/20 mt-2">Abre otra ventana incógnita para probar</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
