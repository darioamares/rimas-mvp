'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useUserAuth } from '../../../context/AuthContext'; 
import { useParams, useRouter } from 'next/navigation';
import { Zap, X, Upload, Mic, Square, Sparkles, Disc, Sparkle, ArrowLeft, Send, Palette } from 'lucide-react';
import { db } from '../../../lib/firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import Link from 'next/link';

// --- CONSTANTES ---
const INITIAL_STOPWORDS = ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'e', 'o', 'u', 'de', 'del', 'a', 'al', 'con', 'en', 'por', 'para', 'que', 'es', 'son', 'si', 'no', 'tu', 'su', 'mi', 'yo', 'me'];

// PALETA DE COLORES MANUAL
const MANUAL_COLORS = [
  { id: 'cyan', hex: '#00bcd4' },
  { id: 'magenta', hex: '#d500f9' },
  { id: 'blue', hex: '#2962ff' },
  { id: 'green', hex: '#00c853' },
  { id: 'yellow', hex: '#ffeb3b' },
  { id: 'red', hex: '#d50000' }
];

const COLORS = [
  { id: 'red', hex: '#D50000' },
  { id: 'blue', hex: '#0040FF' },
  { id: 'green', hex: '#00C853' },
  { id: 'purple', hex: '#AA00FF' },
  { id: 'orange', hex: '#FF6D00' }
];

const CONCEPTS = ["EL ESPEJO DEL TIEMPO", "LABERINTO DE CRISTAL", "EL PESO DEL SILENCIO", "RAÍCES DE METAL", "OCÉANO DE CENIZA", "SUEÑO MECÁNICO"];

// --- HELPERS ---
const stripHtml = (html) => {
   let tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
};

const getSyllablesCount = (text) => {
  if (!text) return 0;
  // Limpiamos etiquetas HTML para contar sílabas reales
  const cleanContent = text.includes('<') ? stripHtml(text) : text;
  const clean = String(cleanContent).toLowerCase().replace(/[^a-záéíóúüñ\s]/g, '');
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  return words.reduce((acc, w) => {
    const matches = w.match(/[aeiouáéíóúü]{1,2}/g);
    return acc + (matches ? matches.length : 1);
  }, 0);
};

