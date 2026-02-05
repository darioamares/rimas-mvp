'use client';
import React from 'react';
import { User, Coins, Trophy, Zap } from 'lucide-react';
import { getRankInfo, getNextRankProgress } from '../lib/rankingSystem';

export default function UserProfile({ user, onClose }) {
  if (!user) return null;

  // Datos seguros (si fallan, usa valores por defecto)
  const stats = user.stats || { battles: 0, wins: 0 };
  const elo = user.elo || 800;
  const coins = user.rimaCoins || 0;
  
  const rank = getRankInfo(elo);
  const progress = getNextRankProgress(elo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0a0c] border border-white/10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Fondo decorativo */}
        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${rank.name === 'MVP' ? 'from-cyan-900/50' : rank.name === 'Leyenda' ? 'from-yellow-900/50' : 'from-gray-800/50'} to-transparent`} />
        
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white z-10">✕</button>

        <div className="relative p-6 flex flex-col items-center gap-4 mt-4">
          {/* Avatar con anillo de rango */}
          <div className="relative group">
            <div className={`absolute -inset-1 rounded-full blur opacity-75 ${rank.color.replace('text-', 'bg-')}`}></div>
            <img 
              src={user.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
              alt="Avatar" 
              className="relative w-24 h-24 rounded-full border-2 border-white object-cover shadow-xl"
            />
            <div className="absolute -bottom-2 -right-2 bg-black border border-white/20 rounded-full p-1.5 text-xl shadow-lg">
                {rank.icon}
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-black text-white italic tracking-tight">{user.displayName || "MC ANÓNIMO"}</h2>
            <p className={`text-xs font-bold tracking-[0.3em] uppercase ${rank.color}`}>{rank.name} • {elo} ELO</p>
          </div>

          {/* Barra de Progreso */}
          <div className="w-full bg-white/5 h-2 rounded-full mt-2 overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-1000 ${rank.color.replace('text-', 'bg-')}`} 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[9px] text-white/30 w-full text-right mt-[-10px]">Próximo Rango {Math.round(progress)}%</p>

          {/* Estadísticas Grid */}
          <div className="grid grid-cols-3 gap-3 w-full mt-4">
            <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center border border-white/5">
                <Coins size={16} className="text-yellow-400 mb-1" />
                <span className="text-lg font-black text-white">{coins}</span>
                <span className="text-[8px] text-white/40 uppercase tracking-widest">Coins</span>
            </div>
            <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center border border-white/5">
                <Trophy size={16} className="text-cyan-400 mb-1" />
                <span className="text-lg font-black text-white">{stats.wins}</span>
                <span className="text-[8px] text-white/40 uppercase tracking-widest">Wins</span>
            </div>
            <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center border border-white/5">
                <Zap size={16} className="text-rose-500 mb-1" />
                <span className="text-lg font-black text-white">{stats.battles}</span>
                <span className="text-[8px] text-white/40 uppercase tracking-widest">Batallas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
