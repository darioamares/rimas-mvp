export const saveBattle = (battleData) => {
  const battles = JSON.parse(localStorage.getItem('rimas_battles') || '[]');
  battles.push({
    id: Date.now(),
    ...battleData,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('rimas_battles', JSON.stringify(battles));
};

export const getBattles = () => {
  return JSON.parse(localStorage.getItem('rimas_battles') || '[]');
};

export const deleteBattle = (id) => {
  const battles = JSON.parse(localStorage.getItem('rimas_battles') || '[]');
  const filtered = battles.filter(b => b.id !== id);
  localStorage.setItem('rimas_battles', JSON.stringify(filtered));
};
