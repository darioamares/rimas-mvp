'use client';

import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useUserAuth } from '../context/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const { user, logout } = useUserAuth();
  const [usuarios, setUsuarios] = useState([]);

  // 1. Escuchar la lista de usuarios registrados en Firebase
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid); // Filtra para no aparecer tú mismo en la lista
      setUsuarios(docs);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Función para crear un ID de sala único basado en los IDs de ambos usuarios
  // Esto asegura que ambos terminen en la misma URL independientemente de quién invite
  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join("_"); 
  };

  return (
    <div style={{ 
      backgroundColor: 'black', 
      color: 'white', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '40px 20px',
      fontFamily: 'sans-serif' 
    }}>
      {/* HEADER DEL LOBBY */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#00FFFF', fontSize: '3rem', fontWeight: '900', margin: '0', italic: 'italic' }}>
          ⚡ RIMAS MVP
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', fontSize: '12px', fontWeight: 'bold' }}>
          MODO: SELECCIÓN DE RIVAL
        </p>
      </div>

      {/* LISTA DE USUARIOS (RIVALES) */}
      <div style={{ 
        width: '100%', 
        maxWidth: '400px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px' 
      }}>
        {usuarios.length > 0 ? (
          usuarios.map((rival) => (
            <Link 
              key={rival.id}
              href={`/rooms/${getChatId(user.uid, rival.id)}`}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '20px', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '15px', 
                textDecoration: 'none',
                transition: '0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00FFFF'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              <div>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
                  {rival.displayName || 'FREESTYLER ANÓNIMO'}
                </div>
                <div style={{ color: '#00FFFF', fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>
                  • DISPONIBLE
                </div>
              </div>
              <div style={{ 
                background: '#00FFFF', 
                color: 'black', 
                padding: '8px 15px', 
                borderRadius: '20px', 
                fontSize: '10px', 
                fontWeight: '900' 
              }}>
                RETAR
              </div>
            </Link>
          ))
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', marginTop: '20px' }}>
            Esperando a que otros rivales se conecten...
          </div>
        )}
      </div>

      {/* BOTÓN CERRAR SESIÓN */}
      <button 
        onClick={() => logout()}
        style={{ 
          marginTop: 'auto', 
          background: 'none', 
          border: 'none', 
          color: '#FF0055', 
          fontSize: '10px', 
          fontWeight: 'bold', 
          cursor: 'pointer',
          padding: '20px'
        }}
      >
        CERRAR MATRIZ (LOGOUT)
      </button>

      <style jsx>{`
        div:hover { transform: scale(1.02); }
      `}</style>
    </div>
  );
}
