// lib/rankingSystem.js

export const RANKS = {
  CREYENTE: { minElo: 0, name: 'Creyente', color: 'text-gray-400', icon: '♟️' },
  MVP: { minElo: 1000, name: 'MVP', color: 'text-cyan-400', icon: '⚡' },
  LEYENDA: { minElo: 1800, name: 'Leyenda', color: 'text-yellow-400', icon: '👑' },
  DEIDAD: { minElo: 2500, name: 'Deidad', color: 'text-rose-500', icon: '🔥' }
};

export const getRankInfo = (elo) => {
  if (elo >= RANKS.DEIDAD.minElo) return RANKS.DEIDAD;
  if (elo >= RANKS.LEYENDA.minElo) return RANKS.LEYENDA;
  if (elo >= RANKS.MVP.minElo) return RANKS.MVP;
  return RANKS.CREYENTE;
};

export const getNextRankProgress = (elo) => {
  let current, next;
  
  if (elo >= RANKS.DEIDAD.minElo) return 100; // Max level

  if (elo >= RANKS.LEYENDA.minElo) { current = RANKS.LEYENDA; next = RANKS.DEIDAD; }
  else if (elo >= RANKS.MVP.minElo) { current = RANKS.MVP; next = RANKS.LEYENDA; }
  else { current = RANKS.CREYENTE; next = RANKS.MVP; }

  const totalRange = next.minElo - current.minElo;
  const progress = elo - current.minElo;
  return Math.min(100, Math.max(0, (progress / totalRange) * 100));
};
