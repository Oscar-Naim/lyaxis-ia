import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
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
  PanelLeft,
  LogIn,
  LogOut,
  LayoutDashboard,
  Info,
  Menu,
  Mic,
  MicOff,
  Wand2,
  Command,
  FileText,
  Sliders,
  FileCode,
  Bookmark,
  ArrowDown,
  Globe,
  ArrowUpRight,
  MoreHorizontal,
} from 'lucide-react';
import type { Message, ModelType, User, Conversation } from '../types';
import { useSSEStream } from '../useSSEStream';
import { useTriadQuota } from '../useTriadQuota';
import { MessageBubble } from './MessageBubble';
import { LiveCanvasWorkspace } from './LiveCanvasWorkspace';
import { PromptVaultModal } from './PromptVaultModal';
import { TriadQuotaModal } from './TriadQuotaModal';
import { isSoundMuted, setSoundMuted, playCyberClick as globalPlayCyberClick } from '../sound';
import { API_BASE, CORE_MODELS, SPECIALIST_MODELS, MODEL_META, MODEL_QUICK_ACTIONS, THEMES } from '../config';
import { exportChatToPDF } from '../pdfExporter';
import { exportChatToMarkdown, exportChatToJSON } from '../utils/chatExporter';
import { routePromptToModel } from '../utils/neuralRouter';
import { getStoredInstructions } from './CustomInstructionsModal';

const NotebookStudio = lazy(() =>
  import('./NotebookStudio').then((m) => ({ default: m.NotebookStudio }))
);

