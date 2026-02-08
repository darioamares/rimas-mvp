'use client';

import React, { useEffect, useState } from 'react';
import { useUserAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { Zap, LogOut, User, Trophy, Mic2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, googleLogin, logout } = useUserAuth();
  const [rivals, setRivals] = useState([]);

  // 1. Escuchar la lista de rivales en tiempo real
  useEffect(() => {
    if (!user) return;

    // Consultamos la colección "users"
    const q = query(collection(db, "users")); 
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid); // Quitarte a ti mismo de la lista
      setRivals(docs);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Generador de ID de Sala (siempre el mismo para cada pareja)
  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join("_");
  };

  // --- ESTADO DE CARGA (Evita el pantallazo de error) ---
  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-cyan-500 font-black tracking-widest animate-pulse">CARGANDO MATRIZ...</p>
      </div>
    );
  }

  // --- PANTALLA DE LOGIN (Si no estás conectado) ---
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
        
        <div className="z-10 text-center flex flex-col items-center gap-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <Zap size={48} className="text-yellow-400 fill-yellow-400" />
            <h1 className="text-5xl font-black text-white italic tracking-tighter">
              RIMAS <span className="text-cyan-400">MVP</span>
            </h1>
          </div>
          
          <p className="text-white/60 text-sm font-bold tracking-widest leading-relaxed">
            LA PRIMERA PLATAFORMA DE FREESTYLE <br/> CON ANÁLISIS FONÉTICO EN TIEMPO REAL
          </p>

          <button 
            onClick={googleLogin}
            className="group relative w-full bg-white text-black font-black py-4 rounded-xl text-lg hover:bg-cyan-400 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <span className="flex items-center justify-center gap-3">
              <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" />
              INICIAR CON GOOGLE
            </span>
          </button>
        </div>
      </div>
    );
  }

  // --- LOBBY PRINCIPAL (Si ya estás conectado) ---
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 font-sans">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-10 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-xs font-bold text-cyan-400 tracking-widest mb-1">BIENVENIDO</h2>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black italic uppercase">{user.displayName}</h1>
          </div>
        </div>
        <button onClick={logout} className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      {/* LISTA DE RIVALES */}
      <main className="max-w-md mx-auto">
        <h3 className="text-sm font-black text-white/40 mb-6 flex items-center gap-2">
          <Trophy size={14} /> RIVALES DISPONIBLES ({rivals.length})
        </h3>

        <div className="flex flex-col gap-3">
          {rivals.length > 0 ? (
            rivals.map((rival) => (
              <Link 
                key={rival.id}
                href={`/rooms/${getChatId(user.uid, rival.id)}`}
                className="group relative p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-cyan-950/30 hover:border-cyan-500/50 transition-all flex items-center justify-between overflow-hidden"
              >
                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                <div className="flex items-center gap-4 z-10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-sm">
                    {rival.displayName ? rival.displayName[0] : 'R'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase">{rival.displayName || 'Anonimo'}</h4>
                    <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-1">
                       🏆 ELO: {rival.elo || 800}
                    </span>
                  </div>
                </div>

                <div className="z-10 bg-white text-black text-[10px] font-black px-4 py-2 rounded-lg group-hover:bg-cyan-400 transition-colors flex items-center gap-2">
                  <Mic2 size={12} /> RETAR
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
              <p className="text-white/30 text-sm font-bold italic">Buscando rivales...</p>
              <p className="text-[10px] text-white/20 mt-2">Dile a un amigo que entre para probar.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
