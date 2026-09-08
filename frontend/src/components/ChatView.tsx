import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  AlertTriangle,
  RefreshCw,
  X,
  FileDown,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
  Cpu,
  Paperclip,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  Brain,
  Compass,
  MessageCircle,
  Crosshair,
  Waypoints,
  Hammer,
  GraduationCap,
  Terminal,
} from 'lucide-react';
import type { Message, ModelType } from '../types';
import { useSSEStream } from '../useSSEStream';
import { MessageBubble } from './MessageBubble';
import { NotebookStudio } from './NotebookStudio';
import { isSoundMuted, setSoundMuted, playCyberClick as globalPlayCyberClick } from '../sound';
import { API_BASE, ALL_MODELS, MODEL_META, MODEL_QUICK_ACTIONS } from '../config';

export interface ChatViewProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  selectedModel: ModelType;
  setSelectedModel?: (model: ModelType) => void;
  currentChatId: string | null;
  setCurrentChatId?: (id: string) => void;
  activeUserId?: string;
  isMobile?: boolean;
  soundEnabled?: boolean;
  playCyberClick?: () => void;
  onConversationUpdated?: () => void;
  onExportPDF?: (title: string, label: string, color: string, msgs: Message[]) => void;
  modelMeta?: Record<ModelType, { label: string; tagline?: string; color: string; description: string; temperature: number }>;
  modelPrompts?: Record<ModelType, { icon: React.ReactNode; bg: string; border: string; text: string }[]>;
  onSelectModel?: (model: ModelType) => void;
}

