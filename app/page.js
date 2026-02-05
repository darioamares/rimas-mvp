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
  const mins = Math.floor(seconds /