// --- COMPONENTE BUBBLE ---
const EditableBubble = memo(({ content, isMe, authorName, fontSize }) => {
  return (
    <div className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in slide-in-from-bottom-2`}>
      <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
        <span className="text-[10px] font-bold text-white/50 mb-1 px-1 uppercase tracking-wider">
          {isMe ? 'Tú' : authorName}
        </span>
        <div 
          className={`px-5 py-3 rounded-2xl text-base md:text-lg font-bold leading-snug shadow-lg break-words text-black
            ${isMe 
              ? 'bg-cyan-400 rounded-tr-none border-2 border-cyan-500' 
              : 'bg-white rounded-tl-none border-2 border-gray-300'
            }`}
          style={{ fontSize: `${fontSize}px` }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
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
  
  const [messages, setMessages] = useState([]);
  const [currentTheme, setCurrentTheme] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [syllableCount, setSyllableCount] = useState(0);
  const [isBeatPlaying, setIsBeatPlaying] = useState(false);
  const [beatUrl, setBeatUrl] = useState(""); 
  const [showBeatSettings, setShowBeatSettings] = useState(false);
  const [isFooterRecording, setIsFooterRecording] = useState(false);
  
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

  // 2. LOGICA DE RIMA Y AUTO-COLOREADO
  const getVocalicSignature = useCallback((word) => {
    if (!word || String(word).length < 2) return null;
    let clean = String(word).toLowerCase().trim().replace(/[^a-záéíóúüñ]/g, '');
    const vowels = "aeiouáéíóúü";
    const normalize = (v) => v.replace(/[áäà]/g, 'a').replace(/[éëè]/g, 'e').replace(/[íïì]/g, 'i').replace(/[óöò]/g, 'o').replace(/[úüùü]/g, 'u');
    let vPos = [];
    for (let i = 0; i < clean.length; i++) if (vowels.includes(clean[i])) vPos.push(i);
    if (vPos.length === 0) return null;
    let startIndex = vPos.length >= 2 ? vPos[vPos.length - 2] : vPos[0];
    let sig = "";
    for (let i = startIndex; i < clean.length; i++) if (vowels.includes(clean[i])) sig += normalize(clean[i]);
    return sig;
  }, []);

  const applyAutoColors = () => {
    if (!editorRef.current) return;
    const rawText = editorRef.current.innerText; // Tomamos texto limpio para analizar
    if (!rawText) return;

    const words = rawText.split(/([\s,.;:!?]+)/);
    const sigMap = {};

    // Detección
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
    Object.keys(sigMap).forEach(sig => {
      if (sigMap[sig] > 1) { 
        activeColors[sig] = COLORS[cIdx % COLORS.length];
        cIdx++;
      }
    });

    // Reconstrucción HTML
    const newHTML = words.map(word => {
      const trimmed = word.trim();
      if (!trimmed) return word;
      const sig = getVocalicSignature(trimmed);
      const color = activeColors[sig];
      if (color && !INITIAL_STOPWORDS.includes(trimmed.toLowerCase())) {
        return `<span style="color: ${color.hex}; font-weight: 900; text-shadow: 1px 1px 0px rgba(0,0,0,0.1);">${word}</span>`;
      }
      return word;
    }).join('');

    // Aplicamos al editor
    editorRef.current.innerHTML = newHTML;
    
    // Mover cursor al final (Truco necesario en contentEditable)
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  // 3. COLOREADO MANUAL
  const applyManualColor = (hex) => {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, hex);
    // Aseguramos negrita para que se vea bien
    document.execCommand('bold', false, null);
    editorRef.current.focus();
  };

  // 4. ENVIAR MENSAJE
  const dropBar = async () => {
    if (!editorRef.current || !roomId || !user) return;
    
    // IMPORTANTE: Enviamos innerHTML para mantener los colores manuales y automáticos
    const finalContent = editorRef.current.innerHTML; 
    const plainText = editorRef.current.innerText;
    
    if (!plainText.trim()) return;

    const bar = { 
      text: finalContent, 
      syllables: getSyllablesCount(plainText), 
      sentAt: Date.now(),
      uid: user.uid, 
      authorName: user.displayName || "Anonimo"
    };

    try { 
      await addDoc(collection(db, "rooms", roomId, "messages"), bar); 
    } catch (e) { 
      console.error(e); 
    }
    
    editorRef.current.innerHTML = '';
    setSyllableCount(0);
    accumulatedTextRef.current = "";
    if (scrollRef.current) scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
  };

  // AUDIO & MIC
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
      
      {/* HEADER */}
      <div className="flex-none bg-black/90 border-b border-white/10 p-2 flex justify-between items-center z-30 shadow-md">
        <Link href="/" className="p-2 text-white/70 hover:text-white flex items-center gap-1 bg-white/5 rounded-lg border border-white/5">
          <ArrowLeft size={18} /> <span className="text-xs font-bold">SALIR</span>
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="font-black italic text-lg tracking-tighter">SALA <span className="text-cyan-400">PVP</span></h1>
        </div>
        <div className="w-16"></div> 
      </div>

      {/* HERRAMIENTAS SUPERIORES */}
      <div className="flex-none bg-[#111] border-b border-white/5 p-2 flex justify-around items-center z-20">
         <button onClick={() => setCurrentTheme(CONCEPTS[Math.floor(Math.random()*CONCEPTS.length)])} className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 active:scale-95">
            <Sparkle size={14} className="text-yellow-400"/>
            <span className="text-[10px] font-bold text-white/80">TEMA</span>
         </button>
         <button onClick={handleBeat} className={`flex items-center gap-2 px-3 py-1 rounded-full border active:scale-95 ${isBeatPlaying ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/5 text-white/40'}`}>
            <Disc size={14} className={isBeatPlaying ? "animate-spin" : ""} />
            <span className="text-[10px] font-bold">{isBeatPlaying ? 'STOP' : 'BEAT'}</span>
         </button>
      </div>

      {/* TEMA FLOTANTE */}
      {currentTheme && (
        <div className="absolute top-[110px] w-full text-center pointer-events-none z-10 animate-in slide-in-from-top-4">
          <span className="bg-black/80 px-4 py-2 rounded-full text-[10px] font-black tracking-[0.2em] text-cyan-200 border border-cyan-500/30">
            {currentTheme}
          </span>
        </div>
      )}

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-2 bg-[#0a0a0c]" ref={scrollRef}>
        {messages.map((msg) => (
             <EditableBubble 
                key={msg.id} 
                content={msg.text} 
                isMe={user && msg.uid === user.uid} 
                authorName={msg.authorName} 
                fontSize={fontSize} 
             />
        ))}
        <div className="h-4 w-full"></div>
      </div>

      {/* AREA DE EDICIÓN Y PALETA */}
      <div className="flex-none bg-[#050505] border-t border-white/10 pb-safe z-40">
        
        {/* BARRA DE COLORES MANUALES (PALETA) */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-white/5 overflow-x-auto gap-2">
           <div className="flex items-center gap-3">
             <span className="text-[9px] font-bold text-white/30 mr-1"><Palette size={12}/></span>
             {MANUAL_COLORS.map((col) => (
               <button 
                 key={col.id}
                 onMouseDown={(e) => { e.preventDefault(); applyManualColor(col.hex); }} // onMouseDown evita perder foco
                 className="w-6 h-6 rounded-full border border-white/10 shadow-sm active:scale-90 transition-transform"
                 style={{ backgroundColor: col.hex }}
               />
             ))}
           </div>
           
           {/* BOTÓN MÁGICO AUTO-COLOR */}
           <button 
              onMouseDown={(e) => { e.preventDefault(); applyAutoColors(); }}
              className="px-3 py-1 bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full text-[9px] font-black text-black flex items-center gap-1 shadow-lg active:scale-95"
           >
             <Sparkles size={10} fill="black"/> AUTO-RIMA
           </button>
        </div>

        {/* INPUT DE TEXTO */}
        <div className="p-3">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <div className="flex-1 bg-[#1a1a1c] rounded-3xl flex items-center min-h-[48px] max-h-[120px] border border-white/10 focus-within:border-cyan-500 transition-all overflow-hidden relative">
               <div 
                  ref={editorRef} 
                  contentEditable 
                  onInput={(e) => setSyllableCount(getSyllablesCount(e.currentTarget.innerText))}
                  onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); dropBar(); } }}
                  className="flex-1 px-4 py-3 outline-none font-bold text-white text-base max-h-[100px] overflow-y-auto"
                  data-placeholder="Di lo que tu alma dicta..."
                />
                <div className="flex items-center gap-2 pr-3">
                   {syllableCount > 0 && <span className="text-[10px] font-black text-white/30 tabular-nums">{syllableCount}</span>}
                   <button onClick={toggleMic} className={`p-2 rounded-full ${isFooterRecording ? 'text-red-500 animate-pulse' : 'text-white/40 hover:text-white'}`}>
                     {isFooterRecording ? <Square size={16} fill="white" /> : <Mic size={20} />}
                   </button>
                </div>
            </div>
            <button onClick={dropBar} className="bg-cyan-500 hover:bg-cyan-400 text-black w-12 h-12 rounded-full flex items-center justify-center active:scale-90 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Send size={20} fill="black" className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL BEAT */}
      {showBeatSettings && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in">
          <div className="bg-[#111] border border-white/10 p-6 rounded-3xl w-full max-w-xs relative shadow-2xl">
            <button onClick={() => setShowBeatSettings(false)} className="absolute top-4 right-4 text-white/40"><X size={20}/></button>
            <h2 className="text-cyan-400 font-black text-sm mb-6 text-center tracking-widest">SUBIR BEAT</h2>
            <button onClick={() => fileInputRef.current.click()} className="w-full bg-cyan-600 hover:bg-cyan-500 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2">
              <Upload size={18}/> SELECCIONAR MP3
            </button>
            <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { setBeatUrl(URL.createObjectURL(f)); setShowBeatSettings(false); } }} className="hidden" accept="audio/*" />
          </div>
        </div>
      )}

      <style jsx global>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        [contenteditable]:empty:before { content: attr(data-placeholder); color: rgba(255,255,255,0.3); font-style: italic; }
      `}</style>
    </div>
  );
}
