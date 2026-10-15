import type { ModelType } from '../types';

export interface RouteMatch {
  model: ModelType;
  confidence: number;
  reason: string;
}

/**
 * Heuristic Neural Auto-Router:
 * Analyzes the user's prompt text and decides the optimal LYAXIS specialized model.
 */
export function routePromptToModel(prompt: string, hasImage: boolean = false): RouteMatch {
  if (hasImage) {
    return {
      model: 'zenith',
      confidence: 0.99,
      reason: 'Detección de imagen adjunta: enrutando al modelo multimodal Zenith.',
    };
  }

  const clean = (prompt || '').toLowerCase().trim();
  if (!clean) {
    return { model: 'speed', confidence: 0.5, reason: 'Consulta vacía: asignado a Speed.' };
  }

  // 1. Magister (Pedagogía SEP / NEM)
  const magisterKeywords = [
    'planeación', 'planeacion', 'didáctica', 'didactica', 'rúbrica', 'rubrica', 
    'nem', 'nueva escuela mexicana', 'sep', 'evaluación formativa', 'evaluacion formativa',
    'campos formativos', 'ejes articuladores', 'secuencia didáctica', 'secuencia didactica',
    'alumnos', 'preescolar', 'primaria', 'secundaria', 'preparatoria', 'docente', 'pedagógico'
  ];
  if (magisterKeywords.some((k) => clean.includes(k))) {
    return {
      model: 'magister',
      confidence: 0.95,
      reason: 'Términos pedagógicos detectados: enrutando a Magister (Especialista SEP/NEM).',
    };
  }

  // 2. Phantom (Ciberseguridad y Auditoría)
  const phantomKeywords = [
    'vulnerabilidad', 'cve', 'pentest', 'owasp', 'xss', 'csrf', 'sql injection', 
    'inyección', 'inyeccion', 'auditoría de seguridad', 'exploit', 'firewall',
    'fuzzing', 'reversing', 'auditar código', 'seguridad informática', 'malware'
  ];
  if (phantomKeywords.some((k) => clean.includes(k))) {
    return {
      model: 'phantom',
      confidence: 0.92,
      reason: 'Enfoque de ciberseguridad detectado: enrutando a Phantom (Auditor de Riesgos).',
    };
  }

  // 3. Root (Bare-Metal, Full UI/Code, PoC, Sin Filtros)
  const rootKeywords = [
    'bare metal', 'bare-metal', 'sin filtro', 'código completo', 'codigo completo',
    'ensamblador', 'assembly', 'kernel', 'driver', 'hooking', 'shellcode',
    'interfaz completa en react', 'aplicación completa', 'app interactiva'
  ];
  if (rootKeywords.some((k) => clean.includes(k))) {
    return {
      model: 'root',
      confidence: 0.90,
      reason: 'Solicitud de ejecución técnica absoluta: enrutando a Root (Bare-Metal).',
    };
  }

  // 4. Architect (Arquitectura, Backend, Bases de Datos)
  const architectKeywords = [
    'arquitectura', 'microservicios', 'patrón de diseño', 'patron de diseño', 'patrones de diseño',
    'docker', 'kubernetes', 'postgresql', 'sqlite', 'redis', 'api rest', 'fastapi',
    'esquema de base de datos', 'refactorizar', 'diagrama de clases', 'clean code'
  ];
  if (architectKeywords.some((k) => clean.includes(k))) {
    return {
      model: 'architect',
      confidence: 0.88,
      reason: 'Ingeniería y arquitectura de software detectada: enrutando a Architect.',
    };
  }

  // 5. Forge (MVP, Negocios, Startups)
  const forgeKeywords = [
    'mvp', 'startup', 'modelo de negocio', 'canvas', 'monetización', 'monetizacion',
    'propuesta de valor', 'roadmap', 'pitch deck', 'lanzar producto', 'validar idea',
    'estrategia de lanzamiento', 'pricing', 'saas'
  ];
  if (forgeKeywords.some((k) => clean.includes(k))) {
    return {
      model: 'forge',
      confidence: 0.87,
      reason: 'Construcción y validación de negocio detectada: enrutando a Forge (Constructor Pragmatico).',
    };
  }

  // 6. Cortex (Razonamiento Profundo, Matemáticas, Lógica)
  const cortexKeywords = [
    'demostración', 'demostracion', 'teorema', 'matemáticas', 'matematicas', 'cálculo',
    'paradoja', 'acertijo', 'puzzle', 'análisis deductivo', 'pensamiento lateral',
    'optimización matemática', 'prueba formal', 'razona paso a paso'
  ];
  if (cortexKeywords.some((k) => clean.includes(k))) {
    return {
      model: 'cortex',
      confidence: 0.86,
      reason: 'Razonamiento lógico o matemático detectado: enrutando a Cortex (Analista Profundo).',
    };
  }

  // 7. Nexus (Sinergias, Cruces Interdisciplinarios)
  const nexusKeywords = [
    'analogía entre', 'analoga entre', 'relaciona', 'interdisciplinario',
    'cruce entre', 'metáfora de', 'conectar ideas', 'sinergia'
  ];
  if (nexusKeywords.some((k) => clean.includes(k))) {
    return {
      model: 'nexus',
      confidence: 0.85,
      reason: 'Pensamiento interdisciplinario detectado: enrutando a Nexus.',
    };
  }

  // 8. Speed (Consultas rápidas o directas)
  const speedKeywords = [
    'en una palabra', 'rápido', 'rapido', 'en 1 frase', 'en una frase',
    'resumen ultra', 'directo al grano', 'breve', 'sin explicaciones'
  ];
  if (speedKeywords.some((k) => clean.includes(k)) || clean.length < 25) {
    return {
      model: 'speed',
      confidence: 0.80,
      reason: 'Consulta ágil o ultra breve: enrutando a Speed.',
    };
  }

  // Default: Mantener el modelo actual o usar Classic si no hay nada especializado
  return {
    model: 'classic',
    confidence: 0.60,
    reason: 'Consulta de propósito general: asignado a Classic.',
  };
}