const MODEL_ICONS: Record<ModelType, (size: number, color?: string) => React.ReactNode> = {
  speed: (s, c = '#2563FF') => <Zap size={s} color={c} />,
  cortex: (s, c = '#7C3AED') => <Brain size={s} color={c} />,
  zenith: (s, c = '#00D9FF') => <Sparkles size={s} color={c} />,
  architect: (s, c = '#10B981') => <Compass size={s} color={c} />,
  classic: (s, c = '#F59E0B') => <MessageCircle size={s} color={c} />,
  phantom: (s, c = '#EF4444') => <Crosshair size={s} color={c} />,
  nexus: (s, c = '#EC4899') => <Waypoints size={s} color={c} />,
  forge: (s, c = '#F97316') => <Hammer size={s} color={c} />,
  magister: (s, c = '#06B6D4') => <GraduationCap size={s} color={c} />,
  root: (s, c = '#00FF66') => <Terminal size={s} color={c} />,
};

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  setMessages,
  selectedModel,
  setSelectedModel,
  currentChatId,
  setCurrentChatId,
  activeUserId,
  isMobile = false,
  soundEnabled,
  playCyberClick,
  onConversationUpdated,
  onExportPDF,
  modelMeta = MODEL_META,
  onSelectModel,
}) => {
  const [currentActiveModel, setCurrentActiveModel] = useState<ModelType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lyaxis_active_model') || localStorage.getItem('lyaxis_selected_model');
      if (saved && (ALL_MODELS as readonly string[]).includes(saved)) {
        return saved as ModelType;
      }
    }
    return selectedModel || 'speed';
  });
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showZenithNotice, setShowZenithNotice] = useState(false);

  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [notebookContent, setNotebookContent] = useState('');
  const [notebookTitle, setNotebookTitle] = useState('Cuaderno LYAXIS');

  // Sound mute state synced with localStorage ('lyaxis_sound_muted')
  const [isMuted, setIsMuted] = useState<boolean>(() => isSoundMuted());

  const [inputValue, setInputValue] = useState('');
  const [serverErrorBanner, setServerErrorBanner] = useState<string | null>(null);
  const [lastFailedUserText, setLastFailedUserText] = useState<string | null>(null);

  // LYAXIS TRIAD™ Mode State
  const [isTriadActive, setIsTriadActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lyaxis_triad_active') === 'true';
    } catch {
      return false;
    }
  });

  const toggleTriad = () => {
    triggerSound();
    setIsTriadActive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lyaxis_triad_active', String(next));
      } catch {}
      return next;
    });
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenInNotebook = (msgContent: string, model: ModelType) => {
    triggerSound();
    setNotebookContent(msgContent);
    const targetMeta = modelMeta[model] || MODEL_META[model] || meta;
    setNotebookTitle(`Apuntes ${targetMeta.label} • ${new Date().toLocaleDateString('es-MX')}`);
    setIsNotebookOpen(true);
  };

  useEffect(() => {
    setCurrentActiveModel(selectedModel);
  }, [selectedModel]);

  // Click outside to close model dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const meta = modelMeta[currentActiveModel] || MODEL_META[currentActiveModel] || MODEL_META.speed;

  const triggerSound = () => {
    if (!isMuted) {
      if (playCyberClick) playCyberClick();
      else globalPlayCyberClick();
    }
  };

  const toggleSoundMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
    if (!next) {
      if (playCyberClick) playCyberClick();
      else globalPlayCyberClick();
    }
  };

  // Stream Hook with explicit onError handler
  const { isStreaming, sendMessage, stopStreaming } = useSSEStream({
    onDone: () => {
      onConversationUpdated?.();
    },
    onError: (err) => {
      handleStreamError(err);
    },
  });

  const handleStreamError = (err?: Error | any) => {
    console.warn('[ChatView] Stream error detected:', err?.message);
    const friendly = '⚠️ El servidor tardó en responder o está iniciando. Por favor, reintenta en unos segundos.';
    const rawMsg = err?.message || '';
    const bannerMsg = (rawMsg.includes('502') || rawMsg.includes('504') || rawMsg.includes('TIMEOUT') || rawMsg.includes('servidor') || rawMsg.includes('fetch') || rawMsg.includes('Failed'))
      ? friendly
      : (rawMsg || friendly);
    setServerErrorBanner(bannerMsg);

    // Clean up empty placeholder assistant messages
    setMessages((prev) =>
      prev.filter((m) => !(m.role === 'model' && (!m.content || !m.content.trim())))
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, serverErrorBanner]);

  // In-Chat Model Switcher: changes model without wiping messages and updates backend conversation
  const handleModelSwitch = async (newModel: ModelType) => {
    setIsModelDropdownOpen(false);
    if (newModel === currentActiveModel || isStreaming) return;
    triggerSound();

    setCurrentActiveModel(newModel);
    onSelectModel?.(newModel);
    setSelectedModel?.(newModel);

    try {
      localStorage.setItem('lyaxis_active_model', newModel);
      localStorage.setItem('lyaxis_selected_model', newModel);
    } catch {}

    if (newModel === 'zenith') {
      setShowZenithNotice(false);
    }

    if (currentChatId) {
      try {
        await fetch(`${API_BASE}/api/v1/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentChatId,
            user_id: activeUserId,
            model: newModel,
          }),
        });
        onConversationUpdated?.();
      } catch (err) {
        console.warn('Aviso actualizando modelo de conversación:', err);
      }
    }
  };

  // Pre-upload validation & lightweight canvas compression to prevent 413 / stream dropouts
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedMimes.includes(file.type.toLowerCase())) {
        reject(new Error('Formato no permitido. Selecciona una imagen PNG, JPEG o WebP.'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('La imagen excede el límite de 5MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 1920;
          let w = img.width;
          let h = img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
              return;
            }
          }
          resolve(rawData);
        };
        img.onerror = () => reject(new Error('Error al procesar la imagen seleccionada.'));
        img.src = rawData;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
      reader.readAsDataURL(file);
    });
  };

  // Image Upload handler with Auto-switch to Zenith
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processedImage = await compressImage(file);
      setSelectedImage(processedImage);

      // Auto-switch to Zenith for vision analysis
      if (currentActiveModel !== 'zenith') {
        handleModelSwitch('zenith');
        setShowZenithNotice(true);
        setTimeout(() => setShowZenithNotice(false), 5000);
      }
      triggerSound();
    } catch (err: any) {
      alert(err.message || 'Error al validar la imagen.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputValue;
    if ((!textToSend || !textToSend.trim()) && !selectedImage) return;
    if (isStreaming) return;

    const userText = textToSend ? textToSend.trim() : '';
    const imgToSend = selectedImage;
    setInputValue('');
    setSelectedImage(null);
    setShowZenithNotice(false);
    setServerErrorBanner(null);
    setLastFailedUserText(userText);
    triggerSound();

    let targetChatId = currentChatId;
    if (!targetChatId) {
      targetChatId = `chat-${Date.now()}`;
      if (setCurrentChatId) setCurrentChatId(targetChatId);
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
      model: currentActiveModel,
      image: imgToSend || undefined,
    };

    const assistantPlaceholderId = `model-${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'model',
      content: '',
      timestamp: new Date().toISOString(),
      model: currentActiveModel,
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, assistantMessage]);

    // Active model individual temperature
    const activeMeta = modelMeta[currentActiveModel] || MODEL_META[currentActiveModel] || MODEL_META.speed;
    const activeTemp = activeMeta.temperature ?? 0.3;

    // Stream with sound ticks if unmuted
    await sendMessage(
      updatedMessages,
      currentActiveModel,
      targetChatId,
      activeUserId,
      (accumulatedText) => {
        if (!isMuted && Math.random() > 0.45) {
          triggerSound();
        }
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  content: accumulatedText,
                }
              : msg
          )
        );
      },
      {
        temperature: activeTemp,
        triad_mode: isTriadActive,
        onError: (err) => {
          handleStreamError(err);
        },
        onDone: () => {
          setServerErrorBanner(null);
          setLastFailedUserText(null);
          onConversationUpdated?.();
        },
      }
    );

    // Finalize isStreaming flag
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantPlaceholderId ? { ...msg, isStreaming: false } : msg
      )
    );
  };

  const handleRetry = () => {
    if (lastFailedUserText) {
      handleSend(lastFailedUserText);
    } else if (messages.length > 0) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUser && lastUser.content) {
        handleSend(lastUser.content);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = MODEL_QUICK_ACTIONS[currentActiveModel] || MODEL_QUICK_ACTIONS.speed;

  return (
    <div
      className="lyaxis-chat-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        minHeight: '100dvh',
        maxHeight: '100dvh',
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      
      {/* Header with Live In-Chat Model Switcher Dropdown, PDF export, and Mute Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '10px 12px' : '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(8, 8, 12, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 25,
          flexShrink: 0,
        }}
      >
        {/* Interactive In-Chat Model Selector */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            title="Cambiar modelo de IA dentro de esta conversación"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${meta.color}55`,
              borderRadius: '10px',
              padding: isMobile ? '8px 14px' : '6px 12px',
              minHeight: isMobile ? '44px' : '36px',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: `0 0 14px ${meta.color}22`,
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: meta.color,
                boxShadow: `0 0 8px ${meta.color}`,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: isMobile ? '14px' : '13px', fontWeight: 700, letterSpacing: '0.3px' }}>
              LYAXIS {meta.label}
            </span>
            <span style={{ fontSize: isMobile ? '12px' : '11px', color: '#71717a', marginLeft: '2px', fontFamily: 'monospace' }}>
              T:{meta.temperature}
            </span>
            <ChevronDown
              size={14}
              color="#a1a1aa"
              style={{
                transform: isModelDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>

          {isModelDropdownOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 45, backgroundColor: 'transparent' }}
                onClick={() => setIsModelDropdownOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: isMobile ? 'calc(100vw - 28px)' : '300px',
                  maxWidth: '340px',
                  backgroundColor: '#0a0a0f',
                  border: '1px solid #22222e',
                  borderRadius: '12px',
                  padding: '6px',
                  boxShadow: '0 10px 35px rgba(0,0,0,0.9), 0 0 20px rgba(0, 217, 255, 0.1)',
                  zIndex: 50,
                  backdropFilter: 'blur(16px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 800, color: '#71717a', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Cambiar Modelo en este Chat
                </div>
              {ALL_MODELS.map((m) => {
                const itemMeta = modelMeta[m] || MODEL_META[m] || MODEL_META.classic;
                const isSelected = currentActiveModel === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModelSwitch(m)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: isSelected ? '#ffffff' : '#a1a1aa',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: itemMeta.color, flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#ffffff' : '#e2e8f0', lineHeight: 1.3 }}>
                          {itemMeta.label}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {itemMeta.tagline}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '10.5px', color: '#71717a', fontFamily: 'monospace', flexShrink: 0 }}>
                      T:{itemMeta.temperature}
                    </span>
                  </button>
                );
              })}
            </div>
            </>
          )}
        </div>

        {/* Action Controls in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Sound Mute Toggle (5. Interruptor de Sonido Discreto) */}
          <button
            type="button"
            onClick={toggleSoundMute}
            title={isMuted ? 'Activar efectos de audio' : 'Silenciar efectos de audio'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: isMobile ? '44px' : '32px',
              minHeight: isMobile ? '44px' : '32px',
              width: isMobile ? '44px' : '32px',
              height: isMobile ? '44px' : '32px',
              borderRadius: '8px',
              backgroundColor: isMuted ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 217, 255, 0.08)',
              border: isMuted ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 217, 255, 0.25)',
              color: isMuted ? '#71717a' : '#00D9FF',
              cursor: 'pointer',
              boxShadow: isMuted ? 'none' : '0 0 10px rgba(0, 217, 255, 0.2)',
              transition: 'all 0.2s ease',
            }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* LYAXIS Notebook Canvas Studio Button */}
          <button
            type="button"
            onClick={() => {
              triggerSound();
              if (!notebookContent && messages.length > 0) {
                const lastModel = [...messages].reverse().find((m) => m.role === 'model');
                if (lastModel?.content) {
                  setNotebookContent(lastModel.content);
                  setNotebookTitle(`Apuntes ${meta.label} • ${new Date().toLocaleDateString('es-MX')}`);
                }
              }
              setIsNotebookOpen(true);
            }}
            title="Abrir Cuaderno Visual LYAXIS (Notebook Studio)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: isNotebookOpen ? 'rgba(0, 217, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: isNotebookOpen ? '1px solid rgba(0, 217, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: isMobile ? '8px 12px' : '6px 10px',
              minHeight: isMobile ? '44px' : '32px',
              color: isNotebookOpen ? '#00D9FF' : '#ffffff',
              fontSize: isMobile ? '13px' : '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <BookOpen size={15} color="#00D9FF" />
            {!isMobile && <span>Notebook</span>}
          </button>

          {onExportPDF && messages.length > 0 && (
            <button
              type="button"
              onClick={() => onExportPDF('Conversación LYAXIS', meta.label, meta.color, messages)}
              title="Exportar chat a PDF"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: isMobile ? '8px 12px' : '6px 10px',
                minHeight: isMobile ? '44px' : '32px',
                color: '#ffffff',
                fontSize: isMobile ? '13px' : '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <FileDown size={15} color="#00D9FF" />
              {!isMobile && <span>PDF</span>}
            </button>
          )}
        </div>
      </div>
      
      {/* Cyberpunk Cold Start / Server Timeout Error Banner */}
      {serverErrorBanner && (
        <div
          role="alert"
          style={{
            margin: isMobile ? '8px 10px 0' : '12px 16px 0',
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(20, 14, 8, 0.95)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            boxShadow: '0 0 25px rgba(245, 158, 11, 0.2), inset 0 0 12px rgba(245, 158, 11, 0.08)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: '12px',
            zIndex: 30,
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={18} color="#F59E0B" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.8px', color: '#F59E0B', textTransform: 'uppercase' }}>
                  TELEMETRÍA // INICIO DE SERVIDOR EN CURSO
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#fef3c7', lineHeight: '1.4' }}>
                {serverErrorBanner}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: isMobile ? 'flex-end' : 'center' }}>
            <button
              type="button"
              onClick={handleRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid #F59E0B',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 14px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <RefreshCw size={13} />
              <span>Reintentar ahora</span>
            </button>
            <button
              type="button"
              onClick={() => setServerErrorBanner(null)}
              title="Cerrar aviso"
              style={{
                background: 'none',
                border: 'none',
                color: '#a1a1aa',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Messages List or Cyberpunk Empty State */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px' : '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: '960px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
          {messages.length === 0 ? (
            /* 1. Tarjetas de Acción Rápida por Modelo (Eliminar pantalla vacía) */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#71717a',
                gap: '22px',
                textAlign: 'center',
                minHeight: '60vh',
                padding: '16px 12px',
                animation: 'fadeIn 0.3s ease-out',
              }}
            >
              {/* Emblem with animated glowing aura ring */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  style={{
                    position: 'absolute',
                    width: '96px',
                    height: '96px',
                    borderRadius: '28px',
                    background: `radial-gradient(circle, ${meta.color}66 0%, transparent 70%)`,
                    filter: 'blur(16px)',
                    animation: 'lyaxisPulse 2.5s infinite ease-in-out',
                  }}
                />
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '20px',
                    background: `linear-gradient(135deg, ${meta.color}, #00D9FF)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 35px ${meta.color}77, 0 0 15px rgba(0, 217, 255, 0.4)`,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {MODEL_ICONS[currentActiveModel]?.(32, '#ffffff')}
                </div>
              </div>

              {/* Title & Philosophy */}
              <div>
                <h2
                  style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    color: '#ffffff',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.4px',
                    background: `linear-gradient(180deg, #FFFFFF 0%, ${meta.color} 140%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  LYAXIS {meta.label}
                </h2>
                <p style={{ fontSize: '14px', maxWidth: '540px', margin: '0 auto', lineHeight: '1.6', color: '#94a3b8' }}>
                  {meta.description}
                </p>
              </div>

              {/* Capability badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#00D9FF', backgroundColor: 'rgba(0, 217, 255, 0.08)', border: '1px solid rgba(0, 217, 255, 0.25)', padding: '4px 11px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Zap size={11} /> Temperatura: {meta.temperature}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: meta.color, backgroundColor: `${meta.color}14`, border: `1px solid ${meta.color}40`, padding: '4px 11px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Shield size={11} /> Encriptación AES-256
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#a78bfa', backgroundColor: 'rgba(167, 139, 250, 0.08)', border: '1px solid rgba(167, 139, 250, 0.25)', padding: '4px 11px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Cpu size={11} /> Motor Dual Neural LYAXIS
                </span>
              </div>

              {/* 4 Cyberpunk Quick Action Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '680px',
                  marginTop: '10px',
                }}
              >
                {quickActions.map((promptText, i) => (
                  <button
                    key={`${currentActiveModel}-${i}`}
                    type="button"
                    className="lyaxis-quick-card"
                    onClick={() => handleSend(promptText)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: 'rgba(10, 10, 16, 0.75)',
                      border: `1px solid ${meta.color}33`,
                      borderRadius: '14px',
                      padding: isMobile ? '14px 16px' : '12px 16px',
                      minHeight: isMobile ? '56px' : '48px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#ffffff',
                      backdropFilter: 'blur(12px)',
                      boxShadow: `0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 1px ${meta.color}22`,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${meta.color}88`;
                      e.currentTarget.style.backgroundColor = 'rgba(18, 18, 28, 0.85)';
                      e.currentTarget.style.boxShadow = `0 6px 24px rgba(0,0,0,0.6), 0 0 16px ${meta.color}22`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${meta.color}33`;
                      e.currentTarget.style.backgroundColor = 'rgba(10, 10, 16, 0.75)';
                      e.currentTarget.style.boxShadow = `0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 1px ${meta.color}22`;
                    }}
                  >
                    <div
                      style={{
                        width: isMobile ? '38px' : '32px',
                        height: isMobile ? '38px' : '32px',
                        borderRadius: '10px',
                        backgroundColor: `${meta.color}15`,
                        border: `1px solid ${meta.color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {MODEL_ICONS[currentActiveModel]?.(isMobile ? 18 : 15, meta.color)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: isMobile ? '14.5px' : '13px',
                          lineHeight: '1.5',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          color: '#f8fafc',
                          fontWeight: 500,
                        }}
                      >
                        {promptText}
                      </span>
                    </div>
                    <ChevronRight size={16} color="#71717a" style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>

              {/* Status footer pill */}
              <div
                style={{
                  marginTop: '8px',
                  padding: '5px 14px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '10.5px',
                  color: '#71717a',
                }}
              >
                <span style={{ color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                  NÚCLEO ONLINE
                </span>
                <span>•</span>
                <span>FAILOVER: ALTA DISPONIBILIDAD ACTIVA</span>
              </div>
            </div>
          ) : (
            /* 2. Renderizado Matemático con KaTeX y Markdown Elegante con MessageBubble */
            messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id || idx}
                message={msg}
                activeModel={currentActiveModel}
                isMobile={isMobile}
                onExportPDF={onExportPDF}
                onOpenInNotebook={handleOpenInNotebook}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area with Image Attachment & Nexus Suggestion (4. Selector de Imágenes) */}
      <div
        className="lyaxis-bottom-bar"
        style={{
          padding: isMobile ? '10px 12px max(14px, env(safe-area-inset-bottom, 14px))' : '16px 24px 20px',
          borderTop: '1px solid #121216',
          backgroundColor: 'rgba(4, 4, 8, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          position: 'sticky',
          bottom: 0,
          zIndex: 40,
          flexShrink: 0,
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{ maxWidth: '960px', margin: '0 auto', width: '100%' }}
        >
          {/* Notification: Auto-switch to Zenith */}
          {showZenithNotice && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                marginBottom: '8px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 217, 255, 0.12)',
                border: '1px solid rgba(0, 217, 255, 0.35)',
                boxShadow: '0 0 15px rgba(0, 217, 255, 0.18)',
                gap: '10px',
                animation: 'fadeIn 0.25s ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <Sparkles size={14} color="#00D9FF" />
                <span style={{ fontSize: '12px', color: '#cffafe', lineHeight: '1.4' }}>
                  🔷 <strong>Cambiado automáticamente a Zenith</strong> para análisis visual y de arquitectura.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowZenithNotice(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#67e8f9',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Floating Thumbnail Preview with Close Cross */}
          {selectedImage && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
                padding: '6px 10px',
                borderRadius: '10px',
                backgroundColor: 'rgba(15, 15, 22, 0.95)',
                border: '1px solid rgba(0, 217, 255, 0.4)',
                boxShadow: '0 4px 18px rgba(0,0,0,0.7), 0 0 12px rgba(0, 217, 255, 0.15)',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <img
                src={selectedImage}
                alt="Vista previa adjunta"
                style={{
                  width: '42px',
                  height: '42px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#00D9FF' }}>
                  Imagen lista (Zenith Multimodal)
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Optimizada para visión</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setShowZenithNotice(false);
                }}
                title="Eliminar imagen"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  cursor: 'pointer',
                  padding: '4px',
                  marginLeft: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* LYAXIS TRIAD™ Control Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              padding: '0 4px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <button
              type="button"
              onClick={toggleTriad}
              title="Activar o desactivar el debate triádico en tiempo real: Create ➔ Break ➔ Rebuild"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: isMobile ? '6px 12px' : '5px 12px',
                borderRadius: '8px',
                backgroundColor: isTriadActive ? 'rgba(124, 58, 237, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                border: isTriadActive ? '1px solid rgba(124, 58, 237, 0.55)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isTriadActive ? '#ffffff' : '#a1a1aa',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.3px',
                transition: 'all 0.2s ease',
                boxShadow: isTriadActive ? '0 0 16px rgba(124, 58, 237, 0.35)' : 'none',
              }}
            >
              <Zap size={13} color={isTriadActive ? '#00D9FF' : '#71717a'} />
              <span>⚡ LYAXIS TRIAD™ :</span>
              <span
                style={{
                  color: isTriadActive ? '#10B981' : '#71717a',
                  fontWeight: 800,
                }}
              >
                {isTriadActive ? 'ON' : 'OFF'}
              </span>
            </button>

            {isTriadActive && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '10.5px',
                  fontFamily: 'monospace',
                  color: '#d8b4fe',
                  backgroundColor: 'rgba(124, 58, 237, 0.14)',
                  border: '1px solid rgba(124, 58, 237, 0.35)',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  animation: 'fadeIn 0.25s ease-out',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 8px #10B981',
                    display: 'inline-block',
                  }}
                />
                <span>TRIAD ENGAGED // 3 CORES SYNCED</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div
            className={isTriadActive ? 'lyaxis-triad-active-box' : ''}
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              backgroundColor: '#08080c',
              border: isTriadActive ? '1px solid transparent' : `1px solid ${selectedImage ? meta.color + '66' : '#1a1a24'}`,
              borderRadius: '14px',
              padding: isMobile ? '8px 10px' : '12px 16px',
              gap: '10px',
              boxShadow: isTriadActive ? undefined : '0 4px 25px rgba(0,0,0,0.8)',
              transition: 'border-color 0.2s ease',
            }}
          >
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              style={{ display: 'none' }}
            />

            {/* Paperclip Button for Image Attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar imagen para análisis multimodal"
              style={{
                width: isMobile ? '44px' : '36px',
                height: isMobile ? '44px' : '36px',
                minWidth: isMobile ? '44px' : '36px',
                borderRadius: '10px',
                backgroundColor: selectedImage ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: selectedImage ? '1px solid #EC4899' : '1px solid rgba(255, 255, 255, 0.1)',
                color: selectedImage ? '#EC4899' : '#a1a1aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                boxShadow: selectedImage ? '0 0 12px rgba(236, 72, 153, 0.3)' : 'none',
              }}
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (isMobile) {
                  setTimeout(() => {
                    textareaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                  }, 150);
                }
              }}
              placeholder={
                isTriadActive
                  ? 'Consulta a LYAXIS TRIAD™ (Create ➔ Break ➔ Rebuild)...'
                  : (selectedImage
                      ? 'Describe la imagen adjunta...'
                      : `Mensaje a LYAXIS ${meta.label}...`)
              }
              rows={1}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: isMobile ? '16px' : '14.5px',
                lineHeight: '1.45',
                resize: 'none',
                outline: 'none',
                maxHeight: '140px',
                fontFamily: 'inherit',
                padding: '6px 0',
              }}
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={stopStreaming}
                title="Detener generación"
                style={{
                  width: isMobile ? '44px' : '36px',
                  height: isMobile ? '44px' : '36px',
                  minWidth: isMobile ? '44px' : '36px',
                  borderRadius: '10px',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 0 14px rgba(220, 38, 38, 0.4)',
                }}
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim() && !selectedImage}
                title="Enviar mensaje"
                style={{
                  width: isMobile ? '44px' : '36px',
                  height: isMobile ? '44px' : '36px',
                  minWidth: isMobile ? '44px' : '36px',
                  borderRadius: '10px',
                  backgroundColor: isTriadActive
                    ? ((inputValue.trim() || selectedImage) ? '#7C3AED' : '#1c1c24')
                    : ((inputValue.trim() || selectedImage) ? meta.color : '#1c1c24'),
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (inputValue.trim() || selectedImage) ? 'pointer' : 'default',
                  flexShrink: 0,
                  boxShadow: (inputValue.trim() || selectedImage) 
                    ? (isTriadActive ? '0 0 16px rgba(124, 58, 237, 0.5)' : `0 0 16px ${meta.color}44`) 
                    : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* LYAXIS NOTEBOOK STUDIO VISOR / DRAWER */}
      <NotebookStudio
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        initialContent={notebookContent}
        initialTitle={notebookTitle}
        activeModel={currentActiveModel}
        isMobile={isMobile}
      />
    </div>
  );
};

export default ChatView;
