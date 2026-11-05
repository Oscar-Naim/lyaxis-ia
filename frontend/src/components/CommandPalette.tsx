import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Zap,
  Brain,
  Sparkles,
  Compass,
  MessageCircle,
  Crosshair,
  Waypoints,
  Hammer,
  GraduationCap,
  Terminal,
  Plus,
  Trash2,
  FileDown,
  FileText,
  FileCode,
  Sliders,
  BookOpen,
  LayoutDashboard,
  Tv,
  Palette,
  Volume2,
  VolumeX,
  Command,
  X,
  GitFork,
  Thermometer,
  ArrowRight,
} from 'lucide-react';
import type { ModelType, Conversation, PaletteAction, PaletteCategory } from '../types';
import { MODEL_META, THEMES } from '../config';
import { playCyberClick, playCyberBeep } from '../sound';
import { checkTriadLimit } from '../useTriadQuota';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (model: ModelType) => void;
  currentModel: ModelType;
  // Session actions
  onNewChat: () => void;
  onClearChat?: () => void;
  onForkThread?: () => void;
  // Export actions
  onExportPDF?: () => void;
  onExportMarkdown?: () => void;
  onExportJSON?: () => void;
  // Temperature actions
  currentTemperature?: number;
  onSetTemperature?: (temp: number) => void;
  // History
  conversations?: Conversation[];
  onSelectConversation?: (c: Conversation) => void;
  // Views and modules
  isTriadActive?: boolean;
  onToggleTriad?: () => void;
  onOpenDirectives?: () => void;
  onOpenNotebook?: () => void;
  onOpenDashboard?: () => void;
  // FX
  isScanlineActive?: boolean;
  onToggleScanline?: () => void;
  isChromaticActive?: boolean;
  onToggleChromatic?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

const CATEGORIES: { id: PaletteCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'engine', label: 'Motores' },
  { id: 'session', label: 'Sesión' },
  { id: 'export', label: 'Exportar' },
  { id: 'parameters', label: 'Parámetros' },
  { id: 'history', label: 'Historial' },
  { id: 'view', label: 'Vistas' },
];

const MODEL_ICONS: Record<ModelType, (s: number, c?: string) => React.ReactNode> = {
  speed: (s, c) => <Zap size={s} color={c || '#3b82f6'} />,
  cortex: (s, c) => <Brain size={s} color={c || '#a855f7'} />,
  zenith: (s, c) => <Sparkles size={s} color={c || '#00d9ff'} />,
  architect: (s, c) => <Compass size={s} color={c || '#10b981'} />,
  classic: (s, c) => <MessageCircle size={s} color={c || '#f59e0b'} />,
  phantom: (s, c) => <Crosshair size={s} color={c || '#ef4444'} />,
  nexus: (s, c) => <Waypoints size={s} color={c || '#ec4899'} />,
  forge: (s, c) => <Hammer size={s} color={c || '#f97316'} />,
  magister: (s, c) => <GraduationCap size={s} color={c || '#06b6d4'} />,
  root: (s, c) => <Terminal size={s} color={c || '#00ff66'} />,
};

/**
 * Algoritmo determinista de scoring difuso para CommandPalette:
 * - Exact match: +200
 * - Exact prefix: +100
 * - Acronym / Initials: +60
 * - Substring: +40 (+ bonus de posición)
 * - Keywords match: +30
 * - Subsequence fuzzy con penalización por distancia de caracteres: max(5, 30 - 2*gaps)
 */
