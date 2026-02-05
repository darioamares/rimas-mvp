import UserProfile from '../components/UserProfile';

'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useUserAuth } from '../context/AuthContext'; // <--- NUEVO: Importamos el contexto
import { useRouter } from 'next/navigation'; // <--- NUEVO: Para redirigir
import { Palette, Shield, Send, Trash2, Cpu, ChevronLeft, ChevronRight, Highlighter, Eraser, Sparkles, Type, Minus, Plus, X, GripVertical, Move, Power, ZapOff, Bot, Loader2, Sword, Edit2, Zap as ZapIcon, Trophy, Music, Sparkle, Mic, Square, Play, Pause, Target, Dna, MicOff, Disc, Volume2, Settings, Upload, BarChart2, BrainCircuit } from 'lucide-react';
// import { db } from '../lib/firebase'; 
// import { collection, addDoc } from "firebase/firestore";

// --- CONFIGURACIÓN LÍRICA ---
const INITIAL_STOPWORDS = [
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u', 
  'de', 'del', 'a', 'al', 'con', 'en', 'por', 'para', 'que', 'es', 'son', 
  'ha', 'he', 'si', 'no', 'tu', 'su', 'mi', 'yo', 'me', 'se', 'lo', 'le', 
  'nos', 'os', 'les', 'soy', 'eres', 'este', 'esta', 'estos', 'estas', 'como',
  'tan', 'muy', 'pero', 'mas', 'más', 'sus', 'mis', 'tus', 'donde', 'cuando', 'porque'
];

const COLORS = [
  { id: 'cyan', hex: '#00FFFF', label: 'Cian Neón', text: 'black' },
  { id: 'magenta', hex: '#FF00FF', label: 'Rosa Fucsia', text: 'white' },
  { id: 'yellow', hex: '#FFFF00', label: 'Amarillo Intenso', text: 'black' },
  { id: 'red', hex: '#FF0000', label: 'Rojo Pasión', text: 'white' },
  { id: 'orange', hex: '#FF6600', label: 'Naranjo Saturado', text: 'white' },
  { id: 'green', hex: '#00FF00', label: 'Verde Eléctrico', text: 'black' },
  { id: 'blue', hex: '#2E5BFF', label: 'Azul Eléctrico', text: 'white' },
  { id: 'purple', hex: '#8B00FF', label: 'Violeta Profundo', text: 'white' },
  { id: 'amber', hex: '#FFBF00', label: 'Ambar Neón', text: 'black' },
  { id: 'lime', hex: '#AFFF00', label: 'Verde Lima', text: 'black' },
];

const CONCEPTS = [
  "EL ESPEJO DEL TIEMPO", "LABERINTO DE CRISTAL", "EL PESO DEL SILENCIO", "RAÍCES DE METAL", "OCÉANO DE CENIZA", 
  "LA ÚLTIMA CARTA", "SUEÑO MECÁNICO", "SOMBRAS DE NEÓN", "CATEDRAL DE DATOS", "EL CÓDIGO DE LA VIDA", 
  "CIUDADES INVISIBLES", "EL GRITO DEL VACÍO", "DESTINO CODIFICADO", "POLVO DE ESTRELLAS MUERTAS", "SANGRE NEGRA", 
  "EL PRECIO DE LA VERDAD", "FANTASMAS EN LA RED", "ALGORITMOS DEL MIEDO", "DIAMANTES EN EL BARRO", "CORAZONES DE SILICIO", 
  "EL GUARDIÁN DEL UMBRAL", "CENIZAS DEL MAÑANA", "EL ÚLTIMO PULSO", "PIXELES ROTOS", "EL FIN DE LA HISTORIA"
];

// --- HELPERS GLOBALES ---
const formatTime = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

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

// --- COMPONENTES AUXILIARES ---

const PlayerStats = ({ side, rows }) => {
  const stats = rows.reduce((acc, row) => {
    const content = row?.[side];
    if (content && typeof content.text === 'string') {
      acc.bubbles += 1;
      acc.verses += (content.text.split('<br>').length || 1);
      const matches = content.text.match(/<span/g);
      acc.rhymes += (matches ? matches.length : 0);
    }
    return acc;
  }, { bubbles: 0, verses: 0, rhymes: 0 });

  return (
    <div className={`flex gap-3 text-[9px] font-black tracking-tighter uppercase mt-1 ${side === 'left' ? 'text-cyan-400/60' : 'text-red-500/60 justify-end'}`}>
      <span>{String(stats.bubbles)} BUB</span>
      <span>{String(stats.verses)} VER</span>
      <span>{String(stats.rhymes)} RHY</span>
    </div>
  );
};

