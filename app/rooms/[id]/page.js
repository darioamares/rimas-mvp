'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useUserAuth } from '../../../context/AuthContext'; 
import { useParams, useRouter } from 'next/navigation';
import { Zap, X, Upload, Mic, Square, Sparkles, Disc, Sparkle, ArrowLeft, Send, Palette, Play, Pause, Pencil, Check } from 'lucide-react';
import { db } from '../../../lib/firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import Link from 'next/link';

// --- CONSTANTES ---
const INITIAL_STOPWORDS = ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'e', 'o', 'u', 'de', 'del', 'a', 'al', 'con', 'en', 'por', 'para', 'que', 'es', 'son', 'si', 'no', 'tu', 'su', 'mi', 'yo', 'me'];

// PALETA MANUAL
const MANUAL_COLORS = [
  { id: 'cyan', hex: '#00e5ff' },
  { id: 'magenta', hex: '#ff4081' },
  { id: 'lime', hex: '#76ff03' },
  { id: 'yellow', hex: '#ffea00' },
  { id: 'orange', hex: '#ff9100' },
  { id: 'red', hex: '#ff1744' }
];

// COLORES AUTOMÁTICOS (High Contrast para texto)
const AUTO_COLORS = [
  { hex: '#ff1744' }, // Rojo Neón
  { hex: '#00e5ff' }, // Cyan Neón
  { hex: '#76ff03' }, // Verde Lima
  { hex: '#ea80fc' }, // Violeta
  { hex: '#ffea00' }  // Amarillo
];

const CONCEPTS = ["EL ESPEJO DEL TIEMPO", "LABERINTO DE CRISTAL", "EL PESO DEL SILENCIO", "RAÍCES DE METAL", "OCÉANO DE CENIZA", "SUEÑO MECÁNICO"];

// --- HELPERS ---
const stripHtml = (html) => {
   if (typeof window === 'undefined') return html;
   let tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
};

const getSyllablesCount = (text) => {
  if (!text) return 0;
  const cleanContent = text.includes('<') ? stripHtml(text) : text;
  const clean = String(cleanContent).toLowerCase().replace(/[^a-záéíóúüñ\s]/g, '');
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  return words.reduce((acc, w) => {
    const matches = w.match(/[aeiouáéíóúü]{1,2}/g);
    return acc + (matches ? matches.length : 1);
  }, 0);
};

// --- COMPONENTE AUDIO PLAYER ---
const AudioPlayer = ({ base64Audio }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2 mt-2 bg-black/20 p-1.5 rounded-lg w-fit">
      <audio 
        ref={audioRef} 
        src={base64Audio} 
        onEnded={() => setPlaying(false)} 
        className="hidden" 
      />
      <button onClick={toggle} className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white">
        {playing ? <Pause size={12}/> : <Play size={12}/>}
      </button>
      <div className="h-1 w-12 bg-white/20 rounded-full overflow-hidden">
        <div className={`h-full bg-cyan-400 ${playing ? 'animate-[width_2s_linear_infinite]' : 'w-0'}`}></div>
      </div>
      <span className="text-[9px] font-bold opacity-70">VOZ</span>
    </div>
  );
};

