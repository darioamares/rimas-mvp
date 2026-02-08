'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useUserAuth } from '../../../context/AuthContext'; 
import { useParams, useRouter } from 'next/navigation';
import { Zap, X, Upload, Mic, Square, Sparkles, Disc, Sparkle, ArrowLeft, Send } from 'lucide-react';
import { db } from '../../../lib/firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import Link from 'next/link';

// --- CONSTANTES ---
const INITIAL_STOPWORDS = ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'e', 'o', 'u', 'de', 'del', 'a', 'al', 'con', 'en', 'por', 'para', 'que', 'es', 'son', 'si', 'no', 'tu', 'su', 'mi', 'yo', 'me'];

// Colores más oscuros/fuertes para que se lean bien sobre fondo blanco
const COLORS = [
  { id: 'cyan', hex: '#00bcd4', label: 'Cian', text: 'black' },     
  { id: 'magenta', hex: '#d500f9', label: 'Rosa', text: 'white' },
  { id: 'blue', hex: '#2962ff', label: 'Azul', text: 'white' },     
  { id: 'green', hex: '#00c853', label: 'Verde', text: 'black' },
  { id: 'red', hex: '#d50000', label: 'Rojo', text: 'white' }
];

const CONCEPTS = ["EL ESPEJO DEL TIEMPO", "LABERINTO DE CRISTAL", "EL PESO DEL SILENCIO", "RAÍCES DE METAL", "OCÉANO DE CENIZA", "SUEÑO MECÁNICO"];

// --- HELPERS ---
const getSyllablesCount = (text) => {
  if (!text) return 0;
  const clean = String(text).toLowerCase().replace(/[^a-záéíóúüñ\s]/g, '');
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  return words.reduce((acc, w) => {
    const matches = w.match(/[aeiouáéíóúü]{1,2}/g);
    return acc + (matches ? matches.length : 1);
  }, 0);
};

