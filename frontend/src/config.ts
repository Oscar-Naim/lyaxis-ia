// Detección automática: Localhost vs Servidor Render en Producción
export const API_BASE = 
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : ((import.meta.env.VITE_API_URL as string) || 'https://lyaxis-ia.onrender.com');

export const GOOGLE_CLIENT_ID = "1073688660808-amgupffpqddmmo89vemaaupje20531t6.apps.googleusercontent.com";

import type { ModelType } from './types';

export const ALL_MODELS: ModelType[] = ['speed', 'cortex', 'architect', 'classic', 'phantom', 'nexus', 'forge', 'magister', 'root'];

export const MODEL_META: Record<ModelType, { label: string; tagline: string; color: string; description: string; temperature: number }> = {
  classic: {
    label: 'Classic',
    tagline: 'Chat General y Cotidiano',
    color: '#F59E0B',
    description: 'Tu compañero inteligente para el día a día. Pregunta lo que quieras.',
    temperature: 0.4
  },
  magister: {
    label: 'Magister',
    tagline: 'Planeaciones y Docencia SEP',
    color: '#06B6D4',
    description: 'Copiloto pedagógico senior y arquitecto de planeaciones docente SEP para todos los niveles.',
    temperature: 0.4
  },
  cortex: {
    label: 'Cortex',
    tagline: 'Matemáticas y Razonamiento',
    color: '#7C3AED',
    description: 'Motor de razonamiento profundo y arquitectura matemática de máxima precisión con DeepSeek R1.',
    temperature: 0.2
  },
  speed: {
    label: 'Speed',
    tagline: 'Respuestas Ágiles y Tareas',
    color: '#2563FF',
    description: 'Asistente de desarrollo ágil y streaming ultrarrápido sin cortesías innecesarias de LYAXIS labs.',
    temperature: 0.3
  },
  phantom: {
    label: 'Phantom',
    tagline: 'Auditoría y Detección de Errores',
    color: '#EF4444',
    description: 'El deconstructor y auditor implacable con Meta LLaMA 3.3 70B. Encuentra fallas, bugs y puntos de fracaso.',
    temperature: 0.3
  },
  architect: {
    label: 'Architect',
    tagline: 'Estructura y Mentoría Técnica',
    color: '#10B981',
    description: 'Módulo de arquitectura de prompts y mentoría técnica con Meta LLaMA 3.3 70B.',
    temperature: 0.3
  },
  forge: {
    label: 'Forge',
    tagline: 'Constructor de Proyectos y Negocio',
    color: '#F97316',
    description: 'Constructor práctico con LLaMA 3.1 Nemotron 70B. Convierte ideas vagas en proyectos reales y concretos.',
    temperature: 0.6
  },
  nexus: {
    label: 'Nexus',
    tagline: 'Creatividad y Análisis Visual',
    color: '#EC4899',
    description: 'Sintetizador creativo transversal y visión multimodal (análisis de imágenes con LLaMA 3.2 11B Vision).',
    temperature: 0.6
  },
  root: {
    label: 'Root',
    tagline: 'Modo Técnico Especializado',
    color: '#00FF66',
    description: 'Ejecución técnica total: interfaces completas (UI/UX), full-stack, bajo nivel y código sin filtros.',
    temperature: 0.2
  },
};

export const MODEL_TEMPERATURES: Record<ModelType, number> = {
  cortex: 0.2,
  root: 0.2,
  phantom: 0.3,
  speed: 0.3,
  architect: 0.3,
  magister: 0.4,
  classic: 0.4,
  nexus: 0.6,
  forge: 0.6,
};

export const MODEL_QUICK_ACTIONS: Record<ModelType, string[]> = {
  speed: [
    "Crea un hook de debounce en React",
    "Script en Python para renombrar archivos por fecha",
    "Optimiza esta consulta SQL",
    "Explícame la diferencia entre let y const"
  ],
  cortex: [
    "Analiza la complejidad de Dijkstra vs A*",
    "Resuelve el problema de la mochila (Knapsack) con DP",
    "Diseña la arquitectura para un chat WebSocket distribuido",
    "Demuestra formalmente por qué QuickSort es O(n log n)"
  ],
  phantom: [
    "Audita este login contra inyecciones SQL y XSS",
    "Encuentra fugas de memoria en este bucle de Node.js",
    "Deconstruye este script y dime sus 3 peores fallos",
    "Stress-test a esta lógica de autenticación JWT"
  ],
  magister: [
    "Diseña una secuencia didáctica con enfoque NEM",
    "Crea una rúbrica de evaluación formativa para secundaria",
    "Explica el concepto de derivadas con una analogía cotidiana",
    "Diseña un reactivo tipo examen con distractores justificados"
  ],
  forge: [
    "Aterriza esta idea de SaaS en un MVP de 1 fin de semana",
    "Estructura el modelo de negocio freemium para una app",
    "Diseña el funnel de conversión para desarrolladores",
    "¿Cuál es la stack mínima viable para validar esta idea?"
  ],
  nexus: [
    "Sube un diagrama o imagen para analizar su estructura",
    "Combina conceptos de biología y desarrollo de software",
    "Escribe un ensayo de ciencia ficción cyberpunk",
    "Analiza este wireframe y sugiere mejoras de UX"
  ],
  classic: [
    "¿Cuáles son las mejores técnicas de gestión de tiempo para devs?",
    "Ayúdame a redactar un correo profesional convincente",
    "Crea un plan de estudio estructurado de 30 días para aprender Rust",
    "Recomiéndame 5 libros que cambien mi perspectiva sobre sistemas"
  ],
  architect: [
    "Diseña un System Prompt para un agente autónomo de soporte",
    "Explica el patrón Observer con un ejemplo práctico en TypeScript",
    "Estructura un prompt con few-shot examples para clasificación",
    "¿Cuáles son los 5 antipatrones más comunes al diseñar prompts?"
  ],
  root: [
    "Diseña una interfaz web futurista en React con animaciones en CSS puro",
    "Crea un backend asíncrono con FastAPI y SQLite con pool de conexiones",
    "Implementa una cola de tareas distribuida en Python desde cero",
    "Escribe un parser AST en TypeScript para un mini lenguaje"
  ]
};