'use client';
import React, { useEffect } from 'react';
import { useUserAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Zap, Shield } from 'lucide-react';

export default function LoginPage() {
  const { user, googleLogin } = useUserAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  return (
    <div className="h-screen w-full bg-[#0a0a0c] flex items-center justify-center relative overflow-hidden">
        {/* Fondo Ambient */}
        <div className="absolute inset-0 bg-radial-gradient from-cyan-900/20 via-black to-black pointer-events-none" />
        
        <div className="z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-2xl shadow-2xl flex flex-col items-center gap-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-2">
                <Zap size={64} className="text-yellow-400 animate-pulse" />
                <h1 className="text-4xl font-black italic text-white tracking-tighter">
                    RIMAS <span className="text-cyan-400">MVP</span>
                </h1>
                <p className="text-white/40 text-sm tracking-widest uppercase font-bold">Acceso a la Matrix Lirica</p>
            </div>

            <button 
                onClick={googleLogin}
                className="w-full bg-white text-black font-black uppercase py-4 rounded-xl flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="G" />
                Iniciar con Google
            </button>

            <div className="text-[10px] text-white/20 text-center max-w-xs">
                Al ingresar aceptas los términos de batalla y el código de honor de la academia.
            </div>
        </div>
    </div>
  );
}
