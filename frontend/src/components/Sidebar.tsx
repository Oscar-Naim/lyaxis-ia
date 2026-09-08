import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Home,
  PanelLeftClose,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  MessageCircle,
  Sparkles,
  Brain,
  Compass,
  Crosshair,
  Waypoints,
  Hammer,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import type { Conversation, User, ModelType } from '../types';
import { MODEL_META } from '../config';
import { isSoundMuted, setSoundMuted, playCyberClick } from '../sound';

export interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onHomeClick?: () => void;
  onOpenManifesto?: () => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  conversations: Conversation[];
  currentChatId: string | null;
  onSelectConversation: (chat: Conversation) => void;
  onDeleteConversation: (chatId: string, e: React.MouseEvent) => void;
  onDeleteAllConversations: () => void;
  selectedModel?: ModelType;
  onSelectModel?: (model: ModelType) => void;
  soundMuted?: boolean;
  onToggleSoundMute?: () => void;
  onOpenNotebook?: () => void;
}

const MODEL_ICONS: Record<ModelType, (size: number, color?: string) => React.ReactNode> = {
  speed: (s, c = '#2563FF') => <Sparkles size={s} color={c} />,
  cortex: (s, c = '#7C3AED') => <Brain size={s} color={c} />,
  architect: (s, c = '#10B981') => <Compass size={s} color={c} />,
  classic: (s, c = '#F59E0B') => <MessageCircle size={s} color={c} />,
  phantom: (s, c = '#EF4444') => <Crosshair size={s} color={c} />,
  nexus: (s, c = '#EC4899') => <Waypoints size={s} color={c} />,
  forge: (s, c = '#F97316') => <Hammer size={s} color={c} />,
  magister: (s, c = '#06B6D4') => <GraduationCap size={s} color={c} />,
  root: (s, c = '#00FF66') => <Terminal size={s} color={c} />,
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isMobile,
  onClose,
  onNewChat,
  onHomeClick,
  onOpenManifesto,
  user,
  onOpenAuth,
  onLogout,
  conversations,
  currentChatId,
  onSelectConversation,
  onDeleteConversation,
  onDeleteAllConversations,
  selectedModel,
  onSelectModel,
  soundMuted: soundMutedProp,
  onToggleSoundMute,
  onOpenNotebook,
}) => {
  const [internalMuted, setInternalMuted] = useState<boolean>(() => isSoundMuted());

  useEffect(() => {
    if (soundMutedProp !== undefined) {
      setInternalMuted(soundMutedProp);
    }
  }, [soundMutedProp]);

  const handleToggleMute = () => {
    const next = !internalMuted;
    setInternalMuted(next);
    setSoundMuted(next);
    if (onToggleSoundMute) {
      onToggleSoundMute();
    }
    if (!next) {
      playCyberClick();
    }
  };

  const getModelColor = (m: ModelType) => MODEL_META[m]?.color || '#2563FF';

  return (
    <>
      {/* Backdrop overlay for mobile with blur */}
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 10000,
          }}
        />
      )}
      <aside
        className="lyaxis-sidebar"
        style={{
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 10001,
          width: isOpen ? (isMobile ? '85%' : '280px') : '0px',
          maxWidth: isMobile ? '340px' : '280px',
          display: isOpen ? 'flex' : 'none',
          backgroundColor: '#0D0D15',
          borderRight: '1px solid #232336',
          flexDirection: 'column',
          padding: isOpen ? '16px' : '0px',
          flexShrink: 0,
          boxShadow: isMobile ? '12px 0 45px rgba(0,0,0,0.95)' : 'none',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
      {/* Top Brand & Nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #141418',
        }}
      >
        <div
          onClick={() => {
            if (onHomeClick) onHomeClick();
            else onNewChat();
            if (isMobile) onClose();
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          title="Iniciar nuevo chat"
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #2563FF, #00D9FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 217, 255, 0.3)',
              flexShrink: 0,
            }}
          >
            <Terminal size={18} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 700, margin: 0, letterSpacing: '0.5px' }}>LYAXIS IA</h1>
            <span style={{ fontSize: '11px', color: '#71717a' }}>LYAXIS labs™</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {onOpenManifesto && (
            <button
              type="button"
              onClick={onOpenManifesto}
              title="Manifiesto, Filosofía y Legales de LYAXIS labs™"
              style={{
                background: 'none',
                border: 'none',
                color: '#71717a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                minHeight: '40px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <Home size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Ocultar barra lateral"
            style={{
              background: 'none',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </div>

      {/* User Card */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '10px',
          backgroundColor: '#07070a',
          border: '1px solid #181822',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <img
              src={user.picture}
              alt={user.name}
              style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #00D9FF' }}
            />
            <div style={{ overflow: 'hidden' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'block',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.name}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: '#71717a',
                  display: 'block',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email || user.phone}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              color: '#00D9FF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <LogIn size={15} />
            <span>Iniciar sesión</span>
          </button>
        )}
        {user && (
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión"
            style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}
          >
            <LogOut size={14} />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <button
        type="button"
        onClick={() => {
          onNewChat();
          if (isMobile) onClose();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          minHeight: '46px',
          padding: '12px 14px',
          backgroundColor: '#0a0a0e',
          border: '1px solid #1c1c24',
          borderRadius: '10px',
          color: '#ffffff',
          fontSize: '14.5px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '14px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
          e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 217, 255, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#1c1c24';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Plus size={17} /> Nuevo Chat
      </button>

      {/* Indicador / Selector de Motor Activo con Subtítulo Descriptivo */}
      {selectedModel && (
        <div
          onClick={() => {
            if (onSelectModel) {
              // Si se provee selector, puede rotar o abrir diálogo
            }
          }}
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${getModelColor(selectedModel)}44`,
            borderRadius: '10px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: `0 0 12px ${getModelColor(selectedModel)}15`,
          }}
        >
          <div style={{ color: getModelColor(selectedModel), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {MODEL_ICONS[selectedModel]?.(18, getModelColor(selectedModel))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', lineHeight: 1.25 }}>
              LYAXIS {MODEL_META[selectedModel]?.label}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {MODEL_META[selectedModel]?.tagline}
            </span>
          </div>
        </div>
      )}

      {/* 2. Acceso Directo al Cuaderno / Mis Notas */}
      {onOpenNotebook && (
        <button
          type="button"
          onClick={() => {
            onOpenNotebook();
            if (isMobile) onClose();
          }}
          title="Abrir Cuaderno Visual LYAXIS (Notebook Studio)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            minHeight: '46px',
            padding: '11px 14px',
            backgroundColor: 'rgba(0, 217, 255, 0.05)',
            border: '1px solid rgba(0, 217, 255, 0.22)',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '16px',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 12px rgba(0, 217, 255, 0.06)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 217, 255, 0.12)';
            e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.45)';
            e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 217, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 217, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.22)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 217, 255, 0.06)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} color="#00D9FF" />
            <span>Mis Notas / Cuaderno</span>
          </div>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 7px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 217, 255, 0.15)',
              color: '#00D9FF',
              fontWeight: 700,
              letterSpacing: '0.4px',
            }}
          >
            CANVAS
          </span>
        </button>
      )}

      {/* Conversation List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Historial {conversations.length > 0 && `(${conversations.length})`}
          </span>
          {conversations.length > 0 && (
            <button
              type="button"
              onClick={onDeleteAllConversations}
              title="Borrar todo el historial"
              style={{
                background: 'none',
                border: 'none',
                color: '#52525b',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Trash2 size={11} /> Vaciar
            </button>
          )}
        </div>

        {conversations.length === 0 ? (
          <div
            style={{
              padding: '16px 12px',
              textAlign: 'center',
              backgroundColor: '#07070a',
              border: '1px dashed rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              marginTop: '4px',
            }}
          >
            <MessageCircle size={20} color="#00D9FF" style={{ margin: '0 auto 8px', display: 'block', opacity: 0.8 }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#d4d4d8', display: 'block', marginBottom: '4px' }}>
              Sin historial guardado
            </span>
            <span style={{ fontSize: '11px', color: '#71717a', lineHeight: '1.4', display: 'block' }}>
              Cada chat que inicies se guardará automáticamente aquí.
            </span>
          </div>
        ) : (
          conversations.map((chat) => {
            const isSelected = currentChatId === chat.id;
            const modelColor = getModelColor(chat.model);
            return (
              <div
                key={chat.id}
                onClick={() => {
                  onSelectConversation(chat);
                  if (isMobile) onClose();
                }}
                style={{
                  minHeight: '46px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? `${modelColor}22` : 'transparent',
                  border: isSelected ? `1px solid ${modelColor}55` : '1px solid transparent',
                  color: isSelected ? '#ffffff' : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 0 14px ${modelColor}22` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    {MODEL_ICONS[chat.model]?.(16, modelColor) || <Sparkles size={16} color={modelColor} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13.5px', fontWeight: 600 }}>
                      {chat.title}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                      {MODEL_META[chat.model]?.label || 'Classic'} • {MODEL_META[chat.model]?.tagline || ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  title="Eliminar conversación"
                  onClick={(e) => onDeleteConversation(chat.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    minWidth: '34px',
                    minHeight: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#71717a'; }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Barra Inferior del Sidebar con Interruptor de Sonido Discreto (Mute Toggle) */}
      <div
        style={{
          paddingTop: '12px',
          borderTop: '1px solid #141418',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '8px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.3px' }}>
          Create. Break. Rebuild. • 2026
        </span>
        <button
          type="button"
          onClick={handleToggleMute}
          title={internalMuted ? 'Activar sonido cyber' : 'Silenciar sonido cyber'}
          style={{
            background: internalMuted ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 217, 255, 0.08)',
            border: internalMuted ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '6px',
            color: internalMuted ? '#52525b' : '#00D9FF',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 600,
            boxShadow: internalMuted ? 'none' : '0 0 10px rgba(0, 217, 255, 0.2)',
            transition: 'all 0.2s ease',
          }}
        >
          {internalMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          <span>{internalMuted ? 'Muted' : 'Audio'}</span>
        </button>
      </div>
    </aside>
  </>
);
};

export default Sidebar;
