import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  BookOpen,
  LayoutDashboard,
  Tv,
  Volume2,
  VolumeX,
  Palette,
  ArrowRight,
  Command,
  X,
} from 'lucide-react';
import type { ModelType, Conversation } from '../types';
import { ALL_MODELS, MODEL_META, THEMES } from '../config';
import { playCyberClick, playCyberBeep } from '../sound';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (model: ModelType) => void;
  currentModel: ModelType;
  isTriadActive?: boolean;
  onToggleTriad?: () => void;
  onNewChat: () => void;
  onClearChat?: () => void;
  onExportPDF?: () => void;
  onOpenNotebook?: () => void;
  onOpenDashboard?: () => void;
  isScanlineActive?: boolean;
  onToggleScanline?: () => void;
  isChromaticActive?: boolean;
  onToggleChromatic?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  conversations?: Conversation[];
  onSelectConversation?: (c: Conversation) => void;
}

interface PaletteAction {
  id: string;
  category: 'models' | 'triad' | 'chat' | 'views' | 'fx' | 'history';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ReactNode;
  color?: string;
  shortcut?: string;
  onExecute: () => void;
}

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

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectModel,
  currentModel,
  isTriadActive = false,
  onToggleTriad,
  onNewChat,
  onClearChat,
  onExportPDF,
  onOpenNotebook,
  onOpenDashboard,
  isScanlineActive = false,
  onToggleScanline,
  isChromaticActive = false,
  onToggleChromatic,
  soundEnabled = true,
  onToggleSound,
  conversations = [],
  onSelectConversation,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      playCyberBeep(700, 0.05);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Construct actions
  const actions: PaletteAction[] = useMemo(() => {
    const list: PaletteAction[] = [];

    // 1. Orquestación TRIAD
    if (onToggleTriad) {
      list.push({
        id: 'toggle-triad',
        category: 'triad',
        title: `LYAXIS TRIAD™ : ${isTriadActive ? 'Desactivar Modo' : 'ACTIVAR MODO SIMULTÁNEO'}`,
        subtitle: 'Inferencia concurrente a 3 núcleos: Create (Speed) + Break (Phantom) + Rebuild (Cortex)',
        badge: isTriadActive ? 'ACTIVO' : 'TURBO',
        icon: <Zap size={16} color={isTriadActive ? '#00ff66' : '#a855f7'} />,
        color: isTriadActive ? '#00ff66' : '#a855f7',
        shortcut: '/triad',
        onExecute: () => {
          onToggleTriad();
          onClose();
        },
      });
    }

    // 2. Modelos Neuronales
    ALL_MODELS.forEach((m) => {
      const meta = MODEL_META[m] || MODEL_META.speed;
      const isCurrent = currentModel === m;
      list.push({
        id: `model-${m}`,
        category: 'models',
        title: `Activar Motor: ${meta.label}`,
        subtitle: `${meta.tagline} — ${meta.description.slice(0, 68)}...`,
        badge: isCurrent ? 'ACTIVO' : undefined,
        icon: MODEL_ICONS[m] ? MODEL_ICONS[m](16, meta.color) : <Zap size={16} color={meta.color} />,
        color: meta.color,
        shortcut: `@${m}`,
        onExecute: () => {
          onSelectModel(m);
          onClose();
        },
      });
    });

    // 3. Acciones de Chat
    list.push({
      id: 'action-new-chat',
      category: 'chat',
      title: 'Iniciar Nueva Sesión Limpia',
      subtitle: 'Crea un hilo de conversación nuevo con el modelo activo',
      icon: <Plus size={16} color="#3b82f6" />,
      color: '#3b82f6',
      shortcut: 'Alt+N',
      onExecute: () => {
        onNewChat();
        onClose();
      },
    });

    if (onExportPDF) {
      list.push({
        id: 'action-export-pdf',
        category: 'chat',
        title: 'Exportar Conversación a Documento PDF',
        subtitle: 'Genera un documento PDF estilizado con estética Cyber-Premium',
        icon: <FileDown size={16} color="#10b981" />,
        color: '#10b981',
        shortcut: 'PDF',
        onExecute: () => {
          onExportPDF();
          onClose();
        },
      });
    }

    if (onClearChat) {
      list.push({
        id: 'action-clear-chat',
        category: 'chat',
        title: 'Limpiar Mensajes de Pantalla',
        subtitle: 'Vacía la vista del chat actual manteniendo el contexto en base de datos',
        icon: <Trash2 size={16} color="#ef4444" />,
        color: '#ef4444',
        shortcut: '/clear',
        onExecute: () => {
          onClearChat();
          onClose();
        },
      });
    }

    // 4. Vistas y Módulos
    if (onOpenNotebook) {
      list.push({
        id: 'view-notebook',
        category: 'views',
        title: 'Abrir LYAXIS Notebook Studio',
        subtitle: 'Espacio de trabajo para apuntes Markdown, fórmulas KaTeX y notas persistentes',
        icon: <BookOpen size={16} color="#f59e0b" />,
        color: '#f59e0b',
        onExecute: () => {
          onOpenNotebook();
          onClose();
        },
      });
    }

    if (onOpenDashboard) {
      list.push({
        id: 'view-dashboard',
        category: 'views',
        title: 'Abrir HUD de Telemetría Neuronal',
        subtitle: 'Monitor en vivo de latencia, cómputo y estado de los núcleos de IA',
        icon: <LayoutDashboard size={16} color="#00d9ff" />,
        color: '#00d9ff',
        onExecute: () => {
          onOpenDashboard();
          onClose();
        },
      });
    }

    // 5. Efectos Cyberpunk
    if (onToggleScanline) {
      list.push({
        id: 'fx-scanlines',
        category: 'fx',
        title: `Efecto CRT Scanlines: ${isScanlineActive ? 'Desactivar' : 'Activar'}`,
        subtitle: 'Simula las líneas de barrido de monitores CRT de terminales clásicas',
        icon: <Tv size={16} color="#ec4899" />,
        color: '#ec4899',
        badge: isScanlineActive ? 'ON' : 'OFF',
        onExecute: () => {
          onToggleScanline();
        },
      });
    }

    if (onToggleChromatic) {
      list.push({
        id: 'fx-chromatic',
        category: 'fx',
        title: `Aberración Cromática: ${isChromaticActive ? 'Desactivar' : 'Activar'}`,
        subtitle: 'Distorsión estética RGB cyberpunk en los bordes de la interfaz',
        icon: <Palette size={16} color="#a855f7" />,
        color: '#a855f7',
        badge: isChromaticActive ? 'ON' : 'OFF',
        onExecute: () => {
          onToggleChromatic();
        },
      });
    }

    if (onToggleSound) {
      list.push({
        id: 'fx-sound',
        category: 'fx',
        title: `Efectos Sonoros Cibernéticos: ${soundEnabled ? 'Silenciar' : 'Activar Sonido'}`,
        subtitle: 'Clicks hápticos, beeps de confirmación y audio Web Audio API',
        icon: soundEnabled ? <Volume2 size={16} color="#00ff66" /> : <VolumeX size={16} color="#71717a" />,
        color: soundEnabled ? '#00ff66' : '#71717a',
        badge: soundEnabled ? 'ON' : 'MUTED',
        onExecute: () => {
          onToggleSound();
        },
      });
    }

    // 6. Historial de Conversaciones
    if (conversations.length > 0 && onSelectConversation) {
      conversations.slice(0, 15).forEach((conv) => {
        const convMeta = MODEL_META[conv.model] || MODEL_META.speed;
        list.push({
          id: `conv-${conv.id}`,
          category: 'history',
          title: conv.title || 'Conversación sin título',
          subtitle: `Modelo: LYAXIS ${convMeta.label} · Creado: ${new Date(conv.createdAt).toLocaleDateString()}`,
          icon: <MessageCircle size={16} color={convMeta.color} />,
          color: convMeta.color,
          badge: convMeta.label,
          onExecute: () => {
            onSelectConversation(conv);
            onClose();
          },
        });
      });
    }

    return list;
  }, [
    currentModel,
    isTriadActive,
    isScanlineActive,
    isChromaticActive,
    soundEnabled,
    conversations,
    onToggleTriad,
    onSelectModel,
    onNewChat,
    onExportPDF,
    onClearChat,
    onOpenNotebook,
    onOpenDashboard,
    onToggleScanline,
    onToggleChromatic,
    onToggleSound,
    onSelectConversation,
    onClose,
  ]);

  // Filtrado de acciones
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
        (a.shortcut && a.shortcut.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
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
        current.onExecute();
      }
    }
  };

  // Scroll del elemento seleccionado a la vista
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 5, 12, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '14vh 16px 20px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de Comandos LYAXIS"
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: '#0a0d16',
          border: `1px solid rgba(255, 255, 255, 0.12)`,
          borderTop: `2px solid ${currentTheme.primary}`,
          borderRadius: '16px',
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px ${currentTheme.glow}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
          animation: 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Barra de búsqueda */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
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
            placeholder="Escribe un comando o busca en tu sesión (ej. 'cortex', 'triad', 'pdf', 'nuevo')..."
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
                color: '#71717a',
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
                color: '#a1a1aa',
                fontFamily: 'monospace',
              }}
            >
              ESC
            </kbd>
          )}
        </div>

        {/* Lista de resultados */}
        <div
          ref={listRef}
          style={{
            padding: '8px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxHeight: '420px',
          }}
        >
          {filteredActions.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#71717a',
                fontSize: '14px',
              }}
            >
              No se encontraron comandos o sesiones coincidentes con "{query}".
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={action.id}
                  onClick={() => {
                    playCyberBeep(950, 0.04);
                    action.onExecute();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: isSelected
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'transparent',
                    border: isSelected
                      ? `1px solid ${action.color || currentTheme.primary}44`
                      : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    boxShadow: isSelected
                      ? `0 0 15px ${action.color || currentTheme.primary}1a`
                      : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: `${action.color || '#3b82f6'}1a`,
                        border: `1px solid ${action.color || '#3b82f6'}33`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {action.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: isSelected ? '#ffffff' : '#e4e4e7',
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
                            fontSize: '11.5px',
                            color: isSelected ? '#a1a1aa' : '#71717a',
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
                          borderRadius: '6px',
                          padding: '2px 7px',
                          fontSize: '10.5px',
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
                          borderRadius: '5px',
                          padding: '2px 6px',
                          fontSize: '10.5px',
                          color: '#71717a',
                          fontFamily: 'monospace',
                        }}
                      >
                        {action.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <ArrowRight size={14} color={action.color || currentTheme.primary} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer con atajos */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#71717a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span><kbd style={{ color: '#d4d4d8' }}>↑↓</kbd> Navegar</span>
            <span><kbd style={{ color: '#d4d4d8' }}>↵</kbd> Ejecutar</span>
            <span><kbd style={{ color: '#d4d4d8' }}>Esc</kbd> Cerrar</span>
          </div>
          <span style={{ color: currentTheme.primary, fontWeight: 600 }}>
            LYAXIS COMMAND HUD
          </span>
        </div>
      </div>
    </div>
  );
};