export interface ChatViewProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  selectedModel: ModelType;
  setSelectedModel?: (model: ModelType) => void;
  currentChatId: string | null;
  setCurrentChatId?: (id: string) => void;
  onEnsureConversation?: (chat: Conversation) => void;
  activeUserId?: string;
  isMobile?: boolean;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  playCyberClick?: () => void;
  onConversationUpdated?: () => void;
  onExportPDF?: (title: string, label: string, color: string, msgs: Message[]) => void;
  modelMeta?: Record<ModelType, { label: string; tagline?: string; color: string; description: string; temperature: number }>;
  modelPrompts?: Record<ModelType, { icon: React.ReactNode; bg: string; border: string; text: string }[]>;
  onSelectModel?: (model: ModelType) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  user?: User | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenDashboard?: () => void;
  onOpenInfoDrawer?: (tab?: 'manifesto' | 'ecosystem' | 'security' | 'terms') => void;
  onOpenDirectives?: () => void;
  isScanlineActive?: boolean;
  isChromaticActive?: boolean;
  onOpenCommandPalette?: () => void;
  onForkConversation?: (messagesUpToHere: Message[]) => void;
  initialPrompt?: string | null;
  onInitialPromptConsumed?: () => void;
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
  onEnsureConversation,
  activeUserId,
  isMobile = false,
  soundEnabled,
  onToggleSound,
  playCyberClick,
  onConversationUpdated,
  onExportPDF,
  modelMeta = MODEL_META,
  onSelectModel,
  isSidebarOpen = true,
  onToggleSidebar,
  user = null,
  onOpenAuth,
  onLogout,
  onOpenDashboard,
  onOpenInfoDrawer,
  onOpenDirectives,
  isScanlineActive = false,
  isChromaticActive = false,
  onOpenCommandPalette,
  onForkConversation,
  initialPrompt = null,
  onInitialPromptConsumed,
}) => {
  const [currentActiveModel, setCurrentActiveModel] = useState<ModelType>(selectedModel || 'speed');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showZenithNotice, setShowZenithNotice] = useState(false);
  const [isPromptVaultOpen, setIsPromptVaultOpen] = useState(false);
  const [splitCanvasData, setSplitCanvasData] = useState<{ code: string; language: string; title?: string } | null>(null);
  const [isAutoRouterActive, setIsAutoRouterActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lyaxis_auto_router') === 'true';
    } catch {
      return false;
    }
  });
  const [routerNotice, setRouterNotice] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string; size: string }[]>([]);

  // Listen for Split Canvas custom event dispatched from CodeBlock Pro
  useEffect(() => {
    const handleOpenSplitCanvas = (e: Event) => {
      const customEvent = e as CustomEvent<{ code: string; language: string; title?: string }>;
      if (customEvent.detail?.code) {
        setSplitCanvasData({
          code: customEvent.detail.code,
          language: customEvent.detail.language || 'html',
          title: customEvent.detail.title || 'LYAXIS Live Canvas Studio',
        });
      }
    };
    window.addEventListener('lyaxis_open_split_canvas', handleOpenSplitCanvas);
    return () => window.removeEventListener('lyaxis_open_split_canvas', handleOpenSplitCanvas);
  }, []);

  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [notebookContent, setNotebookContent] = useState('');
  const [notebookTitle, setNotebookTitle] = useState('Cuaderno LYAXIS');

  // Sound mute state synced with soundEnabled prop & localStorage ('lyaxis_sound_muted')
  const [isMuted, setIsMuted] = useState<boolean>(() =>
    soundEnabled !== undefined ? !soundEnabled : isSoundMuted()
  );

  useEffect(() => {
    if (soundEnabled !== undefined) {
      setIsMuted(!soundEnabled);
    }
  }, [soundEnabled]);

  const [inputValue, setInputValue] = useState('');
  const [serverErrorBanner, setServerErrorBanner] = useState<string | null>(null);
  const [lastFailedUserText, setLastFailedUserText] = useState<string | null>(null);

  // LYAXIS TRIAD™ Quota Rate Limiting (3 consultas / ventana 6h)
  const {
    remaining: triadRemaining,
    consumeTriadSlot,
    syncServerQuota,
    canExecuteTriad,
    timeRemainingFormatted: triadTimeFormatted,
    isInCooldown: isTriadCooldown,
    cooldownFormatted: triadCooldownFormatted,
  } = useTriadQuota();

  const [isTriadQuotaModalOpen, setIsTriadQuotaModalOpen] = useState(false);

  // LYAXIS TRIAD™ Mode State
  const [isTriadActive, setIsTriadActive] = useState<boolean>(() => {
    try {
      const active = localStorage.getItem('lyaxis_triad_active') === 'true';
      const quota = canExecuteTriad();
      return active && quota.allowed;
    } catch {
      return false;
    }
  });

  // Conmutación automática a Speed si los usos de TRIAD llegan a 0 estando activo (cuota de 6h agotada)
  useEffect(() => {
    if (triadRemaining === 0 && isTriadActive) {
      setIsTriadActive(false);
      try {
        localStorage.setItem('lyaxis_triad_active', 'false');
      } catch {}
      if (currentActiveModel !== 'speed') {
        handleModelSwitch('speed');
      }
    }
  }, [triadRemaining, isTriadActive, currentActiveModel]);

  // Capturar evento HTTP 429 de Rate Limit del backend para sincronización inteligente
  useEffect(() => {
    const handleServer429 = (e: any) => {
      const retryMs = e?.detail?.retryAfterMs;
      const reason = e?.detail?.reason;
      const message = e?.detail?.message;
      syncServerQuota(retryMs, reason);

      if (reason === 'COOLDOWN') {
        setServerErrorBanner(message || '⏳ Enfriamiento de LYAXIS TRIAD™ activo (1 uso cada 2 minutos). Espera unos instantes.');
      } else {
        setIsTriadActive(false);
        try {
          localStorage.setItem('lyaxis_triad_active', 'false');
        } catch {}
        handleModelSwitch('speed');
        setIsTriadQuotaModalOpen(true);
      }
    };
    window.addEventListener('lyaxis_triad_server_429', handleServer429);
    return () => window.removeEventListener('lyaxis_triad_server_429', handleServer429);
  }, [syncServerQuota]);

  // Streaming Telemetry & Velocity Stats
  const [streamingTelemetry, setStreamingTelemetry] = useState<{
    tps: number;
    durationMs: number;
    tokenCount: number;
    /** true cuando los tokens provienen del backend (usage real), no de una estimación */
    verified?: boolean;
    promptTokens?: number;
    completionTokens?: number;
    modelUsed?: string;
  } | null>(null);
  const streamStartTimeRef = useRef<number>(0);
  const streamTokenCountRef = useRef<number>(0);

  // Speech-to-Text (Voice Dictation)
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const speechBaseTextRef = useRef<string>('');

  const toggleTriad = () => {
    if (!isTriadActive && triadRemaining === 0) {
      setIsTriadQuotaModalOpen(true);
      triggerSound();
      return;
    }

    triggerSound();
    setIsTriadActive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lyaxis_triad_active', String(next));
      } catch {}
      return next;
    });
  };

  // Listen to global Notebook & Triad custom events dispatched from Sidebar / CommandPalette
  useEffect(() => {
    const onOpenNb = () => setIsNotebookOpen(true);
    const onToggleTr = () => toggleTriad();
    window.addEventListener('lyaxis_open_notebook', onOpenNb);
    window.addEventListener('lyaxis_toggle_triad', onToggleTr);
    return () => {
      window.removeEventListener('lyaxis_open_notebook', onOpenNb);
      window.removeEventListener('lyaxis_toggle_triad', onToggleTr);
    };
  }, [isTriadActive, triadRemaining]);

  // Consume initialPrompt passed from LandingPage Showcase
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInputValue(initialPrompt);
      onInitialPromptConsumed?.();
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [initialPrompt, onInitialPromptConsumed]);

  // Secondary Tools Dropdown State (Menú ···)
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);

  const [showEmptySpecialists, setShowEmptySpecialists] = useState(false);

  // Focus state for bottom input box chromatic glow
  const [isInputFocused, setIsInputFocused] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
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

  // Global Keyboard Shortcut: Cmd/Ctrl + / => Focus Input (Cmd/Ctrl + K is handled globally in App.tsx for CommandPalette)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Clipboard Image Paste Handler (Ctrl + V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData || !e.clipboardData.items) return;
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            try {
              const processed = await compressImage(file);
              setSelectedImage(processed);
              if (currentActiveModel !== 'zenith') {
                handleModelSwitch('zenith');
                setShowZenithNotice(true);
                setTimeout(() => setShowZenithNotice(false), 5000);
              }
              triggerSound();
            } catch (err) {
              console.warn('Error al pegar imagen:', err);
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [currentActiveModel]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      try {
        speechRecognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  // Voice Dictation Toggle (Web Speech API) con transcripción acumulativa sin repeticiones
  const toggleSpeechRecognition = () => {
    triggerSound();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('El reconocimiento de voz no está soportado en este navegador. Te recomendamos usar Chrome o Edge.');
      return;
    }

    if (isListening) {
      try {
        speechRecognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      speechBaseTextRef.current = '';
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-MX';
      recognition.continuous = true;
      recognition.interimResults = true;
      // Guardar el texto base previamente escrito para no sobrescribirlo ni duplicarlo
      speechBaseTextRef.current = inputValue ? inputValue.trim() : '';

      recognition.onresult = (event: any) => {
        let finalAccumulated = '';
        let interimAccumulated = '';
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalAccumulated += res[0].transcript;
          } else {
            interimAccumulated += res[0].transcript;
          }
        }
        const spoken = (finalAccumulated + interimAccumulated).trim();
        const base = speechBaseTextRef.current;
        if (spoken) {
          setInputValue(base ? `${base} ${spoken}` : spoken);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Aviso reconocimiento de voz:', e);
        setIsListening(false);
        speechBaseTextRef.current = '';
      };

      recognition.onend = () => {
        setIsListening(false);
        speechBaseTextRef.current = '';
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.warn('Error iniciando voz:', err);
      setIsListening(false);
      speechBaseTextRef.current = '';
    }
  };

  // Enhance Prompt using concise Architect directives (token-optimized)
  const handleEnhancePrompt = () => {
    if (!inputValue.trim()) return;
    triggerSound();
    const original = inputValue.trim();
    const enhanced = `${original}\n\n[Requisitos: código 100% funcional sin placeholders, manejo de casos borde y arquitectura limpia de producción.]`;
    setInputValue(enhanced);
  };

  // Slash commands registry con todos los modelos neuronales activos y utilidades
  const SLASH_COMMANDS = [
    { cmd: '/speed', label: 'LYAXIS Speed', desc: 'Motor ágil de respuestas inmediatas (~14ms)', action: () => handleModelSwitch('speed') },
    { cmd: '/cortex', label: 'LYAXIS Cortex', desc: 'Razonamiento profundo paso a paso y lógica matemática', action: () => handleModelSwitch('cortex') },
    { cmd: '/zenith', label: 'LYAXIS Zenith', desc: 'Cerebro superior, visión multimodal y arquitectura', action: () => handleModelSwitch('zenith') },
    { cmd: '/architect', label: 'LYAXIS Architect', desc: 'Ingeniería de software, arquitectura de sistemas y prompts', action: () => handleModelSwitch('architect') },
    { cmd: '/phantom', label: 'LYAXIS Phantom', desc: 'Auditoría de código, ciberseguridad y análisis de fallos', action: () => handleModelSwitch('phantom') },
    { cmd: '/nexus', label: 'LYAXIS Nexus', desc: 'Pensador interdisciplinario y síntesis creativa transversal', action: () => handleModelSwitch('nexus') },
    { cmd: '/forge', label: 'LYAXIS Forge', desc: 'Constructor pragmático, MVP y modelos de negocio', action: () => handleModelSwitch('forge') },
    { cmd: '/magister', label: 'LYAXIS Magister', desc: 'Planeación docente SEP y secuencias didácticas NEM', action: () => handleModelSwitch('magister') },
    { cmd: '/root', label: 'LYAXIS Root', desc: 'Ingeniería de sistemas, código completo y ejecución total', action: () => handleModelSwitch('root') },
    { cmd: '/triad', label: 'LYAXIS TRIAD™', desc: 'Activa o desactiva la inferencia conectada Create + Break ➔ Rebuild', action: () => toggleTriad() },
    { cmd: '/cmd', label: 'Paleta de Comandos (Ctrl+K)', desc: 'Abre el HUD de búsqueda y atajos rápidos', action: () => onOpenCommandPalette?.() },
    { cmd: '/vault', label: 'Bóveda de Prompts', desc: 'Abre la librería táctica de prompts reutilizables', action: () => setIsPromptVaultOpen(true) },
    { cmd: '/clear', label: 'Limpiar Chat', desc: 'Vacía la vista de mensajes de la conversación actual', action: () => setMessages([]) },
    { cmd: '/canvas', label: 'Abrir Cuaderno', desc: 'Abre el estudio visual de notas y diapositivas', action: () => setIsNotebookOpen(true) },
  ];

  const filteredCommands = inputValue.startsWith('/')
    ? SLASH_COMMANDS.filter((sc) => sc.cmd.toLowerCase().startsWith(inputValue.toLowerCase().split(' ')[0]))
    : [];

  // Click outside to close model dropdown, export menu, and mobile actions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsModelDropdownOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const meta = modelMeta[currentActiveModel] || MODEL_META[currentActiveModel] || MODEL_META.speed;
  const currentTheme = THEMES[currentActiveModel] || THEMES.speed;

  // Índice de comando seleccionado en el popup de comandos '/'
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  useEffect(() => {
    setSlashSelectedIndex(0);
  }, [inputValue]);

  const triggerSound = () => {
    if (!isMuted) {
      if (playCyberClick) playCyberClick();
      else globalPlayCyberClick();
    }
  };

  const toggleSoundMute = () => {
    if (onToggleSound) {
      onToggleSound();
      return;
    }
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

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const userScrolledUpRef = useRef(false);

  const handleChatScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distFromBottom > 140;
    userScrolledUpRef.current = isUp;
    setShowScrollBottom(isUp && messages.length > 0);
  };

  const scrollToBottomSmooth = () => {
    userScrolledUpRef.current = false;
    setShowScrollBottom(false);
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTo({
        top: messagesScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (messages.length === 0) {
      userScrolledUpRef.current = false;
      setShowScrollBottom(false);
    }
    if (messagesScrollRef.current && !userScrolledUpRef.current) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
    }
    if (typeof window !== 'undefined' && window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
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

  // File Upload handler: supports images (with auto-switch to Zenith) AND multiple code/document files (up to 5)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const firstFile = files[0];
      if (firstFile.type.startsWith('image/')) {
        const processedImage = await compressImage(firstFile);
        setSelectedImage(processedImage);
        setAttachedFiles([]);

        // Auto-switch to Zenith for vision analysis
        if (currentActiveModel !== 'zenith') {
          handleModelSwitch('zenith');
          setShowZenithNotice(true);
          setTimeout(() => setShowZenithNotice(false), 5000);
        }
        triggerSound();
      } else {
        // Multi-file Text / Code upload (max 5 files)
        const filesToProcess = files.slice(0, 5);
        const loadedItems: { name: string; content: string; size: string }[] = [];
        let hasCodeExt = false;

        for (const file of filesToProcess) {
          if (file.size > 2 * 1024 * 1024) {
            alert(`El archivo "${file.name}" supera el límite de 2 MB.`);
            continue;
          }
          const rawTextContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(String(ev.target?.result || ''));
            reader.onerror = () => reject(new Error(`Error al leer ${file.name}`));
            reader.readAsText(file);
          });
          // Limitar a ~16,000 caracteres (~4,000 tokens) por archivo para evitar desbordamiento de TPM / HTTP 413
          const MAX_FILE_CHARS = 16000;
          const textContent =
            rawTextContent.length > MAX_FILE_CHARS
              ? `${rawTextContent.slice(0, MAX_FILE_CHARS)}\n\n/* [...Archivo truncado a ${MAX_FILE_CHARS} caracteres para optimizar tokens...] */`
              : rawTextContent;
          const sizeKb = (file.size / 1024).toFixed(1) + ' KB';
          loadedItems.push({ name: file.name, content: textContent, size: sizeKb });

          const ext = file.name.split('.').pop()?.toLowerCase();
          if (['py', 'js', 'ts', 'tsx', 'sql', 'cpp', 'c', 'cs', 'go', 'rs', 'html', 'css', 'json', 'sh'].includes(ext || '')) {
            hasCodeExt = true;
          }
        }

        if (loadedItems.length > 0) {
          setAttachedFiles((prev) => [...prev, ...loadedItems].slice(0, 5));
          setSelectedImage(null);
          if (hasCodeExt && currentActiveModel !== 'architect' && currentActiveModel !== 'root') {
            handleModelSwitch('architect');
          }
          triggerSound();
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error al validar el archivo.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputValue;
    if ((!textToSend || !textToSend.trim()) && !selectedImage && attachedFiles.length === 0) return;
    if (isStreaming) return;

    // Interceptación de cuota estricta para el motor concurrente LYAXIS TRIAD™ (3 consultas / 6h)
    if (isTriadActive) {
      const quotaCheck = canExecuteTriad();
      if (quotaCheck.isInCooldown) {
        setServerErrorBanner(`⏳ Enfriamiento de LYAXIS TRIAD™ activo: espera ${quotaCheck.cooldownFormatted} antes de enviar la siguiente consulta concurrente.`);
        return; // Interceptar: no enviar, conservar texto
      }
      if (!quotaCheck.allowed || triadRemaining === 0) {
        setIsTriadActive(false);
        try {
          localStorage.setItem('lyaxis_triad_active', 'false');
        } catch {}
        handleModelSwitch('speed');
        setIsTriadQuotaModalOpen(true);
        return; // Interceptar: no enviar ni borrar texto
      }
      consumeTriadSlot();
    }

    // 1. Auto-Router Neuronal Inteligente (conmuta automáticamente al modelo idóneo según semántica)
    let activeModelForSend = currentActiveModel;
    if (isAutoRouterActive && !isTriadActive) {
      const route = routePromptToModel(textToSend, !!selectedImage);
      if (route.model !== currentActiveModel) {
        activeModelForSend = route.model;
        handleModelSwitch(route.model);
        setRouterNotice(`⚡ Neural Router: Enrutado a LYAXIS ${MODEL_META[route.model]?.label || route.model}`);
        setTimeout(() => setRouterNotice(null), 4500);
      }
    }

    // 2. Adjuntos de Código o Documentos (Multi-archivo)
    let userText = textToSend ? textToSend.trim() : '';
    if (attachedFiles.length > 0) {
      const attachmentsBlock = attachedFiles
        .map((af) => {
          const ext = af.name.split('.').pop() || 'text';
          return `[Archivo adjunto: ${af.name} (${af.size})]\n\`\`\`${ext}\n${af.content}\n\`\`\``;
        })
        .join('\n\n');
      userText = `${attachmentsBlock}\n\n${userText}`;
      setAttachedFiles([]);
    }

    // 3. Directivas de Memoria Personal
    const storedDirectives = getStoredInstructions();
    let messageContentForBackend = userText;
    if (storedDirectives.enabled) {
      const toneMap: Record<string, string> = {
        concise: 'Sé ultra conciso y directo, sin rodeos.',
        technical: 'Responde con rigor técnico, código completo y mejores prácticas.',
        pedagogical: 'Explica con enfoque didáctico y formativo paso a paso.',
        balanced: 'Responde de forma estructurada, balanceada y clara.',
        unfiltered: 'Ejecución técnica sin limitaciones.',
      };
      const directivePrefix = `[Directivas de Usuario: ${storedDirectives.userRole ? `Rol: ${storedDirectives.userRole}. ` : ''}${toneMap[storedDirectives.tone] || ''} ${storedDirectives.preferences || ''}]\n`;
      messageContentForBackend = `${directivePrefix}${userText}`;
    }

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

    const snippetTitle = userText
      .trim()
      .replace(/^\[Directivas[^\]]+\]\s*/, '')
      .replace(/^\[Archivo[^\]]+\]\s*/, '')
      .slice(0, 42)
      .trim() || 'Nueva conversación';

    const optimisticConv: Conversation = {
      id: targetChatId,
      userId: activeUserId || 'guest',
      title: snippetTitle,
      createdAt: new Date().toISOString(),
      model: activeModelForSend,
    };
    onEnsureConversation?.(optimisticConv);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
      model: activeModelForSend,
      image: imgToSend || undefined,
    };

    const assistantPlaceholderId = `model-${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'model',
      content: '',
      timestamp: new Date().toISOString(),
      model: activeModelForSend,
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMessage];
    userScrolledUpRef.current = false;
    setShowScrollBottom(false);
    setMessages([...updatedMessages, assistantMessage]);

    try {
      localStorage.setItem(`lyaxis_msgs_${targetChatId}`, JSON.stringify([...updatedMessages, assistantMessage]));
      localStorage.setItem('lyaxis_current_chat_id', targetChatId);
    } catch {}

    // Active model individual temperature
    const activeMeta = modelMeta[activeModelForSend] || MODEL_META[activeModelForSend] || MODEL_META.speed;
    const activeTemp = activeMeta.temperature ?? 0.3;

    // Stream with sound ticks if unmuted
    streamStartTimeRef.current = Date.now();
    streamTokenCountRef.current = 0;
    setStreamingTelemetry(null);

    const messagesForStream = updatedMessages.map((m, idx) => {
      if (idx === updatedMessages.length - 1 && m.role === 'user') {
        return { ...m, content: messageContentForBackend };
      }
      return m;
    });

    await sendMessage(
      messagesForStream,
      activeModelForSend,
      targetChatId,
      activeUserId,
      (accumulatedText) => {
        if (!isMuted && Math.random() > 0.45) {
          triggerSound();
        }
        streamTokenCountRef.current = Math.ceil(accumulatedText.length / 3.8);
        const elapsed = Math.max((Date.now() - streamStartTimeRef.current) / 1000, 0.1);
        const currentTps = Math.round(streamTokenCountRef.current / elapsed);
        setStreamingTelemetry({
          tps: Math.min(Math.max(currentTps, 15), 185),
          durationMs: Math.round(elapsed * 1000),
          tokenCount: streamTokenCountRef.current,
        });

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
        onDone: (_fullText, usage) => {
          const finalElapsed = Math.max((Date.now() - streamStartTimeRef.current) / 1000, 0.1);
          const finalDurationMs = Math.round(finalElapsed * 1000);
          if (usage && usage.totalTokens > 0) {
            // Telemetría real verificada por el backend
            const outTokens = usage.completionTokens || Math.max(usage.totalTokens - usage.promptTokens, 0);
            const realTps = outTokens > 0 ? Math.round(outTokens / finalElapsed) : 0;
            setStreamingTelemetry({
              tps: realTps,
              durationMs: finalDurationMs,
              tokenCount: usage.totalTokens,
              verified: true,
              promptTokens: usage.promptTokens,
              completionTokens: outTokens,
              modelUsed: usage.modelUsed,
            });
            try {
              localStorage.setItem(
                'lyaxis_last_stream_telemetry',
                JSON.stringify({
                  tps: realTps,
                  durationMs: finalDurationMs,
                  promptTokens: usage.promptTokens,
                  completionTokens: outTokens,
                  totalTokens: usage.totalTokens,
                  modelUsed: usage.modelUsed || activeModelForSend,
                  at: new Date().toISOString(),
                })
              );
            } catch {}
          } else {
            const finalTps = Math.round(streamTokenCountRef.current / finalElapsed);
            setStreamingTelemetry({
              tps: Math.min(Math.max(finalTps, 20), 165),
              durationMs: finalDurationMs,
              tokenCount: streamTokenCountRef.current,
            });
          }
          setMessages((prev) => {
            const next = prev.map((msg) =>
              msg.id === assistantPlaceholderId
                ? { ...msg, usage: usage && usage.totalTokens > 0 ? usage : msg.usage, durationMs: finalDurationMs }
                : msg
            );
            if (targetChatId) {
              try {
                localStorage.setItem(`lyaxis_msgs_${targetChatId}`, JSON.stringify(next));
                localStorage.setItem('lyaxis_current_chat_id', targetChatId);
              } catch {}
            }
            return next;
          });
          setServerErrorBanner(null);
          setLastFailedUserText(null);
          onConversationUpdated?.();
        },
      }
    );

    // Finalize isStreaming flag
    setMessages((prev) => {
      const next = prev.map((msg) =>
        msg.id === assistantPlaceholderId ? { ...msg, isStreaming: false } : msg
      );
      if (targetChatId) {
        try {
          localStorage.setItem(`lyaxis_msgs_${targetChatId}`, JSON.stringify(next));
          localStorage.setItem('lyaxis_current_chat_id', targetChatId);
        } catch {}
      }
      return next;
    });
  };

  const handleEditMessage = (msgIndex: number, newContent: string) => {
    // Podar la conversación hasta antes de este mensaje
    const remaining = messages.slice(0, msgIndex);
    setMessages(remaining);
    // Enviar el nuevo texto directamente
    handleSend(newContent);
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
    // Si la paleta flotante de '/' está visible con sugerencias
    if (filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredCommands[slashSelectedIndex] || filteredCommands[0];
        if (selected) {
          selected.action();
          setInputValue('');
          triggerSound();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInputValue('');
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const selected = filteredCommands[slashSelectedIndex] || filteredCommands[0];
        if (selected) {
          selected.action();
          setInputValue('');
          triggerSound();
        }
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const trimmed = inputValue.trim().toLowerCase();
      if (trimmed.startsWith('/')) {
        const matched = SLASH_COMMANDS.find((sc) => sc.cmd.toLowerCase() === trimmed);
        if (matched) {
          e.preventDefault();
          matched.action();
          setInputValue('');
          triggerSound();
          return;
        }
      }
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
        height: '100dvh',
        minHeight: '100dvh',
        maxHeight: '100dvh',
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        '--current-glow': currentTheme.glow,
        '--current-primary': currentTheme.primary,
      } as React.CSSProperties}
    >
      {/* 2. RESPLANDOR AMBIENTAL SUPERIOR REACTIVO (Haz de luz superior dinámico por modelo) */}
      <div
        className={`lyaxis-reactive-glow${isStreaming ? ' is-streaming' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '550px',
          pointerEvents: 'none',
          zIndex: 0,
          background: `radial-gradient(circle at 50% -20%, var(--current-glow, ${currentTheme.glow}), transparent 60%)`,
          transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {isScanlineActive && (
        <div
          className="lyaxis-laser-scanline"
          style={{ '--scan-color': meta.color } as React.CSSProperties}
        />
      )}
      {isChromaticActive && (
        <div className="lyaxis-chromatic-overlay" />
      )}
      
      {/* Header with 3 Zones (PC) / Compact Mobile Header (Mobile) — Zero Overflow */}
      <div
        className="lyaxis-header-bar"
        style={{
          position: 'sticky',
          top: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '8px 10px' : '10px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(5, 8, 17, 0.90)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 35,
          flexShrink: 0,
          gap: isMobile ? '8px' : '10px',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Zone 1 (Left): Hamburger (Mobile) or PanelLeft (Desktop) + Model Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: isMobile ? 1 : '0 1 auto' }}>
          {isMobile ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              title="Abrir menú y chats"
              aria-label="Abrir menú"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                minWidth: '40px',
                minHeight: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <Menu size={19} color={currentTheme.primary} />
            </button>
          ) : (
            !isSidebarOpen && onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                title="Mostrar barra lateral (Historial)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: `${currentTheme.primary}14`,
                  border: `1px solid ${currentTheme.primary}44`,
                  color: currentTheme.primary,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: `0 0 12px ${currentTheme.glow}`,
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <PanelLeft size={16} color={currentTheme.primary} />
                <span className="lyaxis-btn-label">Historial</span>
              </button>
            )
          )}

          {/* Selector Unificado de Modelo Activo */}
            <div style={{ position: 'relative', minWidth: 0, flex: '0 1 auto' }} ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  triggerSound();
                  setIsModelDropdownOpen(!isModelDropdownOpen);
                }}
                title="Cambiar motor de IA"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  backgroundColor: `${currentTheme.primary}18`,
                  border: `1px solid ${currentTheme.primary}55`,
                  borderRadius: '9px',
                  padding: '6px 12px',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: `0 0 12px ${currentTheme.glow}`,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: currentTheme.primary,
                    boxShadow: `0 0 8px ${currentTheme.primary}`,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span>LYAXIS {meta.label}</span>
                <span
                  className="lx-tabular"
                  style={{
                    fontSize: '10px',
                    color: '#94a3b8',
                    fontFamily: 'var(--lx-font-mono)',
                  }}
                >
                  T:{meta.temperature}
                </span>
                <ChevronDown
                  size={13}
                  color={currentTheme.primary}
                  style={{
                    transform: isModelDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
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
                      width: 'min(290px, calc(100vw - 24px))',
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
                    {/* 1. Sección de Motores Principales */}
                    <div style={{ padding: '6px 8px 4px', fontSize: '10px', fontWeight: 800, color: '#00d9ff', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--lx-font-mono)' }}>
                      Motores Principales (3)
                    </div>
                    {CORE_MODELS.map((m) => {
                      const itemMeta = MODEL_META[m] || MODEL_META.speed;
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
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: isSelected ? `1px solid ${itemMeta.color}55` : '1px solid transparent',
                            backgroundColor: isSelected ? `${itemMeta.color}1c` : 'transparent',
                            color: isSelected ? '#ffffff' : '#a1a1aa',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: itemMeta.color, boxShadow: isSelected ? `0 0 8px ${itemMeta.color}` : 'none', flexShrink: 0 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                              <span style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#ffffff' : '#e2e8f0', lineHeight: 1.3 }}>
                                LYAXIS {itemMeta.label}
                              </span>
                              <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {itemMeta.tagline}
                              </span>
                            </div>
                          </div>
                          <span className="lx-tabular" style={{ fontSize: '10px', color: '#64748b', fontFamily: 'var(--lx-font-mono)', flexShrink: 0 }}>
                            T:{itemMeta.temperature}
                          </span>
                        </button>
                      );
                    })}

                    {/* 2. Sección de Motores Especializados (Ocultos / Desplegables) */}
                    <div style={{ padding: '8px 8px 4px', marginTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.07)', fontSize: '10px', fontWeight: 800, color: '#71717a', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--lx-font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Especializados (7)</span>
                      <Sliders size={11} color="#71717a" />
                    </div>
                    {SPECIALIST_MODELS.map((m) => {
                      const itemMeta = MODEL_META[m] || MODEL_META.speed;
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
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: isSelected ? `1px solid ${itemMeta.color}55` : '1px solid transparent',
                            backgroundColor: isSelected ? `${itemMeta.color}1c` : 'transparent',
                            color: isSelected ? '#ffffff' : '#a1a1aa',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: itemMeta.color, flexShrink: 0 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12.5px', fontWeight: isSelected ? 800 : 500, color: isSelected ? '#ffffff' : '#cbd5e1', lineHeight: 1.3 }}>
                                  {itemMeta.label}
                                </span>
                                {isSelected && (
                                  <span style={{ fontSize: '8.5px', backgroundColor: `${itemMeta.color}33`, color: itemMeta.color, padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                    ACTIVO
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '10.5px', color: '#94a3b8', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {itemMeta.tagline}
                              </span>
                            </div>
                          </div>
                          <span className="lx-tabular" style={{ fontSize: '10px', color: '#64748b', fontFamily: 'var(--lx-font-mono)', flexShrink: 0 }}>
                            T:{itemMeta.temperature}
                          </span>
                        </button>
                      );
                    })}
                    <div style={{ padding: '8px 10px', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Command size={12} color="#00D9FF" />
                      <span>Escribe <b>/</b> o abre Comandos para los 10 motores</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Indicador de Estado Discreto (punto verde) */}
            <div
              title="Red neuronal ONLINE • Latencia ~14ms • Acceso Activo"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#00ff66',
                boxShadow: '0 0 8px #00ff66',
                cursor: 'help',
                flexShrink: 0,
              }}
            />
          </div>

        {/* Zone 3 (Right): Comandos (Ctrl+K) + Menú ··· + Usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Botón Comandos en PC */}
          {!isMobile && onOpenCommandPalette && (
            <button
              type="button"
              onClick={() => {
                triggerSound();
                onOpenCommandPalette();
              }}
              title="Paleta de Comandos y Todos los Motores (Ctrl+K)"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: 'rgba(0, 217, 255, 0.08)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                borderRadius: '8px',
                padding: '6px 10px',
                minHeight: '32px',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 10px rgba(0, 217, 255, 0.1)',
                whiteSpace: 'nowrap',
              }}
            >
              <Command size={14} color="#00D9FF" />
              <span className="lyaxis-btn-label">Comandos</span>
              <kbd className="lyaxis-kbd-hint" style={{ fontSize: '9.5px', opacity: 0.75, backgroundColor: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '4px' }}>Ctrl+K</kbd>
            </button>
          )}

          {/* Menú de Herramientas Secundarias `···` */}
          <div style={{ position: 'relative' }} ref={toolsMenuRef}>
            <button
              type="button"
              onClick={() => {
                triggerSound();
                setIsToolsMenuOpen(!isToolsMenuOpen);
              }}
              title="Herramientas secundarias (WebForge, Notebook, Exportar, Dashboard, Info...)"
              aria-label="Más herramientas"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '6px 9px',
                minHeight: '32px',
                borderRadius: '8px',
                backgroundColor: isToolsMenuOpen ? 'rgba(0, 217, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: isToolsMenuOpen ? '1px solid rgba(0, 217, 255, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isToolsMenuOpen ? '#00D9FF' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <MoreHorizontal size={16} />
              <ChevronDown
                size={12}
                style={{
                  transform: isToolsMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            {isToolsMenuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 45, backgroundColor: 'transparent' }}
                  onClick={() => setIsToolsMenuOpen(false)}
                />
                <div
                  className="lyaxis-tools-popover"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '240px',
                    maxHeight: 'calc(100dvh - 80px)',
                    overflowY: 'auto',
                    backgroundColor: '#0a0a0f',
                    border: '1px solid #22222e',
                    borderRadius: '12px',
                    padding: '6px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.95), 0 0 20px rgba(0, 217, 255, 0.12)',
                    zIndex: 60,
                    backdropFilter: 'blur(16px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  <div style={{ padding: '6px 8px 4px', fontSize: '10px', fontWeight: 800, color: '#71717a', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: 'var(--lx-font-mono)' }}>
                    Herramientas LYAXIS
                  </div>

                  {/* 1. WebForge */}
                  <a
                    href="https://lyaxis-webforge.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsToolsMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(6, 182, 212, 0.08)',
                      border: '1px solid rgba(6, 182, 212, 0.25)',
                      color: '#06B6D4',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Globe size={15} color="#06B6D4" />
                    <span>LYAXIS WebForge</span>
                    <ArrowUpRight size={12} style={{ marginLeft: 'auto', opacity: 0.8 }} />
                  </a>

                  {/* 2. Cuaderno / Notebook Studio */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isNotebookOpen ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                      color: isNotebookOpen ? '#00D9FF' : '#f1f5f9',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isNotebookOpen ? 'rgba(0, 217, 255, 0.1)' : 'transparent'; }}
                  >
                    <BookOpen size={15} color="#00D9FF" />
                    <span>Cuaderno / Notebook Studio</span>
                  </button>

                  {/* 3. Auto-Router Inteligente */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerSound();
                      setIsAutoRouterActive((prev) => {
                        const next = !prev;
                        try { localStorage.setItem('lyaxis_auto_router', String(next)); } catch {}
                        return next;
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isAutoRouterActive ? 'rgba(0, 255, 102, 0.1)' : 'transparent',
                      color: isAutoRouterActive ? '#00FF66' : '#f1f5f9',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isAutoRouterActive ? 'rgba(0, 255, 102, 0.1)' : 'transparent'; }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <Zap size={15} color={isAutoRouterActive ? '#00FF66' : '#94a3b8'} />
                      <span>Auto-Router Neuronal</span>
                    </span>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: isAutoRouterActive ? '#00FF66' : '#71717a' }}>
                      {isAutoRouterActive ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  {/* 4. Exportar Conversación (PDF, Markdown, JSON — solo visible si hay mensajes) */}
                  {messages.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.07)', marginTop: '4px', paddingTop: '4px' }}>
                      <div style={{ padding: '4px 8px 2px', fontSize: '9.5px', fontWeight: 800, color: '#71717a', letterSpacing: '0.6px', textTransform: 'uppercase', fontFamily: 'var(--lx-font-mono)' }}>
                        Exportar Conversación
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          if (onExportPDF) onExportPDF('Conversación LYAXIS', meta.label, meta.color, messages);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '9px',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#f1f5f9',
                          fontSize: '12px',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <FileDown size={14} color="#00D9FF" />
                        <span>Documento PDF (.pdf)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          exportChatToMarkdown('Sesión LYAXIS', currentActiveModel, messages);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '9px',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#f1f5f9',
                          fontSize: '12px',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <FileText size={14} color="#10B981" />
                        <span>Markdown (.md)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          exportChatToJSON('Sesión LYAXIS', currentActiveModel, messages);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '9px',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#f1f5f9',
                          fontSize: '12px',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <FileCode size={14} color="#F59E0B" />
                        <span>Archivo JSON (.json)</span>
                      </button>
                    </div>
                  )}

                  {/* 5. Dashboard y Métricas */}
                  {onOpenDashboard && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        triggerSound();
                        onOpenDashboard();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#f1f5f9',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <LayoutDashboard size={15} color="#00D9FF" />
                      <span>Dashboard y Métricas</span>
                    </button>
                  )}

                  {/* 6. Manifiesto e Información */}
                  {onOpenInfoDrawer && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        triggerSound();
                        onOpenInfoDrawer('manifesto');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#f1f5f9',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Info size={15} color="#00D9FF" />
                      <span>Manifiesto e Información</span>
                    </button>
                  )}

                  {/* Bóveda de Prompts en el menú */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      triggerSound();
                      setIsPromptVaultOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#f1f5f9',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Bookmark size={15} color="#00D9FF" />
                    <span>Bóveda de Prompts</span>
                  </button>

                  {/* Accesos rápidos a Memoria y Audio si Sidebar está oculto o en móvil */}
                  {(!isSidebarOpen || isMobile) && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.07)', marginTop: '4px', paddingTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {onOpenDirectives && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            triggerSound();
                            onOpenDirectives();
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#f1f5f9',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <Sliders size={15} color="#00D9FF" />
                          <span>Memoria y Directivas</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          toggleSoundMute();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#f1f5f9',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          {isMuted ? <VolumeX size={15} color="#71717a" /> : <Volume2 size={15} color="#00D9FF" />}
                          <span>Sonido Cyber</span>
                        </span>
                        <span style={{ fontSize: '10px', color: isMuted ? '#71717a' : '#00D9FF', fontFamily: 'monospace' }}>
                          {isMuted ? 'MUTED' : 'ACTIVO'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Cerrar Sesión en menú si logueado en móvil */}
                  {isMobile && user && onLogout && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.07)', marginTop: '4px', paddingTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          triggerSound();
                          onLogout();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '9px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          color: '#f87171',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        <LogOut size={15} color="#f87171" />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* User Profile / Login Button — Always Visible on Right Edge */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || 'Usuario'}
                  title={user.name || user.email || 'Usuario'}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    border: '1px solid rgba(0, 217, 255, 0.45)',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  title={user.name || user.email || 'Usuario'}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 217, 255, 0.2)',
                    border: '1px solid rgba(0, 217, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#00D9FF',
                  }}
                >
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {!isMobile && onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    triggerSound();
                    onLogout();
                  }}
                  title="Cerrar sesión"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '8px',
                    color: '#EF4444',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={13} />
                </button>
              )}
            </div>
          ) : onOpenAuth ? (
            <button
              type="button"
              onClick={() => {
                triggerSound();
                onOpenAuth();
              }}
              title="Iniciar sesión"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                backgroundColor: 'rgba(0, 217, 255, 0.12)',
                border: '1px solid rgba(0, 217, 255, 0.35)',
                borderRadius: '8px',
                padding: '6px 10px',
                minHeight: '32px',
                color: '#00D9FF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <LogIn size={14} color="#00D9FF" />
              <span>Acceder</span>
            </button>
          ) : null}
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

      {/* Split-View Workspace Container: Chat Column + Optional Docked LiveCanvas */}
      <div style={{ display: 'flex', flex: '1 1 0%', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0%', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
      {/* Main Messages List or Quantum Studio Mission Control Empty State */}
      <div
        ref={messagesScrollRef}
        onScroll={handleChatScroll}
        className="lyaxis-chat-scroll-area"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          padding: isMobile ? '16px 12px' : '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          overscrollBehaviorY: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ maxWidth: '960px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
          {messages.length === 0 ? (
            /* 1. Mission Control Empty State v4: Emblema Reactivo + Quick Engine Pill Bar + Bento Cards */
            <div
              className="lyaxis-empty-state"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#71717a',
                gap: isMobile ? '16px' : '20px',
                textAlign: 'center',
                minHeight: '52vh',
                padding: '12px',
                animation: 'quantumReveal 0.42s var(--lx-ease-out) both',
              }}
            >
              {/* Emblem with multi-layer orbital ring (or Tri-Core Prism when TRIAD is active) */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  style={{
                    position: 'absolute',
                    width: '104px',
                    height: '104px',
                    borderRadius: '30px',
                    background: isTriadActive
                      ? 'radial-gradient(circle, rgba(192, 132, 252, 0.42) 0%, rgba(0, 217, 255, 0.18) 45%, transparent 72%)'
                      : `radial-gradient(circle, ${meta.color}66 0%, transparent 70%)`,
                    filter: 'blur(16px)',
                    animation: 'lyaxisPulse 2.8s infinite ease-in-out',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    width: '78px',
                    height: '78px',
                    borderRadius: '24px',
                    border: isTriadActive
                      ? '1px solid rgba(192, 132, 252, 0.38)'
                      : `1px solid ${meta.color}44`,
                    pointerEvents: 'none',
                  }}
                />
                <div
                  className="lyaxis-empty-emblem"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: isTriadActive
                      ? 'linear-gradient(135deg, #00D9FF 0%, #FF3366 50%, #C084FC 100%)'
                      : `linear-gradient(135deg, ${meta.color}, #00D9FF)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isTriadActive
                      ? '0 0 36px rgba(192, 132, 252, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.35)'
                      : `0 0 35px ${meta.color}77, 0 0 15px rgba(0, 217, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.32)`,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    position: 'relative',
                    zIndex: 1,
                    transition: 'all 0.35s var(--lx-ease-out)',
                  }}
                >
                  {isTriadActive ? <Zap size={30} color="#ffffff" /> : MODEL_ICONS[currentActiveModel]?.(30, '#ffffff')}
                </div>
              </div>

              {/* Title & Philosophy */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h1
                  className="lyaxis-empty-title lx-display"
                  style={{
                    fontSize: isMobile ? '27px' : '34px',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    background: isTriadActive
                      ? 'linear-gradient(90deg, #ffffff 0%, #67e8f9 45%, #e879f9 100%)'
                      : 'linear-gradient(to right, #ffffff, #e2e8f0, #67e8f9)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                    margin: '6px 0 4px 0',
                    display: 'inline-block',
                    textAlign: 'center',
                  }}
                >
                  {isTriadActive ? 'LYAXIS TRIAD™' : `LYAXIS ${meta.label}`}
                </h1>
                <div
                  style={{
                    height: '1px',
                    width: '140px',
                    margin: '8px auto',
                    background: `linear-gradient(to right, transparent, ${isTriadActive ? 'rgba(192, 132, 252, 0.55)' : `${meta.color}88`}, transparent)`,
                  }}
                />
                <p style={{ fontSize: '14px', maxWidth: '560px', margin: '4px auto 0', lineHeight: '1.6', color: '#94a3b8' }}>
                  {isTriadActive
                    ? 'Debate concurrente a 3 núcleos en tiempo real: Create (Zenith) ➔ Break (Phantom) ➔ Rebuild (Architect).'
                    : meta.description}
                </p>
              </div>

              {/* Quick Engine Pill Bar: Solo los 3 Principales (Speed, Cortex, Zenith) + Especialistas Ocultos */}
              <div
                role="tablist"
                aria-label="Selector de motores principales LYAXIS"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  maxWidth: '720px',
                }}
              >
                {/* 1. Solo a la vista los 3 Motores Principales */}
                {CORE_MODELS.map((mId) => {
                  const mMeta = MODEL_META[mId];
                  const isActivePill = !isTriadActive && currentActiveModel === mId;
                  return (
                    <button
                      key={mId}
                      type="button"
                      role="tab"
                      aria-selected={isActivePill}
                      disabled={isStreaming}
                      className={`lyaxis-engine-pill${isActivePill ? ' active' : ''}`}
                      style={{
                        '--lx-pill-color': mMeta.color,
                        padding: '7px 15px',
                        fontSize: '13px',
                      } as React.CSSProperties}
                      onClick={() => {
                        if (isTriadActive) {
                          setIsTriadActive(false);
                          try {
                            localStorage.setItem('lyaxis_triad_active', 'false');
                          } catch {}
                        }
                        handleModelSwitch(mId);
                      }}
                    >
                      {MODEL_ICONS[mId]?.(14, isActivePill ? '#ffffff' : mMeta.color)}
                      <span style={{ fontWeight: isActivePill ? 800 : 600 }}>{mMeta.label}</span>
                      <span className="lx-tabular" style={{ fontSize: '9.5px', opacity: 0.75, fontFamily: 'var(--lx-font-mono)' }}>
                        T:{mMeta.temperature}
                      </span>
                    </button>
                  );
                })}

                {/* 2. Si un especialista está activo, mostrarlo destacado al lado de los 3 */}
                {!CORE_MODELS.includes(currentActiveModel) && !isTriadActive && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={true}
                    disabled={isStreaming}
                    className="lyaxis-engine-pill active"
                    style={{
                      '--lx-pill-color': meta.color,
                      padding: '7px 15px',
                      fontSize: '13px',
                    } as React.CSSProperties}
                  >
                    {MODEL_ICONS[currentActiveModel]?.(14, '#ffffff')}
                    <span style={{ fontWeight: 800 }}>{meta.label}</span>
                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>
                      ESPECIALISTA
                    </span>
                  </button>
                )}

                {/* 3. Botón para desplegar / ocultar los 7 especialistas */}
                <button
                  type="button"
                  onClick={() => setShowEmptySpecialists((prev) => !prev)}
                  className={`lyaxis-engine-pill${showEmptySpecialists ? ' active' : ''}`}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: showEmptySpecialists ? 'rgba(0, 217, 255, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                    color: showEmptySpecialists ? '#00d9ff' : '#94a3b8',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  title="Ver u ocultar los 7 motores especializados de LYAXIS"
                >
                  <Sliders size={12} color={showEmptySpecialists ? '#00d9ff' : '#71717a'} />
                  <span>{showEmptySpecialists ? 'Ocultar Especialistas ▴' : '+ 7 Especialistas ▾'}</span>
                </button>
              </div>

              {/* Bento desplegable de los 7 Especialistas en Empty State */}
              {showEmptySpecialists && (
                <div className="lyaxis-specialists-bento">
                  {SPECIALIST_MODELS.map((sId) => {
                    const sMeta = MODEL_META[sId];
                    const isSel = !isTriadActive && currentActiveModel === sId;
                    return (
                      <button
                        key={sId}
                        type="button"
                        onClick={() => {
                          if (isTriadActive) {
                            setIsTriadActive(false);
                            try {
                              localStorage.setItem('lyaxis_triad_active', 'false');
                            } catch {}
                          }
                          handleModelSwitch(sId);
                        }}
                        className={`lyaxis-specialist-bento-card${isSel ? ' active' : ''}`}
                        style={{ '--lx-card-color': sMeta.color } as React.CSSProperties}
                      >
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '7px',
                            backgroundColor: `${sMeta.color}18`,
                            border: `1px solid ${sMeta.color}44`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {MODEL_ICONS[sId]?.(14, sMeta.color)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: isSel ? '#ffffff' : '#f1f5f9' }}>
                            {sMeta.label}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sMeta.tagline}
                          </span>
                        </div>
                        <span className="lx-tabular" style={{ fontSize: '9.5px', color: '#64748b', fontFamily: 'var(--lx-font-mono)' }}>
                          T:{sMeta.temperature}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Capability badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="lx-tabular" style={{ fontSize: '11px', fontWeight: 600, color: '#00D9FF', backgroundColor: 'rgba(0, 217, 255, 0.08)', border: '1px solid rgba(0, 217, 255, 0.25)', padding: '4px 11px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Zap size={11} /> Temperatura: {meta.temperature}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: meta.color, backgroundColor: `${meta.color}14`, border: `1px solid ${meta.color}40`, padding: '4px 11px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Shield size={11} /> Encriptación AES-256
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.28)', padding: '4px 11px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Cpu size={11} /> Gobernanza de Tokens Activa
                </span>
              </div>

              {/* 4 Bento Suggested Prompt Cards v4 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '700px',
                  marginTop: '6px',
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
                      backgroundColor: 'rgba(9, 13, 24, 0.78)',
                      border: `1px solid ${meta.color}30`,
                      borderRadius: '14px',
                      padding: isMobile ? '13px 15px' : '12px 16px',
                      minHeight: isMobile ? '58px' : '54px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#ffffff',
                      backdropFilter: 'blur(12px)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px -8px rgba(0, 0, 0, 0.65)',
                      transition: 'all 0.22s var(--lx-ease-out)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${meta.color}88`;
                      e.currentTarget.style.backgroundColor = 'rgba(14, 20, 36, 0.9)';
                      e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 10px 28px -6px rgba(0,0,0,0.75), 0 0 18px ${meta.color}24`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${meta.color}30`;
                      e.currentTarget.style.backgroundColor = 'rgba(9, 13, 24, 0.78)';
                      e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px -8px rgba(0, 0, 0, 0.65)';
                    }}
                  >
                    <div
                      style={{
                        width: isMobile ? '38px' : '34px',
                        height: isMobile ? '38px' : '34px',
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
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="lx-card-index">PROMPT 0{i + 1}</span>
                      <span
                        style={{
                          fontSize: isMobile ? '14px' : '13px',
                          lineHeight: '1.45',
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
                    <ChevronRight size={16} color="#71717a" className="lx-card-arrow" style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>

              {/* Status footer pill */}
              <div
                style={{
                  marginTop: '4px',
                  padding: '5px 14px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '10.5px',
                  fontFamily: 'var(--lx-font-mono)',
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
                onExportPDF={(title, label, color, msgs) => {
                  // Task 5: Zero-token PDF export using pre-rendered text via pdfExporter
                  exportChatToPDF(title, label, color, msgs);
                }}
                onOpenInNotebook={handleOpenInNotebook}
                onEditMessage={msg.role === 'user' ? (newContent) => handleEditMessage(idx, newContent) : undefined}
                onForkMessage={
                  onForkConversation
                    ? () => {
                        triggerSound();
                        onForkConversation(messages.slice(0, idx + 1));
                      }
                    : undefined
                }
                onAdoptTriadCore={(coreModel, coreText) => {
                  triggerSound();
                  setIsTriadActive(false);
                  try {
                    localStorage.setItem('lyaxis_triad_active', 'false');
                  } catch {}
                  handleModelSwitch(coreModel);
                  setMessages((prev) =>
                    prev.map((m, i) => (i === idx ? { ...m, content: coreText, model: coreModel } : m))
                  );
                  setRouterNotice(`⚡ Adoptado núcleo LYAXIS ${MODEL_META[coreModel]?.label || coreModel}`);
                  setTimeout(() => setRouterNotice(null), 4000);
                }}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area with Image Attachment & Nexus Suggestion (5. BARRA DE INPUT INFERIOR FLOTANTE v4) */}
      <div
        className="lyaxis-bottom-bar"
        style={{
          padding: isMobile ? '8px 12px calc(12px + env(safe-area-inset-bottom, 12px))' : '14px 24px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          backgroundColor: 'rgba(6, 9, 18, 0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'sticky',
          bottom: 0,
          zIndex: 40,
          flexShrink: 0,
        }}
      >
        {showScrollBottom && (
          <button
            type="button"
            className="lyaxis-scroll-bottom-pill"
            onClick={scrollToBottomSmooth}
            title="Desplazarse suavemente al último mensaje"
          >
            {isStreaming && <span className="live-dot" />}
            <span>{isStreaming ? 'En vivo · Ir al final' : 'Volver al final'}</span>
            <ArrowDown size={13} />
          </button>
        )}
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

          {/* Attached Code/Text Files Chips (Multi-file up to 5) */}
          {attachedFiles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {attachedFiles.map((fileItem, fIdx) => (
                <div
                  key={`${fileItem.name}-${fIdx}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0, 217, 255, 0.1)',
                    border: '1px solid rgba(0, 217, 255, 0.4)',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.7), 0 0 12px rgba(0, 217, 255, 0.15)',
                    animation: 'fadeIn 0.2s ease-out',
                    color: '#00d9ff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <FileCode size={15} color="#00D9FF" />
                  <span>{fileItem.name}</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>({fileItem.size})</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== fIdx))}
                    title="Eliminar archivo adjunto"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      marginLeft: '4px',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Router Notice Toast */}
          {routerNotice && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                marginBottom: '8px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 255, 102, 0.12)',
                border: '1px solid rgba(0, 255, 102, 0.4)',
                boxShadow: '0 0 15px rgba(0, 255, 102, 0.2)',
                gap: '10px',
                animation: 'fadeIn 0.25s ease-out',
                color: '#86efac',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={14} color="#00FF66" />
                <span>{routerNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setRouterNotice(null)}
                style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer', display: 'flex' }}
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Conditional helper bar: Continuar button & live token estimator */}
          {((!isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'model' && (messages[messages.length - 1]?.content?.length || 0) > 2600 && !inputValue.trim()) || (inputValue.trim().length > 0 || attachedFiles.length > 0)) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                marginBottom: '6px',
                padding: '0 4px',
              }}
            >
              {!isStreaming &&
                messages.length > 0 &&
                messages[messages.length - 1]?.role === 'model' &&
                (messages[messages.length - 1]?.content?.length || 0) > 2600 &&
                !inputValue.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSend('Continúa exactamente desde donde te quedaste sin repetir lo anterior.')}
                    title="Continuar respuesta desde el punto exacto donde terminó"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 9px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 217, 255, 0.1)',
                      border: '1px solid rgba(0, 217, 255, 0.35)',
                      color: '#00D9FF',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>Continuar ➔</span>
                  </button>
                )}

              {(inputValue.trim().length > 0 || attachedFiles.length > 0) && (
                <span
                  className="lx-tabular"
                  title="Estimación de tokens de entrada para este mensaje"
                  style={{
                    fontSize: '10.5px',
                    fontFamily: 'var(--lx-font-mono)',
                    color: '#94a3b8',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ~{Math.max(1, Math.ceil((inputValue.length + attachedFiles.reduce((acc, f) => acc + f.content.length, 0)) / 4))} tok
                </span>
              )}
            </div>
          )}

          {/* Floating Slash Commands Palette */}
          {filteredCommands.length > 0 && (
            <div
              style={{
                marginBottom: '10px',
                borderRadius: '12px',
                backgroundColor: 'rgba(8, 11, 18, 0.98)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                boxShadow: '0 0 30px rgba(0, 217, 255, 0.15), 0 10px 25px rgba(0,0,0,0.9)',
                overflow: 'hidden',
                animation: 'slideUpFade 0.2s ease-out',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div
                style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(0, 217, 255, 0.05)',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#00d9ff', letterSpacing: '0.4px', fontFamily: 'monospace' }}>
                  // COMANDOS RÁPIDOS LYAXIS
                </span>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Haz clic o presiona Enter
                </span>
              </div>
              <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '6px', WebkitOverflowScrolling: 'touch' }}>
                {filteredCommands.map((item, idx) => {
                  const isHighlighted = idx === slashSelectedIndex;
                  return (
                    <button
                      key={item.cmd}
                      type="button"
                      onClick={() => {
                        item.action();
                        setInputValue('');
                        triggerSound();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMobile ? '10px 12px' : '8px 12px',
                        borderRadius: '8px',
                        border: isHighlighted ? '1px solid rgba(0, 217, 255, 0.45)' : '1px solid transparent',
                        backgroundColor: isHighlighted ? 'rgba(0, 217, 255, 0.14)' : 'transparent',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        gap: '10px',
                      }}
                      onMouseEnter={() => setSlashSelectedIndex(idx)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'monospace', color: '#00d9ff', fontWeight: 700, fontSize: '13px' }}>
                          {item.cmd}
                        </span>
                        <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{item.label}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textAlign: 'right',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real-time Streaming Telemetry Badge (tokens reales verificados por el backend al cerrar el stream) */}
          {streamingTelemetry && (
            <div
              className="lx-tabular"
              title={
                streamingTelemetry.verified
                  ? `Tokens reales reportados por el backend${streamingTelemetry.modelUsed ? ` · ${streamingTelemetry.modelUsed}` : ''}`
                  : 'Estimación en vivo durante la transmisión'
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: streamingTelemetry.verified ? 'rgba(16, 185, 129, 0.07)' : 'rgba(0, 217, 255, 0.07)',
                border: streamingTelemetry.verified ? '1px solid rgba(16, 185, 129, 0.28)' : '1px solid rgba(0, 217, 255, 0.22)',
                fontSize: '11px',
                fontFamily: 'var(--lx-font-mono)',
                color: '#a5f3fc',
                width: 'fit-content',
                maxWidth: '100%',
                flexWrap: 'wrap',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 700 }}>
                <Zap size={12} color="#10b981" />
                {streamingTelemetry.tps > 0 ? `${streamingTelemetry.tps} t/s` : 'instantáneo'}
              </span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>{(streamingTelemetry.durationMs / 1000).toFixed(1)}s</span>
              <span style={{ opacity: 0.4 }}>•</span>
              {streamingTelemetry.verified ? (
                <span style={{ color: '#34d399', fontWeight: 700 }}>
                  ✓ {streamingTelemetry.tokenCount.toLocaleString('es-MX')} tokens reales
                  <span style={{ color: '#94a3b8', fontWeight: 500 }}>
                    {' '}({(streamingTelemetry.promptTokens || 0).toLocaleString('es-MX')} in · {(streamingTelemetry.completionTokens || 0).toLocaleString('es-MX')} out)
                  </span>
                </span>
              ) : (
                <span>~{streamingTelemetry.tokenCount.toLocaleString('es-MX')} tokens est.</span>
              )}
              <span style={{ opacity: 0.4 }}>•</span>
              <span style={{ color: currentTheme.primary, fontWeight: 700 }}>LYAXIS {meta.label}</span>
            </div>
          )}

          {/* Input Bar with Dynamic Chromatic Focus Glow and Specular Obsidian Glass (Command Dock v4) */}
          <div
            className={isTriadActive ? 'lyaxis-triad-active-box' : ''}
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              backgroundColor: 'rgba(9, 13, 24, 0.88)',
              border: isTriadActive
                ? '1px solid transparent'
                : `1px solid ${selectedImage ? currentTheme.primary + '88' : isInputFocused ? currentTheme.primary + '90' : currentTheme.primary + '36'}`,
              borderRadius: '16px',
              padding: isMobile ? '8px 10px' : '11px 15px',
              gap: '10px',
              boxShadow: isTriadActive
                ? undefined
                : isInputFocused
                  ? `inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 12px 32px -6px rgba(0, 0, 0, 0.88), 0 0 26px ${currentTheme.glow}`
                  : `inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px -6px rgba(0, 0, 0, 0.8), 0 0 10px ${currentTheme.glow}`,
              transition: 'all 0.28s var(--lx-ease-out)',
            }}
          >
            {/* Hidden File Input (supports multiple files up to 5) */}
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.txt,.py,.js,.ts,.tsx,.json,.md,.html,.css,.csv,.sql,.sh,.c,.cpp"
              style={{ display: 'none' }}
            />

            {/* Paperclip Button for Multimodal Image & Multi-Document Attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar imagen o hasta 5 documentos (.py, .ts, .json, .md, .png, etc.)"
              style={{
                width: isMobile ? '44px' : '36px',
                height: isMobile ? '44px' : '36px',
                minWidth: isMobile ? '44px' : '36px',
                borderRadius: '10px',
                backgroundColor: selectedImage || attachedFiles.length > 0 ? 'rgba(0, 217, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: selectedImage || attachedFiles.length > 0 ? '1px solid #00D9FF' : '1px solid rgba(255, 255, 255, 0.1)',
                color: selectedImage || attachedFiles.length > 0 ? '#00D9FF' : '#a1a1aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                boxShadow: selectedImage || attachedFiles.length > 0 ? '0 0 12px rgba(0, 217, 255, 0.3)' : 'none',
              }}
            >
              <Paperclip size={18} />
            </button>

            {/* Toggle compacto de TRIAD dentro del Input Dock */}
            <button
              type="button"
              onClick={toggleTriad}
              disabled={triadRemaining === 0 && !isTriadActive}
              title={
                triadRemaining === 0
                  ? `Cuota de LYAXIS TRIAD™ agotada (0/3). ${triadTimeFormatted}.`
                  : isTriadCooldown
                  ? `⏳ Enfriamiento de TRIAD activo (${triadCooldownFormatted}).`
                  : `LYAXIS TRIAD™ [${triadRemaining}/3] · ${isTriadActive ? 'Desactivar modo 3 núcleos' : 'Activar debate concurrente Create ➔ Break ➔ Rebuild'}`
              }
              style={{
                width: isMobile ? '44px' : '36px',
                height: isMobile ? '44px' : '36px',
                minWidth: isMobile ? '44px' : '36px',
                borderRadius: '10px',
                backgroundColor: isTriadActive
                  ? (isTriadCooldown ? 'rgba(245, 158, 11, 0.25)' : 'rgba(124, 58, 237, 0.25)')
                  : triadRemaining === 0
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: isTriadActive
                  ? (isTriadCooldown ? '1px solid #f59e0b' : '1px solid #7C3AED')
                  : triadRemaining === 0
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                color: isTriadActive
                  ? (isTriadCooldown ? '#fbbf24' : '#c084fc')
                  : triadRemaining === 0
                  ? '#f87171'
                  : '#71717a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: triadRemaining === 0 && !isTriadActive ? 'not-allowed' : 'pointer',
                boxShadow: isTriadActive ? '0 0 12px rgba(124, 58, 237, 0.4)' : 'none',
                flexShrink: 0,
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
            >
              <Zap size={15} />
              <span style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '8px', fontWeight: 800, fontFamily: 'monospace' }}>
                {triadRemaining}
              </span>
            </button>

            {/* Prompt Vault Button */}
            <button
              type="button"
              onClick={() => {
                triggerSound();
                setIsPromptVaultOpen(true);
              }}
              title="Bóveda de Prompts Reutilizables (/vault)"
              style={{
                width: isMobile ? '44px' : '36px',
                height: isMobile ? '44px' : '36px',
                minWidth: isMobile ? '44px' : '36px',
                borderRadius: '10px',
                backgroundColor: isPromptVaultOpen ? 'rgba(0, 217, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: isPromptVaultOpen ? '1px solid #00D9FF' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isPromptVaultOpen ? '#00D9FF' : '#a1a1aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              <Bookmark size={16} />
            </button>

            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsInputFocused(true);
                if (typeof window !== 'undefined' && window.scrollY !== 0) {
                  window.scrollTo(0, 0);
                }
              }}
              onBlur={() => setIsInputFocused(false)}
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

            {/* Enhance Prompt Button (Architect Wand) */}
            {inputValue.trim().length > 0 && !isStreaming && (
              <button
                type="button"
                onClick={handleEnhancePrompt}
                title="Optimizar prompt con el protocolo Architect"
                style={{
                  width: isMobile ? '44px' : '36px',
                  height: isMobile ? '44px' : '36px',
                  minWidth: isMobile ? '44px' : '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)',
                }}
              >
                <Wand2 size={16} />
              </button>
            )}

            {/* Microphone Voice Dictation Button */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              title={isListening ? 'Detener dictado por voz' : 'Dictar por voz (Español)'}
              style={{
                width: isMobile ? '44px' : '36px',
                height: isMobile ? '44px' : '36px',
                minWidth: isMobile ? '44px' : '36px',
                borderRadius: '10px',
                backgroundColor: isListening ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                border: isListening ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isListening ? '#ef4444' : '#a1a1aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                boxShadow: isListening ? '0 0 14px rgba(239, 68, 68, 0.5)' : 'none',
              }}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

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
                disabled={!inputValue.trim() && !selectedImage && attachedFiles.length === 0}
                title="Enviar mensaje"
                style={{
                  width: isMobile ? '44px' : '36px',
                  height: isMobile ? '44px' : '36px',
                  minWidth: isMobile ? '44px' : '36px',
                  borderRadius: '10px',
                  backgroundColor: isTriadActive
                    ? ((inputValue.trim() || selectedImage || attachedFiles.length > 0) ? '#7C3AED' : '#1c1c24')
                    : ((inputValue.trim() || selectedImage || attachedFiles.length > 0) ? currentTheme.primary : '#1c1c24'),
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (inputValue.trim() || selectedImage || attachedFiles.length > 0) ? 'pointer' : 'default',
                  flexShrink: 0,
                  boxShadow: (inputValue.trim() || selectedImage || attachedFiles.length > 0) 
                    ? (isTriadActive ? '0 0 16px rgba(124, 58, 237, 0.5)' : `0 0 16px ${currentTheme.primary}55`) 
                    : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </form>
      </div>
        </div>

        {/* Docked Right-Hand Split Canvas Workspace (Desktop) or Fullscreen Overlay (Mobile) */}
        {splitCanvasData && (
          <div
            style={
              isMobile
                ? {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99990,
                    backgroundColor: '#050811',
                  }
                : {
                    width: '45%',
                    minWidth: '360px',
                    maxWidth: '720px',
                    height: '100%',
                    flexShrink: 0,
                    borderLeft: '1px solid rgba(0, 217, 255, 0.22)',
                    animation: 'fadeIn 0.2s ease-out',
                  }
            }
          >
            <LiveCanvasWorkspace
              isOpen={true}
              onClose={() => setSplitCanvasData(null)}
              code={splitCanvasData.code}
              language={splitCanvasData.language}
              title={splitCanvasData.title}
              accentColor={meta.color}
            />
          </div>
        )}
      </div>

      {/* LYAXIS NOTEBOOK STUDIO VISOR / DRAWER (Lazy-loaded) */}
      {isNotebookOpen && (
        <Suspense fallback={null}>
          <NotebookStudio
            isOpen={isNotebookOpen}
            onClose={() => setIsNotebookOpen(false)}
            initialContent={notebookContent}
            initialTitle={notebookTitle}
            activeModel={currentActiveModel}
            isMobile={isMobile}
          />
        </Suspense>
      )}

      {/* Modal Glassmorphic Dark Void (#050505) — Alerta de Cuota LYAXIS TRIAD™ */}
      <TriadQuotaModal
        isOpen={isTriadQuotaModalOpen}
        onClose={() => setIsTriadQuotaModalOpen(false)}
        triadTimeFormatted={triadTimeFormatted}
        onContinueWithSpeed={() => {
          handleModelSwitch('speed');
          setIsTriadActive(false);
          setIsTriadQuotaModalOpen(false);
          triggerSound();
        }}
      />

      {/* Bóveda de Prompts Reutilizables */}
      <PromptVaultModal
        isOpen={isPromptVaultOpen}
        onClose={() => setIsPromptVaultOpen(false)}
        accentColor={meta.color}
        onSelectPrompt={(promptText) => {
          setInputValue(promptText);
          triggerSound();
          setTimeout(() => textareaRef.current?.focus(), 60);
        }}
      />
    </div>
  );
};

export default ChatView;
