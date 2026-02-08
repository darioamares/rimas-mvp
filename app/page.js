'use client';

import React, { useEffect, useState } from 'react';
import { useUserAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Zap, LogOut, Trophy, Mic2, Pencil, Check, X } from 'lucide-react';

export default function HomePage() {
  const { user, loading, googleLogin, logout } = useUserAuth();
  const [rivals, setRivals] = useState([]);
  
  // Estados para la edición de nombre
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");

  // 1. Cargar lista de rivales
  useEffect(() => {
    if (!user) return;
    setNewName(user.displayName || ""); // Inicializar nombre

    const q = query(collection(db, "users")); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid);
      setRivals(docs);
    });
    return () => unsubscribe();
  }, [user]);

  // Función para guardar el nuevo nombre
  const saveNickname = async () => {
    if (!newName.trim()) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { displayName: newName.toUpperCase() });
      setIsEditing(false);
    } catch (error) {
      console.error("Error al actualizar nombre:", error);
    }
  };

  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join("_");
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-cyan-500 font-bold animate-pulse">CARGANDO...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className="text-5xl font-black italic mb-4">RIMAS <span className="text-cyan-400">MVP</span></h1>
        <button onClick={googleLogin} className="bg-white text-black font-black py-4 px-8 rounded-xl hover:bg-cyan-400 transition-all flex items-center gap-3">
          <Zap size={20} /> INICIAR CON GOOGLE
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 font-sans">
      {/* HEADER CON EDICIÓN DE NOMBRE */}
      <header className="flex justify-between items-center mb-10 pb-6 border-b border-white/10">
        <div className="flex flex-col gap-1">
          <h2 className="text-xs font-bold text-cyan-400 tracking-widest">BIENVENIDO</h2>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white/10 text-white font-black uppercase p-1 rounded outline-none w-48"
                autoFocus
              />
              <button onClick={saveNickname} className="p-1 bg-green-500 rounded hover:bg-green-400"><Check size={16}/></button>
              <button onClick={() => setIsEditing(false)} className="p-1 bg-red-500 rounded hover:bg-red-400"><X size={16}/></button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              <h1 className="text-2xl font-black uppercase">{user.displayName}</h1>
              <button onClick={() => setIsEditing(true)} className="text-white/20 group-hover:text-cyan-400 transition-colors">
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>
        
        <button onClick={logout} className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 text-red-500 transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      {/* LISTA DE RIVALES */}
      <main className="max-w-md mx-auto">
        <h3 className="text-xs font-black text-white/40 mb-6 uppercase tracking-widest flex items-center gap-2">
          <Trophy size={14} /> Rivales Disponibles ({rivals.length})
        </h3>
        <div className="flex flex-col gap-3">
          {rivals.length > 0 ? (
            rivals.map((rival) => (
              <Link key={rival.id} href={`/rooms/${getChatId(user.uid, rival.id)}`} className="group p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-cyan-500/50 hover:bg-cyan-900/10 transition-all flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-800 flex items-center justify-center font-black">
                      {rival.displayName ? rival.displayName[0] : 'R'}
                   </div>
                   <div>
                      <h4 className="font-bold text-sm uppercase text-white group-hover:text-cyan-400 transition-colors">{rival.displayName || 'Anonimo'}</h4>
                      <span className="text-[10px] text-yellow-500 font-bold">ELO: {rival.elo || 800}</span>
                   </div>
                </div>
                <div className="bg-cyan-500 text-black text-[10px] font-black px-4 py-2 rounded-lg flex items-center gap-2 group-hover:scale-105 transition-transform">
                  <Mic2 size={12} /> RETAR
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
              <p className="text-white/30 italic text-sm">Esperando rivales...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
