// Detección automática: Localhost vs Servidor Render en Producción
export const API_BASE = 
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : ((import.meta.env.VITE_API_URL as string) || 'https://lyaxis-ia.onrender.com');

export const GOOGLE_CLIENT_ID = "1073688660808-amgupffpqddmmo89vemaaupje20531t6.apps.googleusercontent.com";
export const APP_URL = "https://lyaxis-ia.vercel.app";

import type { ModelType } from './types';

export const ALL_MODELS: ModelType[] = ['speed', 'cortex', 'zenith'];

export const MODEL_META: Record<ModelType, { label: string; tagline: string; color: string; description: string; temperature: number }> = {
  speed: {
    label: 'Speed',
    tagline: 'Motor Principal / Diario',
    color: '#2563FF',
    description: 'Respuestas en milisegundos, streaming ultra-rápido, asistencia constante y código ágil sin fricción.',
    temperature: 0.3
  },
  cortex: {
    label: 'Cortex',
    tagline: 'Razonamiento Profundo',
    color: '#7C3AED',
    description: 'Análisis lógico paso a paso (Chain of Thought), matemáticas, algoritmos complejos y depuración estructurada.',
    temperature: 0.2
  },
  zenith: {
    label: 'Zenith',
    tagline: 'Tope de Gama / Máxima Inteligencia',
    color: '#00D9FF',
    description: 'El cerebro superior del laboratorio. Capacidades multimodales completas (de imagen/UI a código ejecutable), diseño de sistemas y síntesis técnica avanzada.',
    temperature: 0.4
  },
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
    description: 'Copiloto pedagógico senior y arquitecto didáctico.',
    temperature: 0.4
  },
  phantom: {
    label: 'Phantom',
    tagline: 'Auditoría y Detección de Errores',
    color: '#EF4444',
    description: 'El deconstructor y auditor implacable. Encuentra fallas, bugs y puntos de fracaso.',
    temperature: 0.3
  },
  architect: {
    label: 'Architect',
    tagline: 'Estructura y Mentoría Técnica',
    color: '#10B981',
    description: 'Módulo de arquitectura de prompts y mentoría técnica.',
    temperature: 0.3
  },
  forge: {
    label: 'Forge',
    tagline: 'Constructor de Proyectos y Negocio',
    color: '#F97316',
    description: 'Constructor práctico. Convierte ideas vagas en proyectos reales y concretos.',
    temperature: 0.6
  },
  nexus: {
    label: 'Nexus',
    tagline: 'Creatividad y Análisis Visual',
    color: '#EC4899',
    description: 'Sintetizador creativo transversal y visión multimodal.',
    temperature: 0.6
  },
  root: {
    label: 'Root',
    tagline: 'Kernel de Gobernanza',
    color: '#00FF66',
    description: 'Orquestación técnica, sesiones, seguridad y enrutamiento seguro.',
    temperature: 0.2
  },
};

export const MODEL_TEMPERATURES: Record<ModelType, number> = {
  speed: 0.3,
  cortex: 0.2,
  zenith: 0.4,
  root: 0.2,
  phantom: 0.3,
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
  zenith: [
    "Sube una captura de UI para convertirla a código React",
    "Diseña la arquitectura de microservicios para este proyecto",
    "Audita y reconstruye este módulo con el protocolo Break + Rebuild",
    "Analiza este diagrama de flujo y genera los modelos TypeScript"
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