// --- COMPONENTE BUBBLE (Diseño Clásico Restaurado) ---
const EditableBubble = memo(({ content, isMe, authorName, fontSize }) => {
  return (
    <div className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'} mb-4 animate-in fade-in slide-in-from-bottom-2`}>
      {/* Nombre del Usuario (Siempre visible) */}
      <span className="text-[10px] font-bold text-white/60 mb-1 px-2 uppercase tracking-wider">
        {authorName || 'Desconocido'}
      </span>
      
      {/* Burbuja de Texto (Fondo Sólido) */}
      <div 
        className={`max-w-[85%] px-5 py-3 rounded-2xl text-base md:text-lg font-bold leading-snug shadow-lg break-words
          ${isMe 
            ? 'bg-cyan-500 text-black rounded-tr-none border-2 border-cyan-600' // TU BURBUJA
            : 'bg-white text-black rounded-tl-none border-2 border-gray-300'    // BURBUJA RIVAL (BLANCA)
          }`}
        style={{ fontSize: `${fontSize}px` }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
});

// ==========================================
// 🔥 APP PRINCIPAL
// ==========================================
export default function BattleRoom() {
  const { user, loading } = useUserAuth(); 
  const params = useParams();
  const roomId = params?.id;    
  const router = useRouter();
  
  const [messages, setMessages] = useState([]);
  const [currentTheme, setCurrentTheme] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [syllableCount, setSyllableCount] = useState(0);
  const [isBeatPlaying, setIsBeatPlaying] = useState(false);
  const [beatUrl, setBeatUrl] = useState(""); 
  const [showBeatSettings, setShowBeatSettings] = useState(false);
  const [isFooterRecording, setIsFooterRecording] = useState(false);
  
  // ACTIVADO POR DEFECTO
  const [isAutoColored, setIsAutoColored] = useState(true);

  // REFS
  const beatAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const accumulatedTextRef = useRef("");

  // 1. ESCUCHA DE MENSAJES
  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "messages"), orderBy("sentAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    });
    return () => unsubscribe();
  }, [roomId]);

  // 2. LOGICA DE RIMA Y COLORES (Robustez mejorada)
  const getVocalicSignature = useCallback((word) => {
    if (!word || String(word).length < 2) return null;
    let clean = String(word).toLowerCase().trim().replace(/[^a-záéíóúüñ]/g, '');
    const vowels = "aeiouáéíóúü";
    const normalize = (v) => v.replace(/[áäà]/g, 'a').replace(/[éëè]/g, 'e').replace(/[íïì]/g, 'i').replace(/[óöò]/g, 'o').replace(/[úüùü]/g, 'u');
    
    let vPos = [];
    for (let i = 0; i < clean.length; i++) if (vowels.includes(clean[i])) vPos.push(i);
    if (vPos.length === 0) return null;
    
    // Últimas 2 vocales
    let stressIdx = vPos.length >= 2 ? vPos[vPos.length - 2] : vPos[0];
    let sig = "";
    for (let i = stressIdx; i < clean.length; i++) {
        if (vowels.includes(clean[i])) sig += normalize(clean[i]);
    }
    return sig;
  }, []);

  const applyRhymeColors = useCallback((rawText) => {
    if (!rawText) return "";
    const cleanText = String(rawText).replace(/<[^>]*>/g, ''); // Limpiar HTML previo
    // Separamos manteniendo puntuación para reconstruir la frase perfecta
    const words = cleanText.split(/([\s,.;:!?]+)/);
    
    const sigMap = {};
    
    // Paso 1: Mapear rimas
    words.forEach(w => {
      const trimmed = w.trim();
      if (!trimmed) return;
      const sig = getVocalicSignature(trimmed);
      if (sig && !INITIAL_STOPWORDS.includes(trimmed.toLowerCase())) {
        sigMap[sig] = (sigMap[sig] || 0) + 1;
      }
    });

    const activeColors = {};
    let cIdx = 0;
    
    // Paso 2: Asignar colores
    Object.keys(sigMap).forEach(sig => {
      if (sigMap[sig] > 1) { 
        activeColors[sig] = COLORS[cIdx % COLORS.length];
        cIdx++;
      }
    });

    // Paso 3: Reconstruir HTML
    return words.map(word => {
      const trimmed = word.trim();
      if (!trimmed) return word;
      
      const sig = getVocalicSignature(trimmed);
      const color = activeColors[sig];
      
      if (color && !INITIAL_STOPWORDS.includes(trimmed.toLowerCase())) {
        // Estilo fuerte: Color de fondo suave + Texto del color o Negrita
        return `<span style="color: ${color.hex}; font-weight: 900; text-shadow: 1px 1px 0px rgba(0,0,0,0.1);">${word}</span>`;
      }
      return word;
    }).join('');
  }, [getVocalicSignature]);

  // 3. ENVIAR MENSAJE
  const dropBar = async () => {
    if (!editorRef.current || !roomId || !user) return;
    const rawText = editorRef.current.innerText;
    if (!rawText.trim()) return;

    // APLICAR COLOR SI ESTÁ ACTIVADO
    const processedText = isAutoColored ? applyRhymeColors(rawText) : rawText;
    
    const bar = { 
      text: processedText, 
      syllables: getSyllablesCount(rawText), 
      sentAt: Date.now(),
      uid: user.uid, 
      authorName: user.displayName || "Anonimo"
    };

    try { 
      await addDoc(collection(db, "rooms", roomId, "messages"), bar); 
    } catch (e) { 
      console.error(e); 
    }
    
    editorRef.current.innerText = '';
    setSyllableCount(0);
    accumulatedTextRef.current = "";
    if (scrollRef.current) scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
  };

  // 4. AUDIO
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR && !recognitionRef.current) {
        const rec = new SR();
        rec.lang = 'es-ES';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) accumulatedTextRef.current += e.results[i][0].transcript + ' ';
            else interim += e.results[i][0].transcript;
          }
          const total = (accumulatedTextRef.current + interim).trim();
          if (editorRef.current) {
            editorRef.current.innerText = total;
            setSyllableCount(getSyllablesCount(total));
          }
        };
        rec.onend = () => { if (isFooterRecording) rec.start(); };
        recognitionRef.current = rec;
      }
    }
  }, [isFooterRecording]);

  const toggleMic = () => {
    if (isFooterRecording) {
      recognitionRef.current?.stop();
      setIsFooterRecording(false);
    } else {
      accumulatedTextRef.current = editorRef.current?.innerText || "";
      recognitionRef.current?.start();
      setIsFooterRecording(true);
    }
  };

  const handleBeat = () => {
    if (!beatUrl) return setShowBeatSettings(true);
    if (isBeatPlaying) { beatAudioRef.current.pause(); setIsBeatPlaying(false); }
    else { beatAudioRef.current.play(); setIsBeatPlaying(true); }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-cyan-400 font-bold">CARGANDO...</div>;
  if (!user) return null;

  return (
    <div className="h-[100dvh] bg-[#0a0a0c] text-white font-sans flex flex-col overflow-hidden relative">
      <audio ref={beatAudioRef} src={beatUrl} loop />
      
      {/* 1. HEADER (Compacto) */}
      <div className="flex-none bg-black/90 border-b border-white/10 p-2 flex justify-between items-center z-30 shadow-md">
        <Link href="/" className="p-2 text-white/70 hover:text-white flex items-center gap-1 bg-white/5 rounded-lg border border-white/5">
          <ArrowLeft size={18} /> <span className="text-xs font-bold">SALIR</span>
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="font-black italic text-lg tracking-tighter">SALA <span className="text-cyan-400">PVP</span></h1>
        </div>
        <div className="w-16"></div> 
      </div>

      {/* 2. BARRA DE HERRAMIENTAS */}
      <div className="flex-none bg-[#111] border-b border-white/5 p-2 flex justify-around items-center z-20">
         <button onClick={() => setCurrentTheme(CONCEPTS[Math.floor(Math.random()*CONCEPTS.length)])} className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 active:scale-95">
            <Sparkle size={14} className="text-yellow-400"/>
            <span className="text-[10px] font-bold text-white/80">TEMA</span>
         </button>

         <button onClick={handleBeat} className={`flex items-center gap-2 px-3 py-1 rounded-full border active:scale-95 ${isBeatPlaying ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/5 text-white/40'}`}>
            <Disc size={14} className={isBeatPlaying ? "animate-spin" : ""} />
            <span className="text-[10px] font-bold">{isBeatPlaying ? 'STOP' : 'BEAT'}</span>
         </button>

         <button onClick={() => setIsAutoColored(!isAutoColored)} className={`flex items-center gap-2 px-3 py-1 rounded-full border active:scale-95 ${isAutoColored ? 'bg-green-900/40 border-green-500 text-green-400' : 'bg-white/5 border-white/5 text-white/40'}`}>
            <Sparkles size={14} />
            <span className="text-[10px] font-bold">{isAutoColored ? 'ON' : 'OFF'}</span>
         </button>
      </div>

      {/* TEMA FLOTANTE */}
      {currentTheme && (
        <div className="absolute top-[110px] w-full text-center pointer-events-none z-10 animate-in slide-in-from-top-4">
          <span className="bg-black/80 px-4 py-2 rounded-full text-[10px] font-black tracking-[0.2em] text-cyan-200 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            {currentTheme}
          </span>
        </div>
      )}

      {/* 3. ÁREA DE CHAT (Fondo Oscuro para contraste con burbujas) */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-2 bg-[#0a0a0c]" ref={scrollRef}>
        {messages.map((msg) => (
             <EditableBubble 
                key={msg.id} 
                content={msg.text} 
                isMe={msg.uid === user.uid} 
                authorName={msg.authorName} 
                fontSize={fontSize} 
             />
        ))}
        <div className="h-4 w-full"></div>
      </div>

      {/* 4. FOOTER INPUT (Diseño App Nativa) */}
      <div className="flex-none bg-[#050505] border-t border-white/10 p-3 pb-safe z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          
          <div className="flex-1 bg-[#1a1a1c] rounded-3xl flex items-center min-h-[48px] max-h-[120px] focus-within:ring-1 focus-within:ring-cyan-500 transition-all overflow-hidden relative border border-white/5">
             <div 
                ref={editorRef} 
                contentEditable 
                onInput={(e) => setSyllableCount(getSyllablesCount(e.currentTarget.innerText))}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); dropBar(); } }}
                className="flex-1 px-4 py-3 outline-none font-bold text-white text-base max-h-[100px] overflow-y-auto"
                data-placeholder="Escribe tu rima..."
              />
              
              <div className="flex items-center gap-2 pr-3">
                 {syllableCount > 0 && (
                   <span className="text-[10px] font-black text-white/30 tabular-nums">{syllableCount}</span>
                 )}
                 <button 
                   onClick={toggleMic} 
                   className={`p-2 rounded-full transition-all ${isFooterRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' : 'text-white/40 hover:text-white'}`}
                 >
                   {isFooterRecording ? <Square size={16} fill="white" /> : <Mic size={20} />}
                 </button>
              </div>
          </div>

          <button 
            onClick={dropBar} 
            className="bg-cyan-500 hover:bg-cyan-400 text-black w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            <Send size={20} fill="black" className="ml-0.5" />
          </button>
        </div>
      </div>

      {/* MODAL BEAT */}
      {showBeatSettings && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in">
          <div className="bg-[#111] border border-white/10 p-6 rounded-3xl w-full max-w-xs relative shadow-2xl">
            <button onClick={() => setShowBeatSettings(false)} className="absolute top-4 right-4 text-white/40"><X size={20}/></button>
            <h2 className="text-cyan-400 font-black text-sm mb-6 text-center tracking-widest">SUBIR BEAT</h2>
            <button onClick={() => fileInputRef.current.click()} className="w-full bg-cyan-600 hover:bg-cyan-500 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/50">
              <Upload size={18}/> SELECCIONAR MP3
            </button>
            <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { setBeatUrl(URL.createObjectURL(f)); setShowBeatSettings(false); } }} className="hidden" accept="audio/*" />
          </div>
        </div>
      )}

      <style jsx global>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        [contenteditable]:empty:before { content: attr(data-placeholder); color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
