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
  soundMuted?: boolean;
  onToggleSoundMute?: () => void;
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
  soundMuted: soundMutedProp,
  onToggleSoundMute,
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
    <aside
      className="lyaxis-sidebar"
      style={{
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 10001,
        width: isOpen ? '280px' : '0px',
        display: isOpen ? 'flex' : 'none',
        backgroundColor: '#000000',
        borderRight: '1px solid #141418',
        flexDirection: 'column',
        padding: isOpen ? '16px' : '0px',
        flexShrink: 0,
        boxShadow: isMobile ? '10px 0 40px rgba(0,0,0,0.9)' : 'none',
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
          onClick={onHomeClick}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: onHomeClick ? 'pointer' : 'default' }}
          title="Volver a la portada de inicio"
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563FF, #00D9FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 217, 255, 0.3)',
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
                padding: '6px',
              }}
            >
              <Home size={17} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Ocultar barra lateral"
            style={{
              background: 'none',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <PanelLeftClose size={17} />
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
        onClick={onNewChat}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '10px 14px',
          backgroundColor: '#0a0a0e',
          border: '1px solid #1c1c24',
          borderRadius: '8px',
          color: '#ffffff',
          fontSize: '13px',
          cursor: 'pointer',
          marginBottom: '16px',
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
        <Plus size={16} /> Nuevo Chat
      </button>

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
                onClick={() => onSelectConversation(chat)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? `${modelColor}22` : 'transparent',
                  border: isSelected ? `1px solid ${modelColor}55` : '1px solid transparent',
                  color: isSelected ? '#ffffff' : '#a1a1aa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 0 14px ${modelColor}22` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {MODEL_ICONS[chat.model]?.(14, modelColor) || <Sparkles size={14} color={modelColor} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chat.title}
                  </span>
                </div>
                <button
                  type="button"
                  title="Eliminar conversación"
                  onClick={(e) => onDeleteConversation(chat.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#52525b',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#52525b'; }}
                >
                  <Trash2 size={13} />
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
  );
};

export default Sidebar;
