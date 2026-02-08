'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useUserAuth } from '../../../context/AuthContext'; 
import { useParams, useRouter } from 'next/navigation';
import { Zap, X, Upload, Mic, Square, Sparkles, Disc, Sparkle, ArrowLeft } from 'lucide-react';
import { db } from '../../../lib/firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import Link from 'next/link';

// --- CONSTANTES ---
const INITIAL_STOPWORDS = ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'e', 'o', 'u', 'de', 'del', 'a', 'al', 'con', 'en', 'por', 'para', 'que', 'es', 'son', 'si', 'no', 'tu', 'su', 'mi', 'yo', 'me'];
const COLORS = [
  { id: 'cyan', hex: '#00FFFF', label: 'Cian', text: 'black' },
  { id: 'magenta', hex: '#FF00FF', label: 'Rosa', text: 'white' },
  { id: 'yellow', hex: '#FFFF00', label: 'Amarillo', text: 'black' },
  { id: 'green', hex: '#00FF00', label: 'Verde', text: 'black' }
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

// --- COMPONENTE BUBBLE ---
const EditableBubble = memo(({ content, isMe, fontSize }) => {
  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[85%] p-4 rounded-2xl text-lg font-bold leading-relaxed shadow-xl
          ${isMe 
            ? 'bg-cyan-500 text-black rounded-tr-none' 
            : 'bg-white/10 text-white rounded-tl-none border border-white/10'
          }`}
        style={{ fontSize: `${fontSize}px` }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
});

// ==========================================
// 🔥 APP PRINCIPAL (SALA DE BATALLA)
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
  const [isAutoColored, setIsAutoColored] = useState(false);

  // REFS
  const beatAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const accumulatedTextRef = useRef("");

  // 1. ESCUCHA DE MENSAJES (FIREBASE)
  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "messages"), orderBy("sentAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      // Auto-scroll al fondo
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    });
    return () => unsubscribe();
  }, [roomId]);

  // 2. LOGICA DE RIMA Y COLORES
  const getVocalicSignature = useCallback((word) => {
    if (!word || String(word).length < 2) return null;
    let clean = String(word).toLowerCase().trim().replace(/[^a-záéíóúüñ]/g, '');
    const vowels = "aeiouáéíóúü";
    const normalize = (v) => v.replace(/[áäà]/g, 'a').replace(/[éëè]/g, 'e').replace(/[íïì]/g, 'i').replace(/[óöò]/g, 'o').replace(/[úüùü]/g, 'u');
    let vPos = [];
    for (let i = 0; i < clean.length; i++) if (vowels.includes(clean[i])) vPos.push(i);
    if (vPos.length === 0) return null;
    let stressIdx = clean.length - 2; // Simplificado para rendimiento
    let sig = "";
    for (let i = Math.max(0, stressIdx); i < clean.length; i++) if (vowels.includes(clean[i])) sig += normalize(clean[i]);
    return sig;
  }, []);

  const applyRhymeColors = useCallback((rawText) => {
    if (!rawText) return "";
    const cleanText = String(rawText).replace(/<[^>]*>/g, '');
    const words = cleanText.split(/[\s,.;:!?]+/);
    const sigMap = {};
    words.forEach(w => {
      const sig = getVocalicSignature(w);
      if (sig && !INITIAL_STOPWORDS.includes(w.toLowerCase())) {
        sigMap[sig] = (sigMap[sig] || 0) + 1;
      }
    });

    const activeColors = {};
    let cIdx = 0;
    Object.keys(sigMap).forEach(sig => {
      if (sigMap[sig] > 1) {
        activeColors[sig] = COLORS[cIdx % COLORS.length];
        cIdx++;
      }
    });

    return words.map(word => {
      const sig = getVocalicSignature(word);
      const color = activeColors[sig];
      return color ? `<span style="background-color: ${color.hex}; color: ${color.text}; border-radius: 2px; padding: 0 2px; font-weight: 800;">${word}</span>` : word;
    }).join(' ');
  }, [getVocalicSignature]);

  // 3. ENVIAR MENSAJE (Detecta automáticamente el usuario)
  const dropBar = async () => {
    if (!editorRef.current || !roomId || !user) return;
    const rawText = editorRef.current.innerText;
    if (!rawText.trim()) return;

    const processedText = isAutoColored ? applyRhymeColors(rawText) : rawText;
    
    const bar = { 
      text: processedText, 
      syllables: getSyllablesCount(rawText), 
      sentAt: Date.now(),
      uid: user.uid, // GUARDAMOS QUIÉN ESCRIBIÓ EL MENSAJE
      authorName: user.displayName || "Anonimo"
    };

    try { 
      await addDoc(collection(db, "rooms", roomId, "messages"), bar); 
    } catch (e) { 
      console.error("Error al guardar:", e); 
    }
    
    editorRef.current.innerText = '';
    setSyllableCount(0);
    accumulatedTextRef.current = "";
    if (scrollRef.current) scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
  };

  // 4. AUDIO Y MICROFONO
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

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-cyan-400 font-black animate-pulse">CARGANDO...</div>;
  if (!user) return null;

  return (
    <div className="h-screen bg-[#0a0a0c] text-white font-sans flex flex-col overflow-hidden relative">
      <audio ref={beatAudioRef} src={beatUrl} loop />
      
      {/* HEADER */}
      <div className="flex-none border-b border-white/5 p-4 bg-black/90 backdrop-blur-xl z-30 flex justify-between items-center">
        <Link href="/" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all"><ArrowLeft size={20}/></Link>
        <div className="flex items-center gap-2">
          <Zap size={24} className="text-yellow-400 fill-yellow-400" />
          <h1 className="font-black italic text-xl tracking-tighter">SALA <span className="text-cyan-400">PVP</span></h1>
        </div>
        <div className="w-10"></div> {/* Espaciador para centrar */}
      </div>

      {/* TEMA ACTUAL */}
      {currentTheme && (
        <div className="flex-none bg-cyan-950/30 border-b border-white/5 py-1 text-center animate-in slide-in-from-top">
          <span className="text-[10px] font-black tracking-[0.3em] text-white/60 italic">CONCEPTO: {currentTheme}</span>
        </div>
      )}

      {/* ÁREA DE BATALLA */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-2" ref={scrollRef}>
        {messages.map((msg) => {
          // AQUÍ SE DECIDE EL LADO AUTOMÁTICAMENTE
          const isMe = msg.uid === user.uid; 
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <span className="text-[9px] font-black text-white/30 mb-1 px-1 uppercase">{msg.authorName || 'Rival'}</span>
              <EditableBubble content={msg.text} isMe={isMe} fontSize={fontSize} />
            </div>
          );
        })}
      </div>

      {/* CONTROLES FLOTANTES */}
      <div className="absolute left-4 top-20 flex flex-col gap-4 z-20">
        <button onClick={() => setCurrentTheme(CONCEPTS[Math.floor(Math.random()*CONCEPTS.length)])} className="w-10 h-10 bg-black/50 border border-white/10 rounded-full flex items-center justify-center text-yellow-400 backdrop-blur-md hover:bg-white/10"><Sparkle size={20}/></button>
        <button onClick={() => setShowBeatSettings(true)} className="w-10 h-10 bg-black/50 border border-white/10 rounded-full flex items-center justify-center text-cyan-400 backdrop-blur-md hover:bg-white/10"><Disc size={20}/></button>
      </div>

      {/* FOOTER INPUT */}
      <div className="flex-none p-4 bg-black border-t border-white/10 shadow-2xl z-40">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
             {/* INDICADOR DE USUARIO */}
             <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
               Rapeando como: {user.displayName}
             </span>
             <div className="flex gap-2">
                <button onClick={() => setIsAutoColored(!isAutoColored)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border transition-all ${isAutoColored ? 'border-yellow-400 text-yellow-400' : 'border-white/10 text-white/40'}`}><Sparkles size={10}/> COLOR</button>
                <button onClick={handleBeat} className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all ${isBeatPlaying ? 'border-cyan-400 text-cyan-400' : 'border-white/10 text-white/40'}`}>{isBeatPlaying ? 'PAUSE' : 'PLAY'}</button>
             </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex items-center px-4 min-h-[50px] focus-within:border-cyan-500/50 transition-all">
              <div 
                ref={editorRef} 
                contentEditable 
                onInput={(e) => setSyllableCount(getSyllablesCount(e.currentTarget.innerText))}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); dropBar(); } }}
                className="flex-1 outline-none font-bold text-white py-2"
                data-placeholder="Escupe tu rima..."
              />
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-white/20 tabular-nums">{syllableCount} SIL</span>
                <button onClick={toggleMic} className={`p-2 rounded-full transition-all ${isFooterRecording ? 'bg-red-500 text-white animate-pulse' : 'text-white/40 hover:text-white'}`}>
                  {isFooterRecording ? <Square size={16} fill="white" /> : <Mic size={18} />}
                </button>
              </div>
            </div>
            <button onClick={dropBar} className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 rounded-2xl font-black text-xs transition-all active:scale-95">ENVIAR</button>
          </div>
        </div>
      </div>

      {/* MODAL BEAT */}
      {showBeatSettings && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-xs relative">
            <button onClick={() => setShowBeatSettings(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={20}/></button>
            <h2 className="text-cyan-400 font-black text-sm mb-4">SUBIR BEAT (MP3)</h2>
            <button onClick={() => fileInputRef.current.click()} className="w-full bg-cyan-600 hover:bg-cyan-500 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2"><Upload size={16}/> SELECCIONAR ARCHIVO</button>
            <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { setBeatUrl(URL.createObjectURL(f)); setShowBeatSettings(false); } }} className="hidden" accept="audio/*" />
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        [contenteditable]:empty:before { content: attr(data-placeholder); color: rgba(255,255,255,0.2); font-style: italic; }
      `}</style>
    </div>
  );
}