const PowerBar = ({ content, side }) => {
  const textVal = typeof content === 'string' ? content : "";
  const matches = textVal.match(/<span/g);
  const intensityValue = Math.min((matches ? matches.length : 0) * 12, 100);
  return (
    <div className={`w-1.5 flex flex-col justify-end bg-white/5 rounded-full overflow-hidden self-stretch my-2 ${side === 'left' ? 'mr-3' : 'ml-3'}`}>
      <div 
        className={`w-full transition-all duration-1000 ease-out bg-gradient-to-t ${side === 'left' ? 'from-cyan-600 to-cyan-300 shadow-[0_0_10px_cyan]' : 'from-rose-600 to-rose-300 shadow-[0_0_10px_red]'}`} 
        style={{ height: `${intensityValue}%` }} 
      />
    </div>
  );
};

const BubbleAudio = ({ onAudioSave, savedAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onAudioSave(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { console.warn("Mic fail", err); }
  };

  const stopRecording = () => { if (mediaRecorder.current && isRecording) { mediaRecorder.current.stop(); setIsRecording(false); } };

  return (
    <div className="mt-2 flex items-center gap-3">
      {!savedAudio ? (
        <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-white/40'}`}>
          {isRecording ? <Square size={12} fill="white" /> : <Mic size={14} />}
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-white/5 rounded-full px-2 py-1 border border-white/10">
          <audio src={savedAudio} controls className="h-6 w-32 md:w-40 opacity-70" />
          <button type="button" onClick={() => onAudioSave(null)} className="text-white/20 hover:text-rose-500 p-1"><X size={10}/></button>
        </div>
      )}
    </div>
  );
};

const EditableBubble = memo(({ content, rowIndex, side, onUpdate, fontSize, isOffset }) => {
  const bubbleRef = useRef(null);
  useEffect(() => {
    if (bubbleRef.current && document.activeElement !== bubbleRef.current) {
      const safeText = typeof content === 'string' ? content : "";
      if (bubbleRef.current.innerHTML !== safeText) bubbleRef.current.innerHTML = safeText;
    }
  }, [content]);

  return (
    <div className={`transition-all duration-700 ease-out ${isOffset ? 'translate-y-8 opacity-90' : 'translate-y-0'}`}>
      <div 
        ref={bubbleRef} contentEditable suppressContentEditableWarning data-bubble-type="rimas-mvp" data-row-index={rowIndex} data-side={side}
        onInput={(e) => onUpdate(rowIndex, side, e.currentTarget.innerHTML)}
        className={`p-5 border-l-4 ${side === 'left' ? 'border-cyan-500' : 'border-r-4 border-l-0 border-rose-500 text-right'} bg-white text-slate-900 rounded-lg outline-none transition-all font-semibold italic whitespace-pre-wrap break-words leading-relaxed shadow-2xl relative`}
        style={{ fontSize: `${fontSize}px` }}
        dangerouslySetInnerHTML={{ __html: typeof content === 'string' ? content : "" }}
      />
    </div>
  );
});

// --- App Principal ---

export default function Home() {
  const [showProfile, setShowProfile] = useState(false);
  // --- AUTH HOOKS (NUEVO) ---
  const { user, loading, logout } = useUserAuth(); 
  const router = useRouter();

  // --- ESTADOS ---
  const [battleRows, setBattleRows] = useState([]);
  const [currentTheme, setCurrentTheme] = useState("");
  const [intensity, setIntensity] = useState(0); 
  const [p1Name, setP1Name] = useState("DARÍO AMARES");
  const [p2Name, setP2Name] = useState("DEMIURGO");
  const [activeSide, setActiveSide] = useState('left');
  const [fontSize, setFontSize] = useState(15);
  const [isAutoColored, setIsAutoColored] = useState(false);
  const [syllableCount, setSyllableCount] = useState(0);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isBeatPlaying, setIsBeatPlaying] = useState(false);
  const [beatUrl, setBeatUrl] = useState(""); 
  const [showBeatSettings, setShowBeatSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFooterRecording, setIsFooterRecording] = useState(false);
  const [footerAudioUrl, setFooterAudioUrl] = useState(null);
  const [trainingList, setTrainingList] = useState(new Set(INITIAL_STOPWORDS));
  const [newTrainingWord, setNewTrainingWord] = useState("");
  const [showTrainingPanel, setShowTrainingPanel] = useState(false);

  // --- REFS ---
  const beatAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const scrollRef = useRef(null);
  const audioCtxRef = useRef(null);
  const musicSourceNodeRef = useRef(null);
  const micStreamRef = useRef(null);
  const footerMediaRecorder = useRef(null);
  const footerAudioChunks = useRef([]);
  const footerRecognition = useRef(null);
  const isRecordingRef = useRef(false);
  const accumulatedSpeechRef = useRef("");

  // --- EFECTO DE PROTECCIÓN Y AUTH (NUEVO) ---
  useEffect(() => {
    if (!loading && !user) {
        // Si no está cargando y no hay usuario, mandar al login
        router.push('/login');
    } else if (user && user.displayName) {
        // Si hay usuario, usar su nombre real
        setP1Name(user.displayName.toUpperCase());
    }
  }, [user, loading, router]);

  // Si está cargando o no hay usuario aun, mostrar pantalla de carga
  if (loading || !user) return <div className="h-screen w-full bg-[#0a0a0c] flex items-center justify-center text-cyan-400 font-black tracking-[0.5em] animate-pulse">CARGANDO MATRIZ...</div>;

  // --- MOTOR FONÉTICO ---
  const getVocalicSignature = useCallback((word) => {
    if (!word || String(word).length < 2) return null;
    let clean = String(word).toLowerCase().trim().replace(/[^a-záéíóúüñ]/g, '');
    if (clean.length < 2) return null;
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
    const isAguda = stressIdx === vPos[vPos.length - 1];
    return (isAguda ? "A-" : "G-") + sig;
  }, []);

  const applyRhymeColorsToText = useCallback((rawText) => {
    if (!rawText) return "";
    const cleanText = String(rawText).replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
    const lines = cleanText.split('\n');
    const words = cleanText.split(/[\s,.;:!?¡¿]+/);
    const sigMap = {}, wordsBySig = {};
    
    words.forEach(w => {
      const low = w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]/g, '').toLowerCase();
      const sig = getVocalicSignature(low);
      if (sig && !INITIAL_STOPWORDS.includes(low)) {
        sigMap[sig] = (sigMap[sig] || 0) + 1;
        if (!wordsBySig[sig]) wordsBySig[sig] = new Set();
        wordsBySig[sig].add(low);
      }
    });

    const activeColors = {};
    let colorIdx = 0;
    Object.keys(sigMap).forEach(sig => {
      if (sigMap[sig] > 1 && wordsBySig[sig].size > 1) {
        activeColors[sig] = COLORS[colorIdx % COLORS.length];
        colorIdx++;
      }
    });

    return lines.map(line => {
      return line.split(/(\s+)/).map(token => {
        const clean = token.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]/g, '').toLowerCase();
        const sig = getVocalicSignature(clean);
        const color = activeColors[sig];
        return (color) 
          ? `<span style="background-color: ${color.hex}; color: ${color.text}; padding: 2px 0px; border-radius: 2px; font-weight: bold;">${token}</span>` 
          : token;
      }).join('');
    }).join('<br>');
  }, [getVocalicSignature]);

  // --- HANDLERS ---
  const handleEditorInput = (e) => {
    if (!e.currentTarget) return;
    const text = e.currentTarget.innerText;
    setSyllableCount(countTotalSyllablesFromRaw(text));
    accumulatedSpeechRef.current = text;
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (beatAudioRef.current) {
        try { beatAudioRef.current.currentTime = val; } catch(err) {}
    }
  };

  const handleBeatToggle = () => {
    if (!beatUrl) { setShowBeatSettings(true); return; }
    if (!beatAudioRef.current) return;
    if (isBeatPlaying) { 
      beatAudioRef.current.pause(); setIsBeatPlaying(false); 
    } else { 
      beatAudioRef.current.play().then(() => setIsBeatPlaying(true)).catch(() => setIsBeatPlaying(false));
    }
  };

  const removeHighlightSelection = (e) => {
    if (e) e.preventDefault();
    const sel = window.getSelection(); if (!sel || !sel.rangeCount || sel.isCollapsed) return;
    const range = sel.getRangeAt(0); const textStr = sel.toString();
    const textNode = document.createTextNode(textStr);
    range.deleteContents(); range.insertNode(textNode);
    const parentBubble = textNode.parentElement?.closest('[data-bubble-type]');
    if (parentBubble) {
        handleBubbleUpdate(parseInt(parentBubble.getAttribute('data-row-index')), parentBubble.getAttribute('data-side'), parentBubble.innerHTML);
    }
    sel.removeAllRanges();
  };

  const applyHighlightSelection = (colorObj) => {
    const sel = window.getSelection(); if (!sel || !sel.rangeCount || sel.isCollapsed) return;
    const range = sel.getRangeAt(0); const span = document.createElement('span');
    Object.assign(span.style, { backgroundColor: colorObj.hex, color: colorObj.text, padding: '2px 0px', borderRadius: '2px', fontWeight: 'bold' });
    try { 
      range.surroundContents(span); 
      const b = span.closest('[data-bubble-type]'); 
      if (b) handleBubbleUpdate(parseInt(b.getAttribute('data-row-index')), b.getAttribute('data-side'), b.innerHTML);
    } catch (e) {}
    sel.removeAllRanges();
  };

  const removeBubble = (rowIndex, side) => {
    setBattleRows(prev => { 
      const next = [...prev]; 
      if (next[rowIndex]) {
          next[rowIndex] = { ...next[rowIndex], [side]: null };
      }
      return next; 
    });
  };

  const handleBubbleUpdate = useCallback((rowIndex, side, html) => {
    setBattleRows(prev => { 
      const next = [...prev]; 
      if (next[rowIndex] && next[rowIndex][side]) next[rowIndex][side] = { ...next[rowIndex][side], text: String(html) };
      return next; 
    });
  }, []);

  const handleAudioSave = (rowIndex, side, url) => {
    setBattleRows(prev => { 
      const next = [...prev]; 
      if (next[rowIndex] && next[rowIndex][side]) next[rowIndex][side] = { ...next[rowIndex][side], audio: url }; 
      return next; 
    });
  };

  const toggleBubbleDim = (rowIndex, side) => {
    setBattleRows(prev => { 
      const next = [...prev]; 
      if (next[rowIndex] && next[rowIndex][side]) next[rowIndex][side] = { ...next[rowIndex][side], isDimmed: !next[rowIndex][side].isDimmed }; 
      return next; 
    });
  };

  const triggerMasterAutoColor = () => {
    setBattleRows(prev => prev.map(row => {
      const newRow = { ...row };
      if (newRow.left) newRow.left = { ...newRow.left, text: applyRhymeColorsToText(newRow.left.text) };
      if (newRow.right) newRow.right = { ...newRow.right, text: applyRhymeColorsToText(newRow.right.text) };
      return newRow;
    }));
    if (editorRef.current) {
        editorRef.current.innerHTML = applyRhymeColorsToText(editorRef.current.innerHTML);
    }
  };

  const dropBar = () => {
    if (!editorRef.current) return;
    const htmlContent = editorRef.current.innerHTML; 
    const rawText = editorRef.current.innerText;
    if (!rawText.trim()) return;
    
    const sylls = countTotalSyllablesFromRaw(rawText);
    const bar = { 
        text: String(htmlContent), 
        syllables: Number(sylls), 
        isDimmed: false, 
        audio: footerAudioUrl,
        sentAt: Date.now()
    };
    
    setBattleRows(prev => {
      const next = [...prev];
      const idx = next.findIndex(r => !r[activeSide]);
      if (idx !== -1) { next[idx] = { ...next[idx], [activeSide]: bar }; return next; }
      return [...next, { id: Date.now() + Math.random(), left: activeSide === 'left' ? bar : null, right: activeSide === 'right' ? bar : null }];
    });
    
    editorRef.current.innerHTML = ''; 
    setSyllableCount(0); 
    setFooterAudioUrl(null); 
    accumulatedSpeechRef.current = "";
  };

  const startFooterRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
      
      const mixedDest = audioCtxRef.current.createMediaStreamDestination();
      const micSource = audioCtxRef.current.createMediaStreamSource(stream);
      const micGain = audioCtxRef.current.createGain();
      micGain.gain.value = 1.0; 
      micSource.connect(micGain);
      micGain.connect(mixedDest);

      if (beatAudioRef.current && beatUrl) {
        if (!musicSourceNodeRef.current) {
            musicSourceNodeRef.current = audioCtxRef.current.createMediaElementSource(beatAudioRef.current);
        }
        const musicGain = audioCtxRef.current.createGain();
        musicGain.gain.value = 0.5;
        musicSourceNodeRef.current.connect(musicGain);
        musicGain.connect(mixedDest);
        musicSourceNodeRef.current.connect(audioCtxRef.current.destination);
      }
      
      footerMediaRecorder.current = new MediaRecorder(mixedDest.stream);
      footerAudioChunks.current = [];
      footerMediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) footerAudioChunks.current.push(e.data); };
      footerMediaRecorder.current.onstop = () => {
        const blob = new Blob(footerAudioChunks.current, { type: 'audio/webm' });
        setFooterAudioUrl(URL.createObjectURL(blob));
        micStreamRef.current?.getTracks().forEach(t => t.stop());
      };
      
      footerMediaRecorder.current.start();
      isRecordingRef.current = true;
      setIsFooterRecording(true);

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        footerRecognition.current = new SR();
        footerRecognition.current.lang = 'es-ES'; footerRecognition.current.continuous = true; footerRecognition.current.interimResults = true;
        footerRecognition.current.onresult = (ev) => {
          let sessionText = "";
          for (let i = 0; i < ev.results.length; i++) sessionText += ev.results[i][0].transcript + (ev.results[i].isFinal ? " " : "");
          const totalText = (accumulatedSpeechRef.current + " " + sessionText).trim();
          if (editorRef.current) { editorRef.current.innerText = totalText; setSyllableCount(countTotalSyllablesFromRaw(totalText)); }
        };
        footerRecognition.current.onend = () => { 
          if (isRecordingRef.current) {
            if (editorRef.current) accumulatedSpeechRef.current = editorRef.current.innerText;
            footerRecognition.current.start(); 
          }
        };
        footerRecognition.current.start();
      }
    } catch (err) { console.error("Recording mix error:", err); }
  };

  const stopFooterRecording = () => {
    isRecordingRef.current = false;
    if (footerMediaRecorder.current) footerMediaRecorder.current.stop();
    if (footerRecognition.current) { footerRecognition.current.onend = null; footerRecognition.current.stop(); }
    setIsFooterRecording(false);
  };

  const generateAIResponse = async () => {
    if (isGeneratingAI) return; setIsGeneratingAI(true);
    const ctx = battleRows.map(r => `${p1Name}: ${r.left?.text?.replace(/<[^>]*>/g, '') || ''}\n${p2Name}: ${r.right?.text?.replace(/<[^>]*>/g, '') || ''}`).join('\n');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Estamos en batalla. Concepto: ${currentTheme}. Contexto:\n${ctx}` }] }],
          systemInstruction: { parts: [{ text: "Eres el Demiurgo. Responde con 4 versos. Máximo 17 sílabas por verso." }] }
        })
      });
      const data = await res.json(); const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        let clean = text.replace(/[*_#`[\]()]/g, '').trim().split('\n').filter(l => l.trim() !== '').slice(0, 4).join('\n');
        const bar = { 
            text: String(clean.replace(/\n/g, '<br>')), 
            syllables: countTotalSyllablesFromRaw(clean), 
            isDimmed: false, 
            audio: null, 
            sentAt: Date.now() 
        };
        setBattleRows(prev => { 
          const next = [...prev], idx = next.findIndex(r => !r[activeSide]);
          if (idx !== -1) { next[idx] = { ...next[idx], [activeSide === 'left' ? 'right' : 'left']: bar }; return next; }
          return [...next, { id: Date.now() + Math.random(), left: null, right: bar }];
        });
      }
    } catch(e) {} finally { setIsGeneratingAI(false); }
  };

  const handleLocalFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file); setBeatUrl(url);
      if (beatAudioRef.current) { beatAudioRef.current.src = url; beatAudioRef.current.load(); }
      setShowBeatSettings(false);
    }
  };

  const toggleAutoColorInput = (e) => {
    if (e) e.preventDefault();
    if (!editorRef.current) return;
    if (isAutoColored) { 
      editorRef.current.innerHTML = editorRef.current.innerText; 
      setIsAutoColored(false); 
    } else { 
      editorRef.current.innerHTML = applyRhymeColorsToText(editorRef.current.innerText); 
      setIsAutoColored(true); 
    }
  };

  const addTrainingWord = () => {
    if (newTrainingWord.trim()) {
      const updated = new Set(trainingList);
      updated.add(newTrainingWord.trim().toLowerCase());
      setTrainingList(updated);
      setNewTrainingWord("");
    }
  };

  const removeTrainingWord = (word) => {
    const updated = new Set(trainingList);
    updated.delete(word);
    setTrainingList(updated);
  };

  useEffect(() => {
    const totalCount = battleRows.reduce((acc, row) => {
      const countSpans = (side) => (typeof row[side]?.text === 'string' ? (row[side].text.match(/<span/g) || []).length : 0);
      return acc + countSpans('left') + countSpans('right');
    }, 0);
    setIntensity(Math.min((Number(totalCount) || 0) * 4, 95));
  }, [battleRows]);

  return (
    <div className="h-screen bg-[#0a0a0c] text-white font-sans flex flex-col overflow-hidden relative">
      <audio ref={beatAudioRef} crossOrigin="anonymous" onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)} onLoadedMetadata={(e) => { if(e.target.duration) setDuration(e.target.duration); }} loop />
      <div className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-1000" style={{ background: `radial-gradient(circle at 50% 50%, #22d3ee 0%, transparent ${intensity}%)`, filter: `blur(${intensity / 2}px)` }} />

      <div className="flex-none border-b border-white/5 p-4 bg-black/90 backdrop-blur-xl z-30 grid grid-cols-[1fr_auto_1fr] items-center shadow-2xl">
        {/* MODIFICADO: Ahora el input de P1 muestra tu nombre real y un botón de Logout */}
        <div className="flex justify-start pr-4">
            <div className="max-w-[200px] w-full flex flex-col">
                <input value={p1Name} onChange={e => setP1Name(e.target.value.toUpperCase())} className="bg-transparent border-none outline-none text-lg font-black text-cyan-400 uppercase tracking-widest w-full" disabled />
                <button onClick={logout} className="text-[8px] text-red-500 hover:text-red-400 text-left uppercase font-bold tracking-widest cursor-pointer mt-1">Cerrar Sesión</button>
            </div>
        </div>
        
        <div className="flex flex-col items-center"><div className="flex items-center gap-2"><ZapIcon size={42} className="text-[#FFFF00] fill-[#FFFF00] animate-lightning-elegant" /><div className="font-black italic text-4xl uppercase tracking-tighter flex gap-2"><span className="text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]">RIMAS</span><span className="text-[#00FFFF] drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">MVP</span></div></div></div>
        <div className="flex justify-end pl-4 text-right"><div className="max-w-[180px] w-full"><input value={p2Name} onChange={e => setP2Name(e.target.value.toUpperCase())} className="bg-transparent border-none outline-none text-lg font-black text-red-600 uppercase tracking-widest w-full text-right" /></div></div>
      </div>

      {currentTheme && (
        <div className="flex-none bg-gradient-to-r from-cyan-900/20 via-black to-red-900/20 border-b border-white/10 py-2 flex items-center justify-center gap-4 animate-in fade-in slide-in-from-top-4"><Target size={14} className="text-yellow-500" /><span className="text-[10px] font-black tracking-[0.4em] text-white/80 uppercase">CONCEPTO: {String(currentTheme)}</span><Target size={14} className="text-yellow-500" /></div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-14 bg-black border-r border-white/5 flex flex-col items-center py-4 gap-6 z-20 flex-none shadow-xl">
          <button type="button" onClick={() => { const idx = Math.floor(Math.random() * CONCEPTS.length); setCurrentTheme(CONCEPTS[idx]); }} title="Nueva Temática" className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 transition-all shadow-lg flex-none"><Sparkle size={18} /></button>
          <button type="button" onClick={() => setShowBeatSettings(!showBeatSettings)} className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${beatUrl ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'} hover:bg-white/10`}><Settings size={18} /></button>
          {showBeatSettings && (
            <div className="absolute left-16 top-24 w-80 bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl p-5 shadow-2xl z-50 animate-in fade-in slide-in-from-left-4">
              <div className="flex items-center justify-between mb-4"><h3 className="text-[11px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2"><Disc size={12}/> Beat Engine</h3><button onClick={() => setShowBeatSettings(false)} className="text-white/20 hover:text-white"><X size={14} /></button></div>
              <button onClick={() => fileInputRef.current.click()} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] uppercase py-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"><Upload size={14} /> Subir MP3 Local</button>
              <input type="file" ref={fileInputRef} onChange={handleLocalFileSelect} accept="audio/*" className="hidden" />
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar">
          <div className="max-w-4xl mx-auto flex flex-col gap-20 pb-48 mt-8"> 
            {battleRows.map((row, idx) => {
              const leftFirst = row.left && row.right && (row.left.sentAt || 0) < (row.right.sentAt || 0);
              const rightFirst = row.left && row.right && (row.right.sentAt || 0) < (row.left.sentAt || 0);
              return (
                <div key={row.id} className="flex items-center gap-4 relative"> 
                  <div className={`flex-1 flex items-stretch transition-all duration-500 relative group/bubble ${row.left?.isDimmed ? 'opacity-20 scale-95 blur-[1px]' : 'opacity-100'}`}>
                    {row.left && (
                      <>
                        <PowerBar content={row.left.text} side="left" />
                        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-left-6 relative">
                          <div className="absolute -top-14 left-0 flex gap-2 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300 z-10 scale-90 group-hover/bubble:scale-100">
                            <button onClick={() => toggleBubbleDim(idx, 'left')} className="p-3 rounded-full bg-slate-900 border border-white/20 shadow-2xl text-white hover:text-yellow-400 hover:scale-110 transition-all"><ZapIcon size={18} fill={row.left.isDimmed ? "none" : "currentColor"} /></button>
                            <button onClick={() => removeBubble(idx, 'left')} className="p-3 rounded-full bg-slate-900 border border-white/20 shadow-2xl text-white hover:text-rose-500 hover:scale-110 transition-all"><X size={18} strokeWidth={3} /></button>
                          </div>
                          <EditableBubble content={row.left.text} rowIndex={idx} side="left" onUpdate={handleBubbleUpdate} fontSize={fontSize} isOffset={leftFirst} />
                          <BubbleAudio savedAudio={row.left.audio} onAudioSave={(u) => handleAudioSave(idx, 'left', u)} />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="w-6 opacity-5 text-[8px] font-black italic self-center text-center tabular-nums font-mono">V{idx + 1}</div>
                  <div className={`flex-1 flex items-stretch transition-all duration-500 relative group/bubble ${row.right?.isDimmed ? 'opacity-20 scale-95 blur-[1px]' : 'opacity-100'}`}>
                    {row.right && (
                      <>
                        <div className="flex-1 flex flex-col items-end animate-in fade-in slide-in-from-right-6 relative">
                          <div className="absolute -top-14 right-0 flex gap-2 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300 z-10 scale-90 group-hover/bubble:scale-100">
                            <button onClick={() => toggleBubbleDim(idx, 'right')} className="p-3 rounded-full bg-slate-900 border border-white/20 shadow-xl text-white hover:text-yellow-400 hover:scale-110 transition-all"><ZapIcon size={18} fill={row.right.isDimmed ? "none" : "currentColor"} /></button>
                            <button onClick={() => removeBubble(idx, 'right')} className="p-3 rounded-full bg-slate-950 border border-white/20 shadow-xl text-white hover:text-rose-500 hover:scale-110 transition-all"><X size={18} strokeWidth={3} /></button>
                          </div>
                          <EditableBubble content={row.right.text} rowIndex={idx} side="right" onUpdate={handleBubbleUpdate} fontSize={fontSize} isOffset={rightFirst} />
                          <BubbleAudio savedAudio={row.right.audio} onAudioSave={(u) => handleAudioSave(idx, 'right', u)} />
                        </div>
                        <PowerBar content={row.right.text} side="right" />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-14 bg-black border-l border-white/5 flex flex-col items-center py-4 gap-4 z-20 flex-none h-full shadow-2xl">
           <div className="flex flex-col gap-2 flex-none"><button type="button" onClick={() => setFontSize(f => Math.min(30, f+1))} className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-white active:scale-90 transition-transform"><Plus size={10} /></button><button type="button" onClick={() => setFontSize(f => Math.max(10, f-1))} className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-white active:scale-90 transition-transform"><Minus size={10} /></button></div>
           <div className="grid grid-cols-2 gap-2 px-1 flex-none">{COLORS.map(color => (<button key={color.id} type="button" onMouseDown={e => { e.preventDefault(); applyHighlightSelection(color); }} className="w-5 h-5 rounded-sm border border-black/40 hover:scale-110 transition-transform shadow-lg" style={{ backgroundColor: color.hex }} />))}</div>
           <div className="my-2 w-6 h-px bg-white/10 flex-none" />
           <div className="flex flex-col gap-3 pb-8 flex-none"><button type="button" onClick={removeHighlightSelection} className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors" title="Borrar Resaltado"><Eraser size={14} /></button><button type="button" onClick={() => setBattleRows(prev => prev.map(r => ({...r, left: r.left?{...r.left, isDimmed:true}:null, right: r.right?{...r.right, isDimmed:true}:null})))} className="w-8 h-8 rounded bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shadow-lg" title="Apagar todo"><Power size={14} /></button><button type="button" onClick={() => setBattleRows([])} className="w-8 h-8 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors" title="Limpiar Canvas"><Trash2 size={14} /></button></div>
        </div>
      </div>

      <div className="flex-none p-4 bg-black border-t border-white/5 shadow-2xl relative z-40">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex gap-2">
              <button type="button" onClick={() => setActiveSide('left')} className={`px-4 py-1.5 rounded-full text-[9px] font-black transition-all border ${activeSide === 'left' ? 'bg-cyan-500 border-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-white/5 border-white/10 text-white/40'}`}>ESCRIBES TÚ</button>
              <button type="button" onClick={() => setActiveSide('right')} className={`px-4 py-1.5 rounded-full text-[9px] font-black transition-all border ${activeSide === 'right' ? 'bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-white/5 border-white/10 text-white/40'}`}>ESCRIBE RIVAL</button>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full min-w-[320px]"><button type="button" onClick={handleBeatToggle} className={`flex-none transition-all ${!beatUrl ? 'opacity-30' : 'hover:scale-110'}`}>{isBeatPlaying ? <Pause size={16} fill="white" className="text-white" /> : <span className="text-[18px]">🗽</span>}</button><div className="flex-1 flex flex-col gap-1"><input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400 custom-range" /><div className="flex justify-between items-center text-[7px] font-black tracking-widest text-white/40 tabular-nums font-mono"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div></div></div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowTrainingPanel(!showTrainingPanel)} className={`px-4 py-1.5 rounded-full text-[9px] font-black flex items-center gap-1.5 transition-all border ${showTrainingPanel ? 'bg-yellow-500 border-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-yellow-500'}`}><BrainCircuit size={12} /> ENTRENAR</button>
              <button type="button" onClick={toggleAutoColorInput} className={`px-4 py-1.5 rounded-full text-[9px] font-black flex items-center gap-1.5 transition-all relative overflow-hidden group ${isAutoColored ? 'bg-indigo-600 text-white shadow-[0_0_15px_indigo]' : 'bg-black text-white border border-white/20 shadow-lg'}`}><Sparkles size={12} /> {isAutoColored ? 'QUITAR' : 'AUTO-COLOR'}</button>
              <button type="button" onClick={generateAIResponse} disabled={isGeneratingAI} className="px-5 py-1.5 rounded-full text-[9px] font-black flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white disabled:opacity-50 shadow-lg active:scale-95 transition-all"><Dna size={12} /> INVOCAR DEMIURGO</button>
            </div>
          </div>

          {showTrainingPanel && (
            <div className="bg-slate-950 border border-yellow-500/30 rounded-xl p-4 animate-in slide-in-from-bottom-2 shadow-2xl">
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black tracking-widest text-yellow-500 uppercase flex items-center gap-2"><BrainCircuit size={14}/> Entrenamiento de Motor</span>
                    <button onClick={() => setShowTrainingPanel(false)} className="text-white/20 hover:text-white"><X size={12} /></button>
                </div>
                <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="Escribe palabra a ignorar..." className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-yellow-500" value={newTrainingWord} onChange={(e) => setNewTrainingWord(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTrainingWord()} />
                    <button onClick={addTrainingWord} className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-black text-[10px] uppercase active:scale-95">AÑADIR</button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
                    {Array.from(trainingList).filter(w => !INITIAL_STOPWORDS.includes(w)).map(word => (
                        <span key={word} className="bg-white/5 border border-white/10 rounded-full px-2 py-1 text-[8px] flex items-center gap-1.5 group hover:border-rose-500 transition-colors uppercase font-bold tracking-tighter">
                            {word}
                            <button onClick={() => removeTrainingWord(word)} className="text-white/20 group-hover:text-rose-500"><X size={8}/></button>
                        </span>
                    ))}
                </div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl flex items-center min-h-[50px] focus-within:border-cyan-500/50 px-4 relative shadow-inner"><div 
                ref={editorRef} 
                contentEditable 
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); dropBar(); } }} 
                onInput={handleEditorInput} 
                className="flex-1 bg-transparent py-3 outline-none text-lg font-bold italic text-white tracking-tight" 
                data-placeholder="Di lo que tu alma dicta..." 
            /><div className="flex items-center gap-3"><div className="text-[9px] font-black text-white/20 uppercase tracking-widest tabular-nums font-mono">{String(syllableCount || 0)} SIL</div><button type="button" onClick={isFooterRecording ? stopFooterRecording : startFooterRecording} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isFooterRecording ? 'bg-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-white/5 hover:bg-white/10 text-white/40'}`}><Mic size={18} /></button></div></div>
            <button type="button" onClick={dropBar} className="px-8 rounded-xl bg-cyan-500 text-white font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 hover:brightness-110 transition-all">🏆🐗</button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes lightning-elegant { 0%, 100% { opacity: 1; filter: drop-shadow(0 0 10px #FFFF00); } 50% { opacity: 0.4; filter: drop-shadow(0 0 3px #FFFF00); } }
        .animate-lightning-elegant { animation: lightning-elegant 2.5s ease-in-out infinite; }
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #4b5563; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-range::-webkit-slider-thumb { -webkit-appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #00FFFF; box-shadow: 0 0 10px #00FFFF; cursor: pointer; border: 2px solid white; transition: all 0.2s; }
        .custom-range::-webkit-slider-thumb:hover { transform: scale(1.3); }
        .bg-rainbow-glow { background: linear-gradient(90deg, #ff0000, #ff00ff, #00ffff, #ffff00, #ff0000); background-size: 400% 400%; }
      `}</style>
                  {showProfile && user && (
    <UserProfile user={user} onClose={() => setShowProfile(false)} />
)}
    </div>
  );
};
// Reconstruyendo para activar llaves v4.3