// --- COMPONENTE BUBBLE (EDITABLE Y VISUAL) ---
const MessageBubble = memo(({ msg, isMe, roomId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const editRef = useRef(null);

  const saveEdit = async () => {
    if (!editRef.current) return;
    const newContent = editRef.current.innerHTML;
    try {
      const msgRef = doc(db, "rooms", roomId, "messages", msg.id);
      await updateDoc(msgRef, { text: newContent });
      setIsEditing(false);
    } catch (e) {
      console.error("Error al editar:", e);
    }
  };

  return (
    <div className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in slide-in-from-bottom-2`}>
      <div className={`flex flex-col max-w-[90%] ${isMe ? 'items-end' : 'items-start'}`}>
        
        {/* Header Burbuja */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
            {isMe ? 'Tú' : msg.authorName}
          </span>
          {isMe && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="text-white/20 hover:text-cyan-400">
              <Pencil size={10} />
            </button>
          )}
        </div>
        
        {/* Cuerpo Burbuja */}
        <div 
          className={`px-4 py-3 rounded-2xl text-base font-medium shadow-lg break-words
            ${isMe 
              ? 'bg-cyan-900/40 border border-cyan-500/50 text-cyan-50 rounded-tr-none' 
              : 'bg-white text-gray-900 rounded-tl-none border-2 border-gray-300 font-semibold'
            }`}
        >
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <div 
                ref={editRef}
                contentEditable
                className="outline-none bg-black/20 p-2 rounded text-white"
                dangerouslySetInnerHTML={{ __html: msg.text }}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)}><X size={14} className="text-red-400"/></button>
                <button onClick={saveEdit}><Check size={14} className="text-green-400"/></button>
              </div>
            </div>
          ) : (
            <>
              <div dangerouslySetInnerHTML={{ __html: msg.text }} />
              {msg.audio && <AudioPlayer base64Audio={msg.audio} />}
            </>
          )}
        </div>
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
  
  // ESTADO AUDIO GRABACIÓN
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [audioBase64, setAudioBase64] = useState(null);

  // REFS
  const beatAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastTranscriptRef = useRef(""); // Para evitar duplicados en speech

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

  // 2. LÓGICA DE RIMA Y FORMATO
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

  const autoFormatVerses = (text) => {
    // Inserta <br> cada 14 sílabas aprox si es prosa larga
    const words = text.split(' ');
    let lineSyllables = 0;
    let newText = "";
    
    words.forEach(word => {
        const syl = getSyllablesCount(word);
        if (lineSyllables + syl > 14) {
            newText += "<br>" + word + " ";
            lineSyllables = syl;
        } else {
            newText += word + " ";
            lineSyllables += syl;
        }
    });
    return newText;
  };

  const applyAutoColors = () => {
    if (!editorRef.current) return;
    const rawText = editorRef.current.innerText; 
    if (!rawText) return;

    // 1. Detección de rimas
    const words = rawText.split(/([\s,.;:!?]+)/);
    const sigMap = {};

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
        activeColors[sig] = AUTO_COLORS[cIdx % AUTO_COLORS.length];
        cIdx++;
      }
    });

    // 2. Reconstrucción con <br> automáticos (VERSOS)
    let currentLineSyllables = 0;
    const newHTML = words.map(word => {
      const trimmed = word.trim();
      // Si es separador, devolverlo tal cual
      if (!trimmed) return word;

      const syl = getSyllablesCount(trimmed);
      const sig = getVocalicSignature(trimmed);
      const color = activeColors[sig];
      
      let styledWord = word;
      
      // Aplicar color al TEXTO (no background)
      if (color && !INITIAL_STOPWORDS.includes(trimmed.toLowerCase())) {
        styledWord = `<span style="color: ${color.hex}; font-weight: 800; text-shadow: 0 0 1px rgba(0,0,0,0.2);">${word}</span>`;
      }
      
      // Lógica de salto de línea automática
      if (currentLineSyllables + syl > 15) {
         styledWord = "<br>" + styledWord;
         currentLineSyllables = syl;
      } else {
         currentLineSyllables += syl;
      }

      return styledWord;
    }).join('');

    editorRef.current.innerHTML = newHTML;
    moveCursorToEnd();
  };

  const moveCursorToEnd = () => {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const applyManualColor = (hex) => {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, hex);
    document.execCommand('bold', false, null);
    editorRef.current.focus();
  };

  // 3. AUDIO Y GRABACIÓN (FIXED)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Iniciar MediaRecorder (Audio Blob)
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
           setAudioBase64(reader.result); // Guardar base64 para enviar
        };
        stream.getTracks().forEach(track => track.stop()); // Apagar mic hardware
      };

      mediaRecorder.start();
      
      // Iniciar SpeechRecognition (Texto)
      if (recognitionRef.current) {
        lastTranscriptRef.current = ""; // Resetear memoria
        recognitionRef.current.start();
      }
      
      setIsRecording(true);

    } catch (err) {
      console.error("Error al acceder al microfono:", err);
      alert("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    // Aplicar formato auto al terminar de hablar
    setTimeout(() => applyAutoColors(), 500);
  };

  // CONFIGURACIÓN INICIAL SPEECH
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.lang = 'es-ES';
        rec.continuous = true;
        rec.interimResults = true; // Necesario para feedback real
        
        rec.onresult = (e) => {
            let interim = '';
            let final = '';
            
            // Solución al problema de repetición:
            // Solo procesamos lo nuevo respecto al último resultado final
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    final += e.results[i][0].transcript;
                } else {
                    interim += e.results[i][0].transcript;
                }
            }

            if (editorRef.current) {
               // Evitamos sobrescribir todo el HTML si solo estamos dictando
               // Estrategia simple: Insertar texto al final
               // Para una implementación perfecta necesitaríamos un cursor inteligente, 
               // pero para evitar bugs, añadimos el texto limpio.
               
               // NOTA: Para este fix rápido, asumimos que si dictas, estás añadiendo.
               const currentHTML = editorRef.current.innerHTML;
               if (final) {
                 // Añadimos solo lo final
                 editorRef.current.innerHTML = currentHTML + " " + final;
                 lastTranscriptRef.current = final; // Guardamos
               }
               // El interim lo podríamos mostrar en un floating div, pero simplificamos
            }
            
            // Actualizar contador
            if(editorRef.current) setSyllableCount(getSyllablesCount(editorRef.current.innerText));
        };
        recognitionRef.current = rec;
      }
    }
  }, []);

  // 4. ENVIAR
  const dropBar = async () => {
    if (!editorRef.current || !roomId || !user) return;
    
    // Ejecutar autocolor una última vez por si acaso
    applyAutoColors();
    
    // Pequeño delay para asegurar que el DOM se actualizó
    setTimeout(async () => {
        const finalContent = editorRef.current.innerHTML; 
        const plainText = editorRef.current.innerText;
        
        if (!plainText.trim() && !audioBase64) return;
    
        const bar = { 
          text: finalContent, 
          syllables: getSyllablesCount(plainText), 
          sentAt: Date.now(),
          uid: user.uid, 
          authorName: user.displayName || "Anonimo",
          audio: audioBase64 || null // Adjuntar audio si existe
        };
    
        try { 
          await addDoc(collection(db, "rooms", roomId, "messages"), bar); 
        } catch (e) { console.error(e); }
        
        editorRef.current.innerHTML = '';
        setSyllableCount(0);
        setAudioBase64(null); // Limpiar audio
        if (scrollRef.current) scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }, 100);
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

      {/* HERRAMIENTAS */}
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
             <MessageBubble 
                key={msg.id} 
                msg={msg} 
                isMe={user && msg.uid === user.uid} 
                roomId={roomId}
             />
        ))}
        <div className="h-4 w-full"></div>
      </div>

      {/* EDITOR AREA */}
      <div className="flex-none bg-[#050505] border-t border-white/10 pb-safe z-40">
        
        {/* PALETA DE COLORES (Arreglado punto 1: Colores de texto, no fondo) */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-white/5 overflow-x-auto gap-2">
           <div className="flex items-center gap-3">
             <span className="text-[9px] font-bold text-white/30 mr-1"><Palette size={12}/></span>
             {MANUAL_COLORS.map((col) => (
               <button 
                 key={col.id}
                 onMouseDown={(e) => { e.preventDefault(); applyManualColor(col.hex); }}
                 className="w-6 h-6 rounded-full border border-white/10 shadow-sm active:scale-90 transition-transform"
                 style={{ backgroundColor: col.hex }}
               />
             ))}
           </div>
           
           <button 
              onMouseDown={(e) => { e.preventDefault(); applyAutoColors(); }}
              className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full text-[9px] font-black text-black flex items-center gap-1 shadow-lg active:scale-95"
           >
             <Sparkles size={10} fill="black"/> AUTO-RIMA
           </button>
        </div>

        {/* INPUT */}
        <div className="p-3">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <div className="flex-1 bg-[#1a1a1c] rounded-3xl flex items-center min-h-[48px] max-h-[150px] border border-white/10 focus-within:border-cyan-500 transition-all overflow-hidden relative">
               <div 
                  ref={editorRef} 
                  contentEditable 
                  onInput={(e) => setSyllableCount(getSyllablesCount(e.currentTarget.innerText))}
                  onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); dropBar(); } }}
                  className="flex-1 px-4 py-3 outline-none font-bold text-white text-base max-h-[140px] overflow-y-auto"
                  data-placeholder="Di lo que tu alma dicta..."
                />
                <div className="flex items-center gap-2 pr-3">
                   {/* Indicador de Audio Grabado */}
                   {audioBase64 && (
                      <span className="text-[9px] font-black text-green-400 bg-green-900/30 px-2 py-1 rounded animate-pulse">AUDIO LISTO</span>
                   )}
                   
                   {syllableCount > 0 && <span className="text-[10px] font-black text-white/30 tabular-nums">{syllableCount}</span>}
                   
                   {/* BOTON MIC (Graba y Transcribe a la vez) */}
                   <button 
                     onMouseDown={startRecording}
                     onMouseUp={stopRecording}
                     onTouchStart={startRecording}
                     onTouchEnd={stopRecording}
                     className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white shadow-[0_0_15px_red]' : 'text-white/40 hover:text-white'}`}
                   >
                     {isRecording ? <Square size={16} fill="white" /> : <Mic size={20} />}
                   </button>
                </div>
            </div>
            <button onClick={dropBar} className="bg-cyan-500 hover:bg-cyan-400 text-black w-12 h-12 rounded-full flex items-center justify-center active:scale-90 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Send size={20} fill="black" className="ml-0.5" />
            </button>
          </div>
          {isRecording && <p className="text-center text-[9px] text-red-500 mt-1 animate-pulse font-bold">GRABANDO AUDIO + VOZ...</p>}
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
            <p className="text-[10px] text-white/30 mt-4 text-center">Nota: En algunos iPhone, el audio se pausará al grabar voz.</p>
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
