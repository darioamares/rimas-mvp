'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useUserAuth } from '../../../context/AuthContext'; 
import { useParams, useRouter } from 'next/navigation';
import { Trash2, X, Power, Zap as ZapIcon, Settings, Upload, Mic, Square, Sparkles, Plus, Minus, Target, Eraser, Disc, Pause, Sparkle } from 'lucide-react';
import { db } from '../../../lib/firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";

// --- CONSTANTES ---
const INITIAL_STOPWORDS = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u', 'de', 'del', 'a', 'al', 'con', 'en', 'por', 'para', 'que', 'es', 'son', 'ha', 'he', 'si', 'no', 'tu', 'su', 'mi', 'yo', 'me', 'se', 'lo', 'le', 'nos', 'os', 'les', 'soy', 'eres', 'este', 'esta', 'estos', 'estas', 'como', 'tan', 'muy', 'pero', 'mas', 'más', 'sus', 'mis', 'tus', 'donde', 'cuando', 'porque'];

const COLORS = [
  { id: 'cyan', hex: '#00FFFF', label: 'Cian', text: 'black' },
  { id: 'magenta', hex: '#FF00FF', label: 'Rosa', text: 'white' },
  { id: 'yellow', hex: '#FFFF00', label: 'Amarillo', text: 'black' },
  { id: 'red', hex: '#FF0000', label: 'Rojo', text: 'white' },
  { id: 'green', hex: '#00FF00', label: 'Verde', text: 'black' },
  { id: 'purple', hex: '#8B00FF', label: 'Violeta', text: 'white' }
];

const CONCEPTS = ["EL ESPEJO DEL TIEMPO", "LABERINTO DE CRISTAL", "EL PESO DEL SILENCIO", "RAÍCES DE METAL", "OCÉANO DE CENIZA", "SUEÑO MECÁNICO", "SOMBRAS DE NEÓN"];

// --- HELPERS ---
const getSyllablesCount = (w) => {
  const clean = String(w || "").toLowerCase().trim().replace(/[^a-záéíóúüñ]/g, '');
  if (!clean) return 0;
  const matches = clean.match(/[aeiouáéíóúü]{1,2}/g);
  return matches ? matches.length : 1;
};

const countTotalSyllablesFromRaw = (text) => {
  if (!text) return 0;
  const cleanText = String(text).replace(/<[^>]*>/g, '').toLowerCase().trim();
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  return words.reduce((acc, w) => acc + getSyllablesCount(w), 0);
};