export function computeFuzzyScore(query: string, action: PaletteAction): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const title = action.title.toLowerCase();
  const shortcut = (action.shortcut || '').toLowerCase();
  const subtitle = (action.subtitle || '').toLowerCase();
  const category = action.category.toLowerCase();
  const keywords = (action.keywords || []).map((k) => k.toLowerCase());

  // 1. Coincidencia exacta
  if (title === q || shortcut === q) return 200;

  let totalScore = 0;

  // 2. Prefijo exacto (+100)
  if (title.startsWith(q) || shortcut.startsWith(q)) {
    totalScore += 100;
  } else if (shortcut.startsWith('@') && shortcut.slice(1).startsWith(q)) {
    totalScore += 100;
  }

  // 3. Acrónimos (+60)
  const words = title.split(/[\s\-_:/]+/).filter(Boolean);
  const acronym = words.map((w) => w[0]).join('');
  if (acronym.length >= q.length && acronym.includes(q)) {
    totalScore += 60;
  }

  // 4. Subcadena en título (+40 + bonus por cercanía al inicio)
  const titleIdx = title.indexOf(q);
  if (titleIdx >= 0) {
    totalScore += 40 + Math.max(0, 20 - titleIdx * 2);
  } else {
    // Subcadena en keywords (+30)
    const kwHit = keywords.some((k) => k.includes(q) || q.includes(k));
    if (kwHit) {
      totalScore += 30;
    } else {
      // Subcadena en subtítulo (+20) o categoría (+15)
      if (subtitle.includes(q)) {
        totalScore += 20;
      } else if (category.includes(q)) {
        totalScore += 15;
      }
    }
  }

  // 5. Coincidencia difusa de subsecuencia de caracteres con penalización por distancia
  if (totalScore === 0 && q.length > 1) {
    let qIdx = 0;
    let gaps = 0;
    let prevIdx = -1;

    for (let i = 0; i < title.length && qIdx < q.length; i++) {
      if (title[i] === q[qIdx]) {
        if (prevIdx !== -1) {
          gaps += (i - prevIdx - 1);
        }
        prevIdx = i;
        qIdx++;
      }
    }

    if (qIdx === q.length) {
      const distancePenalty = gaps * 2;
      totalScore += Math.max(5, 30 - distancePenalty);
    }
  }

  if (totalScore > 0 && action.priority) {
    totalScore += action.priority;
  }

  return totalScore;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectModel,
  currentModel,
  onNewChat,
  onClearChat,
  onForkThread,
  onExportPDF,
  onExportMarkdown,
  onExportJSON,
  currentTemperature = 0.4,
  onSetTemperature,
  conversations = [],
  onSelectConversation,
  isTriadActive = false,
  onToggleTriad,
  onOpenDirectives,
  onOpenNotebook,
  onOpenDashboard,
  isScanlineActive = false,
  onToggleScanline,
  isChromaticActive = false,
  onToggleChromatic,
  soundEnabled = true,
  onToggleSound,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PaletteCategory | 'all'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global capture keyboard listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDownCapture, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDownCapture, { capture: true });
  }, [isOpen, onClose]);

  // Focus and sound on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setActiveCategory('all');
      playCyberBeep(700, 0.05);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Construct Action Registry
  const actions: PaletteAction[] = useMemo(() => {
    const list: PaletteAction[] = [];

    // 1. ENGINES (All 10 Models)
    const allModelsList: ModelType[] = [
      'speed', 'cortex', 'zenith', 'architect', 'classic',
      'phantom', 'nexus', 'forge', 'magister', 'root'
    ];

    allModelsList.forEach((m) => {
      const meta = MODEL_META[m] || MODEL_META.speed;
      const isCurrent = currentModel === m;
      list.push({
        id: `engine-${m}`,
        category: 'engine',
        title: `Activar Motor: ${meta.label}`,
        subtitle: `${meta.tagline} — T:${meta.temperature} · ${meta.description.slice(0, 60)}...`,
        keywords: [m, meta.label, meta.tagline, `@${m}`, 'modelo', 'motor', 'ia', 'engine'],
        badge: isCurrent ? 'ACTIVO' : undefined,
        icon: MODEL_ICONS[m] ? MODEL_ICONS[m](16, meta.color) : <Zap size={16} color={meta.color} />,
        color: meta.color,
        shortcut: `@${m}`,
        priority: isCurrent ? 50 : 20,
        perform: () => {
          onSelectModel(m);
          onClose();
        },
      });
    });

    // 2. SESSION ACTIONS
    list.push({
      id: 'session-new-chat',
      category: 'session',
      title: 'Iniciar Nueva Sesión Limpia',
      subtitle: 'Crea un nuevo hilo conversacional con el modelo activo',
      keywords: ['new', 'nuevo', 'nueva', 'chat', 'sesion', 'hilo', 'reset', '/new'],
      icon: <Plus size={16} color="#3b82f6" />,
      color: '#3b82f6',
      shortcut: 'Alt+N',
      priority: 40,
      perform: () => {
        onNewChat();
        onClose();
      },
    });

    if (onForkThread) {
      list.push({
        id: 'session-fork-thread',
        category: 'session',
        title: 'Bifurcar Hilo / Ramificar Conversación',
        subtitle: 'Crea una nueva rama DAG conservando el historial previo',
        keywords: ['fork', 'bifurcar', 'rama', 'branch', 'dag', 'dividir', '/fork'],
        icon: <GitFork size={16} color="#10b981" />,
        color: '#10b981',
        shortcut: '/fork',
        priority: 35,
        perform: () => {
          onForkThread();
          onClose();
        },
      });
    }

    if (onClearChat) {
      list.push({
        id: 'session-clear-chat',
        category: 'session',
        title: 'Limpiar Mensajes de Pantalla',
        subtitle: 'Vacía la vista visual del chat actual sin borrar la sesión',
        keywords: ['clear', 'limpiar', 'vaciar', 'borrar', 'pantalla', '/clear'],
        icon: <Trash2 size={16} color="#ef4444" />,
        color: '#ef4444',
        shortcut: '/clear',
        priority: 10,
        perform: () => {
          onClearChat();
          onClose();
        },
      });
    }

    // 3. EXPORT ACTIONS
    if (onExportPDF) {
      list.push({
        id: 'export-pdf',
        category: 'export',
        title: 'Exportar Documento PDF Cyber-Executive',
        subtitle: 'Genera reporte ejecutivo en alta resolución con estilos print de alto contraste',
        keywords: ['pdf', 'exportar', 'export', 'documento', 'imprimir', 'print', 'descargar'],
        icon: <FileDown size={16} color="#10b981" />,
        color: '#10b981',
        shortcut: 'PDF',
        priority: 30,
        perform: () => {
          onExportPDF();
          onClose();
        },
      });
    }

    if (onExportMarkdown) {
      list.push({
        id: 'export-md',
        category: 'export',
        title: 'Exportar Conversación a Markdown (.md)',
        subtitle: 'Descarga un archivo .md limpio con estructura y bloques de código intactos',
        keywords: ['md', 'markdown', 'exportar', 'export', 'texto', 'archivo'],
        icon: <FileText size={16} color="#00d9ff" />,
        color: '#00d9ff',
        shortcut: 'MD',
        priority: 25,
        perform: () => {
          onExportMarkdown();
          onClose();
        },
      });
    }

    if (onExportJSON) {
      list.push({
        id: 'export-json',
        category: 'export',
        title: 'Exportar Sesión Completa a JSON (.json)',
        subtitle: 'Exporta datos estructurados completos de la sesión para backup o migración',
        keywords: ['json', 'data', 'datos', 'exportar', 'export', 'backup'],
        icon: <FileCode size={16} color="#f59e0b" />,
        color: '#f59e0b',
        shortcut: 'JSON',
        priority: 20,
        perform: () => {
          onExportJSON();
          onClose();
        },
      });
    }

    // 4. TEMPERATURE PRESETS
    if (onSetTemperature) {
      const presets = [
        { temp: 0.1, label: '0.1 Preciso', desc: 'Máximo determinismo, código estricto y fórmulas matemáticas', color: '#38bdf8' },
        { temp: 0.4, label: '0.4 Equilibrado', desc: 'Balance óptimo entre precisión y lenguaje natural (por defecto)', color: '#34d399' },
        { temp: 0.8, label: '0.8 Creativo', desc: 'Mayor divergencia expresiva para lluvia de ideas y redacción', color: '#f59e0b' },
        { temp: 1.0, label: '1.0 Caótico', desc: 'Exploración heurística sin restricciones y máxima entropía', color: '#ec4899' },
      ];

      presets.forEach(({ temp, label, desc, color }) => {
        const isCurrent = Math.abs(currentTemperature - temp) < 0.05;
        list.push({
          id: `temp-${temp}`,
          category: 'parameters',
          title: `Temperatura: ${label}`,
          subtitle: desc,
          keywords: ['temperatura', 'temp', 'creatividad', label, String(temp), '/temp'],
          badge: isCurrent ? 'ACTIVA' : `${temp}`,
          icon: <Thermometer size={16} color={color} />,
          color,
          shortcut: `/temp ${temp}`,
          priority: isCurrent ? 35 : 15,
          perform: () => {
            onSetTemperature(temp);
            onClose();
          },
        });
      });
    }

    // 5. HISTORY SEARCH
    if (conversations.length > 0 && onSelectConversation) {
      conversations.slice(0, 20).forEach((conv) => {
        const convMeta = MODEL_META[conv.model] || MODEL_META.speed;
        list.push({
          id: `history-${conv.id}`,
          category: 'history',
          title: conv.title || 'Conversación sin título',
          subtitle: `Motor: ${convMeta.label} · Fecha: ${new Date(conv.createdAt).toLocaleDateString()}`,
          keywords: [conv.title || '', conv.model, 'historial', 'chat', 'conversacion'],
          badge: convMeta.label,
          icon: <MessageCircle size={16} color={convMeta.color} />,
          color: convMeta.color,
          shortcut: `#${conv.id.slice(0, 4)}`,
          priority: 5,
          perform: () => {
            onSelectConversation(conv);
            onClose();
          },
        });
      });
    }

    // 6. VIEWS & MODULES
    if (onToggleTriad) {
      const quota = checkTriadLimit();
      list.push({
        id: 'view-triad',
        category: 'view',
        title: `LYAXIS TRIAD™ : ${isTriadActive ? 'Desactivar Modo Multinúcleo' : 'Activar Modo Simultáneo'}`,
        subtitle: 'Orquestación concurrente: Create (Speed) + Break (Phantom) + Rebuild (Cortex)',
        keywords: ['triad', 'triada', 'multinucleo', 'create', 'break', 'rebuild', '/triad'],
        badge: isTriadActive ? 'ACTIVO' : `${quota.remaining}/3`,
        icon: <Zap size={16} color={isTriadActive ? '#00ff66' : '#a855f7'} />,
        color: isTriadActive ? '#00ff66' : '#a855f7',
        shortcut: '/triad',
        priority: 25,
        perform: () => {
          onToggleTriad();
          onClose();
        },
      });
    }

    if (onOpenDirectives) {
      list.push({
        id: 'view-directives',
        category: 'view',
        title: 'Configurar Directivas y Memoria Personal',
        subtitle: 'Reglas de comportamiento cognitivo y contexto maestro del usuario',
        keywords: ['directivas', 'memoria', 'personal', 'configuracion', 'reglas', 'custom'],
        icon: <Sliders size={16} color="#a855f7" />,
        color: '#a855f7',
        priority: 15,
        perform: () => {
          onOpenDirectives();
          onClose();
        },
      });
    }

    if (onOpenNotebook) {
      list.push({
        id: 'view-notebook',
        category: 'view',
        title: 'Abrir LYAXIS Notebook Studio',
        subtitle: 'Espacio de trabajo para notas Markdown persistentes y fórmulas KaTeX',
        keywords: ['notebook', 'cuaderno', 'notas', 'studio', 'apuntes'],
        icon: <BookOpen size={16} color="#f59e0b" />,
        color: '#f59e0b',
        priority: 15,
        perform: () => {
          onOpenNotebook();
          onClose();
        },
      });
    }

    if (onOpenDashboard) {
      list.push({
        id: 'view-dashboard',
        category: 'view',
        title: 'Abrir HUD de Telemetría Neuronal',
        subtitle: 'Monitor en vivo de latencia, cómputo y estado de los núcleos de IA',
        keywords: ['dashboard', 'hud', 'telemetria', 'metricas', 'rendimiento', 'latencia'],
        icon: <LayoutDashboard size={16} color="#00d9ff" />,
        color: '#00d9ff',
        priority: 15,
        perform: () => {
          onOpenDashboard();
          onClose();
        },
      });
    }

    // 7. FX
    if (onToggleScanline) {
      list.push({
        id: 'fx-scanline',
        category: 'view',
        title: `CRT Scanlines: ${isScanlineActive ? 'Desactivar' : 'Activar'}`,
        subtitle: 'Efecto de barrido visual retro en la pantalla',
        keywords: ['crt', 'scanline', 'retro', 'fx'],
        badge: isScanlineActive ? 'ON' : 'OFF',
        icon: <Tv size={16} color="#ec4899" />,
        color: '#ec4899',
        perform: onToggleScanline,
      });
    }

    if (onToggleChromatic) {
      list.push({
        id: 'fx-chromatic',
        category: 'view',
        title: `Aberración Cromática: ${isChromaticActive ? 'Desactivar' : 'Activar'}`,
        subtitle: 'Distorsión estética RGB cyberpunk en los bordes',
        keywords: ['chromatic', 'aberracion', 'rgb', 'color', 'fx'],
        badge: isChromaticActive ? 'ON' : 'OFF',
        icon: <Palette size={16} color="#a855f7" />,
        color: '#a855f7',
        perform: onToggleChromatic,
      });
    }

    if (onToggleSound) {
      list.push({
        id: 'fx-sound',
        category: 'view',
        title: `Efectos de Sonido Háptico: ${soundEnabled ? 'Silenciar' : 'Activar'}`,
        subtitle: 'Confirmaciones sonoras con Web Audio API',
        keywords: ['audio', 'sonido', 'sound', 'beep', 'mute', 'fx'],
        badge: soundEnabled ? 'ON' : 'MUTED',
        icon: soundEnabled ? <Volume2 size={16} color="#00ff66" /> : <VolumeX size={16} color="#71717a" />,
        color: soundEnabled ? '#00ff66' : '#71717a',
        perform: onToggleSound,
      });
    }

    return list;
  }, [
    currentModel,
    onSelectModel,
    onNewChat,
    onForkThread,
    onClearChat,
    onExportPDF,
    onExportMarkdown,
    onExportJSON,
    currentTemperature,
    onSetTemperature,
    conversations,
    onSelectConversation,
    isTriadActive,
    onToggleTriad,
    onOpenDirectives,
    onOpenNotebook,
    onOpenDashboard,
    isScanlineActive,
    onToggleScanline,
    isChromaticActive,
    onToggleChromatic,
    soundEnabled,
    onToggleSound,
    onClose,
  ]);

  // Filter & Score with Fuzzy Algorithm
  const filteredActions = useMemo(() => {
    let pool = actions;
    if (activeCategory !== 'all') {
      pool = actions.filter((a) => a.category === activeCategory);
    }

    const q = query.trim();
    if (!q) {
      return pool.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    }

    return pool
      .map((action) => ({
        action,
        score: computeFuzzyScore(q, action),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.action);
  }, [actions, activeCategory, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Cycle categories with Tab
  const cycleCategory = useCallback((forward = true) => {
    const currentIndex = CATEGORIES.findIndex((c) => c.id === activeCategory);
    const nextIndex = forward
      ? (currentIndex + 1) % CATEGORIES.length
      : (currentIndex - 1 + CATEGORIES.length) % CATEGORIES.length;
    setActiveCategory(CATEGORIES[nextIndex].id);
    playCyberClick();
  }, [activeCategory]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      cycleCategory(!e.shiftKey);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredActions.length ? prev + 1 : 0));
      playCyberClick();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredActions.length - 1));
      playCyberClick();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredActions[selectedIndex];
      if (current) {
        playCyberBeep(950, 0.04);
        if (typeof current.perform === 'function') {
          current.perform();
        } else if (typeof current.onExecute === 'function') {
          current.onExecute();
        }
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const currentTheme = THEMES[currentModel] || THEMES.speed;

  return (
    <div
      className="lx-layer-3"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 6, 13, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'min(7vh, 28px) 12px 20px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de Comandos Global LYAXIS"
        style={{
          width: '100%',
          maxWidth: '660px',
          backgroundColor: 'rgba(8, 12, 24, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderTop: `2px solid ${currentTheme.primary}`,
          borderRadius: '16px',
          boxShadow: `0 24px 64px -12px rgba(0, 0, 0, 0.92), 0 0 35px ${currentTheme.glow}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'min(78vh, 600px)',
          animation: 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <Command size={18} color={currentTheme.primary} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe un comando o busca ('@speed', 'pdf', '0.1', '/fork')..."
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 500,
              fontFamily: 'inherit',
            }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          ) : (
            <kbd
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                padding: '2px 7px',
                fontSize: '11px',
                color: '#94a3b8',
                fontFamily: 'monospace',
              }}
            >
              ESC
            </kbd>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            overflowX: 'auto',
          }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  playCyberClick();
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: isActive ? `1px solid ${currentTheme.primary}` : '1px solid transparent',
                  backgroundColor: isActive ? `${currentTheme.primary}22` : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            padding: '8px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxHeight: '400px',
          }}
        >
          {filteredActions.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '13.5px',
              }}
            >
              No se encontraron comandos coincidentes con &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={action.id}
                  onClick={() => {
                    playCyberBeep(950, 0.04);
                    if (typeof action.perform === 'function') action.perform();
                    else if (typeof action.onExecute === 'function') action.onExecute();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: isSelected
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'transparent',
                    border: isSelected
                      ? `1px solid ${action.color || currentTheme.primary}44`
                      : '1px solid transparent',
                    boxShadow: isSelected
                      ? `0 0 15px ${action.color || currentTheme.primary}1a`
                      : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        backgroundColor: `${action.color || currentTheme.primary}1a`,
                        border: `1px solid ${action.color || currentTheme.primary}33`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {action.icon as React.ReactNode}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isSelected ? '#ffffff' : '#e2e8f0',
                          lineHeight: 1.3,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {action.title}
                      </span>
                      {action.subtitle && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: isSelected ? '#cbd5e1' : '#64748b',
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {action.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {action.badge && (
                      <span
                        style={{
                          backgroundColor: `${action.color || currentTheme.primary}22`,
                          border: `1px solid ${action.color || currentTheme.primary}44`,
                          color: action.color || currentTheme.primary,
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.4px',
                        }}
                      >
                        {action.badge}
                      </span>
                    )}
                    {action.shortcut && (
                      <kbd
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          padding: '2px 5px',
                          fontSize: '10px',
                          color: '#94a3b8',
                          fontFamily: 'monospace',
                        }}
                      >
                        {action.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <ArrowRight size={13} color={action.color || currentTheme.primary} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '9px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10.5px',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span><kbd style={{ color: '#cbd5e1' }}>↑↓</kbd> Navegar</span>
            <span><kbd style={{ color: '#cbd5e1' }}>↵</kbd> Ejecutar</span>
            <span><kbd style={{ color: '#cbd5e1' }}>Tab</kbd> Categorías</span>
            <span><kbd style={{ color: '#cbd5e1' }}>Esc</kbd> Cerrar</span>
          </div>
          <span style={{ color: currentTheme.primary, fontWeight: 600 }}>
            LYAXIS COMMAND HUD
          </span>
        </div>
      </div>
    </div>
  );
};

export interface CommandPaletteTriggerProps {
  onClick: () => void;
  className?: string;
}

export const CommandPaletteTrigger: React.FC<CommandPaletteTriggerProps> = ({ onClick, className }) => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  return (
    <button
      type="button"
      onClick={onClick}
      className={className || "lx-elevation-shell"}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        borderRadius: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: '#cbd5e1',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        minHeight: '32px',
      }}
      aria-label="Abrir Paleta de Comandos (Ctrl+K)"
      title={`Abrir Paleta de Comandos (${isMac ? 'Cmd+K' : 'Ctrl+K'})`}
    >
      <Terminal size={14} color="var(--current-primary, #00d9ff)" />
      <span className="hidden sm:inline" style={{ fontSize: '11.5px' }}>Comandos</span>
      <kbd
        style={{
          fontFamily: 'monospace',
          fontSize: '9.5px',
          opacity: 0.8,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '1px 4px',
          borderRadius: '4px',
          color: '#e2e8f0',
        }}
      >
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
};
