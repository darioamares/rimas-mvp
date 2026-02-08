'use client';

import React, { useEffect, useState } from 'react';
import { useUserAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import Link from 'next/link';
// Importamos iconos simples para el menú
import { Zap, LogOut, Trophy, Mic2 } from 'lucide-react';

export default function HomePage() {
  // 1. HOOKS (Siempre primero)
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

  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join("_");
  };

  // 2. PANTALLA DE CARGA
  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-cyan-500 font-black tracking-widest animate-pulse">CARGANDO MATRIZ...</p>
      </div>
    );
  }

  // 3. PANTALLA DE LOGIN (Si no estás conectado)
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
        <h1 className="text-5xl font-black italic mb-4">
          RIMAS <span className="text-cyan-400">MVP</span>
        </h1>
        <p className="text-white/60 mb-8 font-bold tracking-widest">PLATAFORMA DE FREESTYLE</p>
        <button 
          onClick={googleLogin}
          className="bg-white text-black font-black py-4 px-8 rounded-xl hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-3"
        >
          <Zap size={20} /> INICIAR CON GOOGLE
        </button>
      </div>
    );
  }

  // 4. EL LOBBY (Lista de Rivales)
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-10 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-xs font-bold text-cyan-400 tracking-widest">BIENVENIDO</h2>
          <h1 className="text-2xl font-black uppercase">{user.displayName}</h1>
        </div>
        <button onClick={logout} className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 text-red-500 transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      <main className="max-w-md mx-auto">
        <h3 className="text-xs font-black text-white/40 mb-6 uppercase tracking-widest flex items-center gap-2">
          <Trophy size={14} /> Rivales Disponibles ({rivals.length})
        </h3>

        <div className="flex flex-col gap-3">
          {rivals.length > 0 ? (
            rivals.map((rival) => (
              <Link 
                key={rival.id}
                href={`/rooms/${getChatId(user.uid, rival.id)}`}
                className="group p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-cyan-500/50 hover:bg-cyan-900/10 transition-all flex justify-between items-center"
              >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-800 flex items-center justify-center font-black">
                      {rival.displayName ? rival.displayName[0] : 'R'}
                   </div>
                   <div>
                      <h4 className="font-bold text-sm uppercase text-white group-hover:text-cyan-400 transition-colors">
                        {rival.displayName || 'Anonimo'}
                      </h4>
                      <span className="text-[10px] text-yellow-500 font-bold block mt-1">
                        ELO: {rival.elo || 800}
                      </span>
                   </div>
                </div>
                <div className="bg-cyan-500 text-black text-[10px] font-black px-4 py-2 rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.4)] flex items-center gap-2">
                  <Mic2 size={12} /> RETAR
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
              <p className="text-white/30 italic text-sm">Esperando rivales...</p>
              <p className="text-[10px] text-white/20 mt-2">Dile a Sebastián que entre para probar.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