// --- COMPONENTE BUBBLE (MEMOIZADO) ---
const EditableBubble = memo(({ content, side, fontSize }) => {
  return (
    <div 
      className={`p-5 border-l-4 ${side === 'left' ? 'border-cyan-500 bg-white' : 'border-r-4 border-l-0 border-rose-500 bg-white text-right'} text-slate-900 rounded-lg font-semibold italic shadow-2xl transition-all lead-relaxed`}
      style={{ fontSize: `${fontSize}px` }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});

// ==========================================
// 🔥 APP PRINCIPAL
// ==========================================
export default function Home() {
  // 1. HOOKS DE ESTADO (ORDEN ESTRICTO)
  const { user, loading, logout } = useUserAuth(); 
  const params = useParams(); //
  const roomId = params.id;    //
  const router = useRouter();
  
  const [battleRows, setBattleRows] = useState([]);
  const [currentTheme, setCurrentTheme] = useState("");
  const [intensity, setIntensity] = useState(0); 
  const [p1Name, setP1Name] = useState("DARÍO AMARES");
  const [p2Name, setP2Name] = useState("RIVAL");
  const [activeSide, setActiveSide] = useState('left');
  const [fontSize, setFontSize] = useState(15);
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

  // 2. ESCUCHA DE MENSAJES EN TIEMPO REAL (FIREBASE)
  useEffect(() => {
    if (!roomId) return;

    const q = query(
      collection(db, "rooms", roomId, "messages"),
      orderBy("sentAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Agrupamos los mensajes en filas para la vista de batalla
      const rows = [];
      messages.forEach((msg) => {
        if (msg.side === 'left') {
          rows.push({ id: msg.id, left: msg, right: null });
        } else {
          // Intenta rellenar el hueco derecho de la última fila si está vacío
          if (rows.length > 0 && !rows[rows.length - 1].right) {
            rows[rows.length - 1].right = msg;
          } else {
            rows.push({ id: msg.id, left: null, right: msg });
          }
        }
      });
      setBattleRows(rows);
    });

    return () => unsubscribe();
  }, [roomId]);

  // 3. MOTOR FONÉTICO
  const getVocalicSignature = useCallback((word) => {
    if (!word || String(word).length < 2) return null;
    let clean = String(word).toLowerCase().trim().replace(/[^a-záéíóúüñ]/g, '');
    const vowels = "aeiouáéíóúü";
    const normalize = (v) => v.replace(/[áäà]/g, 'a').replace(/[éëè]/g, 'e').replace(/[íïì]/g, 'i').replace(/[óöò]/g, 'o').replace(/[úüùü]/g, 'u');
    let vPos = [];
    for (let i = 0; i < clean.length; i++) if (vowels.includes(clean[i])) vPos.push(i);
    if (vPos.length === 0) return null;
    let stressIdx = -1;
    if (clean.match(/[áéíóú]/)) stressIdx = clean.search(/[áéíóú]/);
    else {
      const lastChar = clean.slice(-1);
      if ("aeiouns".includes(lastChar)) stressIdx = vPos.length > 1 ? vPos[vPos.length - 2] : vPos[0];
      else stressIdx = vPos[vPos.length - 1];
    }
    let sig = "";
    for (let i = stressIdx; i < clean.length; i++) if (vowels.includes(clean[i])) sig += normalize(clean[i]);
    return (stressIdx === vPos[vPos.length - 1] ? "A-" : "G-") + sig;
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

  // 4. EFECTO DE VOZ (SPEECH RECOGNITION)
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
            setSyllableCount(countTotalSyllablesFromRaw(total));
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

  // 5. HANDLERS DE ACCIÓN
  const dropBar = async () => {
    if (!editorRef.current || !roomId) return;
    const rawText = editorRef.current.innerText;
    if (!rawText.trim()) return;

    const processedText = isAutoColored ? applyRhymeColors(rawText) : rawText;
    const bar = { 
      text: processedText, 
      syllables: countTotalSyllablesFromRaw(rawText), 
      sentAt: Date.now(),
      side: activeSide 
    };

    // Guardado en Firebase usando el ID de la sala
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

  const handleBeat = () => {
    if (!beatUrl) return setShowBeatSettings(true);
    if (isBeatPlaying) { beatAudioRef.current.pause(); setIsBeatPlaying(false); }
    else { beatAudioRef.current.play(); setIsBeatPlaying(true); }
  };

  // 6. EFECTOS DE CONTROL
  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);
  
  useEffect(() => {
    const total = battleRows.length * 5;
    setIntensity(Math.min(total, 90));
  }, [battleRows]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-cyan-400 font-black animate-pulse">CARGANDO MATRIZ...</div>;
  if (!user) return null;

  return (
    <div className="h-screen bg-[#0a0a0c] text-white font-sans flex flex-col overflow-hidden relative">
      <audio ref={beatAudioRef} src={beatUrl} loop />
      
      {/* BACKGROUND GLOW */}
      <div className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-1000" style={{ background: `radial-gradient(circle at 50% 50%, #22d3ee 0%, transparent ${intensity}%)`, filter: `blur(40px)` }} />

      {/* HEADER */}
      <div className="flex-none border-b border-white/5 p-4 bg-black/90 backdrop-blur-xl z-30 grid grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex flex-col">
          <span className="text-cyan-400 font-black tracking-widest text-sm">{p1Name}</span>
          <button onClick={() => logout()} className="text-[8px] text-red-500 font-bold text-left hover:underline">LOGOUT</button>
        </div>
        <div className="flex items-center gap-2">
          <ZapIcon size={30} className="text-yellow-400 fill-yellow-400" />
          <h1 className="font-black italic text-2xl tracking-tighter">RIMAS <span className="text-cyan-400">MVP</span></h1>
        </div>
        <div className="flex flex-col text-right">
           <input value={p2Name} onChange={e => setP2Name(e.target.value.toUpperCase())} className="bg-transparent text-right font-black text-red-600 outline-none uppercase" />
           <span className="text-[8px] text-white/40 font-bold uppercase">SALA: {roomId}</span>
        </div>
      </div>

      {/* TEMA ACTUAL */}
      {currentTheme && (
        <div className="flex-none bg-cyan-950/30 border-b border-white/5 py-1 text-center">
          <span className="text-[9px] font-black tracking-[0.3em] text-white/60 italic">CONCEPTO: {currentTheme}</span>
        </div>
      )}

      {/* ÁREA DE BATALLA */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col" ref={scrollRef}>
        <div className="max-w-4xl w-full mx-auto flex flex-col gap-12 pb-40">
          {battleRows.map((row, idx) => (
            <div key={row.id} className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex-1">{row.left && <EditableBubble content={row.left.text} side="left" fontSize={fontSize} />}</div>
              <div className="text-[9px] font-black text-white/10 italic">V{idx + 1}</div>
              <div className="flex-1">{row.right && <EditableBubble content={row.right.text} side="right" fontSize={fontSize} />}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CONTROLES FLOTANTES IZQUIERDA */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
        <button onClick={() => setCurrentTheme(CONCEPTS[Math.floor(Math.random()*CONCEPTS.length)])} className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-yellow-400 hover:bg-white/10 transition-all"><Sparkle size={20}/></button>
        <button onClick={() => setShowBeatSettings(true)} className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-cyan-400 hover:bg-white/10 transition-all"><Disc size={20}/></button>
      </div>

      {/* FOOTER INPUT */}
      <div className="flex-none p-4 bg-black border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <div className="flex gap-2">
              <button onClick={() => setActiveSide('left')} className={`px-5 py-1.5 rounded-full text-[10px] font-black transition-all ${activeSide === 'left' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-white/5 text-white/40'}`}>YO</button>
              <button onClick={() => setActiveSide('right')} className={`px-5 py-1.5 rounded-full text-[10px] font-black transition-all ${activeSide === 'right' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-white/5 text-white/40'}`}>RIVAL</button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsAutoColored(!isAutoColored)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black border transition-all ${isAutoColored ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10' : 'border-white/10 text-white/40'}`}><Sparkles size={12}/> AUTO-COLOR</button>
              <button onClick={handleBeat} className={`px-4 py-1.5 rounded-full text-[10px] font-black border transition-all ${isBeatPlaying ? 'border-cyan-400 text-cyan-400 animate-pulse' : 'border-white/10 text-white/40'}`}>{isBeatPlaying ? 'STOP BEAT' : 'PLAY BEAT'}</button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex items-center px-5 min-h-[60px] focus-within:border-cyan-500/50 transition-all">
              <div 
                ref={editorRef} 
                contentEditable 
                onInput={(e) => setSyllableCount(countTotalSyllablesFromRaw(e.currentTarget.innerText))}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); dropBar(); } }}
                className="flex-1 outline-none font-bold text-lg text-white py-3"
                data-placeholder="Escribe o usa el mic..."
              />
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-white/20 tabular-nums">{syllableCount} SIL</span>
                <button 
                  onClick={toggleMic} 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isFooterRecording ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-pulse' : 'bg-white/5 hover:bg-white/10 text-white/40'}`}
                >
                  {isFooterRecording ? <Square size={18} fill="white" /> : <Mic size={18} />}
                </button>
              </div>
            </div>
            <button onClick={dropBar} className="bg-cyan-500 hover:bg-cyan-400 text-white px-8 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)]">ENVIAR</button>
          </div>
        </div>
      </div>

      {/* BEAT SETTINGS MODAL */}
      {showBeatSettings && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-sm flex flex-col gap-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="text-cyan-400 font-black text-sm tracking-widest">BEAT ENGINE</h2>
              <button onClick={() => setShowBeatSettings(false)}><X size={20}/></button>
            </div>
            <button onClick={() => fileInputRef.current.click()} className="w-full bg-cyan-600 hover:bg-cyan-500 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-3 transition-all"><Upload size={18}/> SUBIR MP3 DESDE PC/CEL</button>
            <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { setBeatUrl(URL.createObjectURL(f)); setShowBeatSettings(false); } }} className="hidden" accept="audio/*" />
            <p className="text-[10px] text-white/30 text-center italic">Sube cualquier pista para empezar la batalla</p>
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
