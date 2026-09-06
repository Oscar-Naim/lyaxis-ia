import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Send, Square, Sparkles, Brain, Compass, Plus, Trash2, Terminal, Home, Volume2, VolumeX, ChevronDown, ChevronRight, Cpu, LogOut, LogIn, Menu, X, Copy, Check, Zap, Code2, BookOpen, Lightbulb, Activity, MessageCircle, Crosshair, Waypoints, Flame, Network, Shield, Palette, PanelLeft, PanelLeftClose, Hammer, GraduationCap, FileDown, Presentation, AlertTriangle, RefreshCw, Paperclip } from 'lucide-react';
import { exportChatToPDF } from './pdfExporter';
import { InstallPwaPrompt } from './InstallPwaPrompt';
import { SlideDeckViewer } from './SlideDeckViewer';
import type { ModelType, ModelId } from './types';
import { ALL_MODELS, MODEL_META } from './config';

const MODEL_PROMPTS: Record<ModelType, { icon: React.ReactNode; bg: string; border: string; text: string }[]> = {
  speed: [
    { icon: <Code2 size={16} color="#2563FF" />, bg: 'rgba(37, 99, 255, 0.12)', border: 'rgba(37, 99, 255, 0.25)', text: 'Crea un hook de debounce en React' },
    { icon: <Terminal size={16} color="#00D9FF" />, bg: 'rgba(0, 217, 255, 0.12)', border: 'rgba(0, 217, 255, 0.25)', text: 'Script en Python para renombrar archivos por fecha' },
    { icon: <Zap size={16} color="#2563FF" />, bg: 'rgba(37, 99, 255, 0.12)', border: 'rgba(37, 99, 255, 0.25)', text: 'Optimiza esta consulta SQL' },
    { icon: <Lightbulb size={16} color="#00D9FF" />, bg: 'rgba(0, 217, 255, 0.12)', border: 'rgba(0, 217, 255, 0.25)', text: 'Explícame la diferencia entre let y const' },
  ],
  cortex: [
    { icon: <Brain size={16} color="#7C3AED" />, bg: 'rgba(124, 58, 237, 0.12)', border: 'rgba(124, 58, 237, 0.25)', text: 'Analiza la complejidad de Dijkstra vs A*' },
    { icon: <Cpu size={16} color="#a78bfa" />, bg: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.25)', text: 'Resuelve el problema de la mochila (Knapsack) con DP' },
    { icon: <Network size={16} color="#7C3AED" />, bg: 'rgba(124, 58, 237, 0.12)', border: 'rgba(124, 58, 237, 0.25)', text: 'Diseña la arquitectura para un chat WebSocket distribuido' },
    { icon: <Sparkles size={16} color="#c084fc" />, bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.25)', text: 'Demuestra formalmente por qué QuickSort es O(n log n)' },
  ],
  architect: [
    { icon: <Compass size={16} color="#10B981" />, bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)', text: 'Diseña un System Prompt para un agente autónomo de soporte' },
    { icon: <Code2 size={16} color="#34d399" />, bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.25)', text: 'Explica el patrón Observer con un ejemplo práctico en TypeScript' },
    { icon: <BookOpen size={16} color="#10B981" />, bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)', text: 'Estructura un prompt con few-shot examples para clasificación' },
    { icon: <Shield size={16} color="#6ee7b7" />, bg: 'rgba(110, 231, 183, 0.12)', border: 'rgba(110, 231, 183, 0.25)', text: '¿Cuáles son los 5 antipatrones más comunes al diseñar prompts?' },
  ],
  classic: [
    { icon: <Lightbulb size={16} color="#F59E0B" />, bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', text: '¿Cuáles son las mejores técnicas de gestión de tiempo para devs?' },
    { icon: <MessageCircle size={16} color="#fbbf24" />, bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.25)', text: 'Ayúdame a redactar un correo profesional convincente' },
    { icon: <BookOpen size={16} color="#F59E0B" />, bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', text: 'Crea un plan de estudio estructurado de 30 días para aprender Rust' },
    { icon: <Sparkles size={16} color="#fcd34d" />, bg: 'rgba(252, 211, 77, 0.12)', border: 'rgba(252, 211, 77, 0.25)', text: 'Recomiéndame 5 libros que cambien mi perspectiva sobre sistemas' },
  ],
  phantom: [
    { icon: <Crosshair size={16} color="#EF4444" />, bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', text: 'Audita este login contra inyecciones SQL y XSS' },
    { icon: <Zap size={16} color="#f87171" />, bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.25)', text: 'Encuentra fugas de memoria en este bucle de Node.js' },
    { icon: <Flame size={16} color="#EF4444" />, bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', text: 'Deconstruye este script y dime sus 3 peores fallos' },
    { icon: <Shield size={16} color="#fca5a5" />, bg: 'rgba(252, 165, 165, 0.12)', border: 'rgba(252, 165, 165, 0.25)', text: 'Stress-test a esta lógica de autenticación JWT' },
  ],
  nexus: [
    { icon: <Waypoints size={16} color="#EC4899" />, bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.25)', text: 'Sube un diagrama o imagen para analizar su estructura' },
    { icon: <Palette size={16} color="#f472b6" />, bg: 'rgba(244, 114, 182, 0.12)', border: 'rgba(244, 114, 182, 0.25)', text: 'Combina conceptos de biología y desarrollo de software' },
    { icon: <Sparkles size={16} color="#EC4899" />, bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.25)', text: 'Escribe un ensayo de ciencia ficción cyberpunk' },
    { icon: <Lightbulb size={16} color="#f9a8d4" />, bg: 'rgba(249, 168, 212, 0.12)', border: 'rgba(249, 168, 212, 0.25)', text: 'Analiza este wireframe y sugiere mejoras de UX' },
  ],
  forge: [
    { icon: <Hammer size={16} color="#F97316" />, bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.25)', text: 'Aterriza esta idea de SaaS en un MVP de 1 fin de semana' },
    { icon: <Lightbulb size={16} color="#fb923c" />, bg: 'rgba(251, 146, 60, 0.12)', border: 'rgba(251, 146, 60, 0.25)', text: 'Estructura el modelo de negocio freemium para una app' },
    { icon: <Waypoints size={16} color="#F97316" />, bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.25)', text: 'Diseña el funnel de conversión para desarrolladores' },
    { icon: <Compass size={16} color="#fdba74" />, bg: 'rgba(253, 186, 116, 0.12)', border: 'rgba(253, 186, 116, 0.25)', text: '¿Cuál es la stack mínima viable para validar esta idea?' },
  ],
  magister: [
    { icon: <GraduationCap size={16} color="#06B6D4" />, bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.25)', text: 'Diseña una secuencia didáctica con enfoque NEM' },
    { icon: <BookOpen size={16} color="#22d3ee" />, bg: 'rgba(34, 211, 238, 0.12)', border: 'rgba(34, 211, 238, 0.25)', text: 'Crea una rúbrica de evaluación formativa para secundaria' },
    { icon: <Sparkles size={16} color="#06B6D4" />, bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.25)', text: 'Explica el concepto de derivadas con una analogía cotidiana' },
    { icon: <Compass size={16} color="#67e8f9" />, bg: 'rgba(103, 232, 249, 0.12)', border: 'rgba(103, 232, 249, 0.25)', text: 'Diseña un reactivo tipo examen con distractores justificados' },
  ],
  root: [
    { icon: <Palette size={16} color="#00FF66" />, bg: 'rgba(0, 255, 102, 0.12)', border: 'rgba(0, 255, 102, 0.25)', text: 'Diseña una interfaz web futurista en React con animaciones en CSS puro' },
    { icon: <Code2 size={16} color="#00FF66" />, bg: 'rgba(0, 255, 102, 0.12)', border: 'rgba(0, 255, 102, 0.25)', text: 'Crea un backend asíncrono con FastAPI y SQLite con pool de conexiones' },
    { icon: <Terminal size={16} color="#00FF66" />, bg: 'rgba(0, 255, 102, 0.12)', border: 'rgba(0, 255, 102, 0.25)', text: 'Implementa una cola de tareas distribuida en Python desde cero' },
    { icon: <Zap size={16} color="#00FF66" />, bg: 'rgba(0, 255, 102, 0.12)', border: 'rgba(0, 255, 102, 0.25)', text: 'Escribe un parser AST en TypeScript para un mini lenguaje' },
  ],
};



import type { Message, Conversation, User } from './types';
import { useSSEStream } from './useSSEStream';
import { CodeBlock } from './CodeBlock';
import { LandingPage } from './LandingPage';
import { AuthModal } from './AuthModal';
import { FuturisticDashboardModal } from './FuturisticDashboardModal';
import { LyaxisInfoDrawer } from './LyaxisInfoDrawer';
import { API_BASE, GOOGLE_CLIENT_ID } from './config';

import { MessageBubble } from './MessageBubble';
import { NotebookStudio } from './NotebookStudio';
import { BootSplash } from './components/BootSplash';
import { isSoundMuted, setSoundMuted, playCyberClick } from './sound';

const ThinkingAccordion: React.FC<{ thoughtText: string }> = ({ thoughtText }) => {
  const [isOpen, setIsOpen] = useState(true);
  if (!thoughtText || !thoughtText.trim()) return null;

  return (
    <div style={{ margin: '0 0 14px 0', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(124, 58, 237, 0.35)', backgroundColor: 'rgba(12, 8, 20, 0.7)', boxShadow: '0 0 18px rgba(124, 58, 237, 0.15)' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', backgroundColor: 'rgba(124, 58, 237, 0.12)', border: 'none', color: '#c084fc', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Cpu size={14} color="#c084fc" />
          <span>Proceso de Razonamiento Profundo (Cortex)</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {isOpen && (
        <div style={{ padding: '12px 16px', fontSize: '12.5px', color: '#a1a1aa', borderTop: '1px solid rgba(124, 58, 237, 0.2)', lineHeight: '1.55', whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace" }}>
          {thoughtText}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'landing' | 'chat'>('chat');
  const [showBoot, setShowBoot] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('lyaxis_boot_seen') !== 'true' : false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window === 'undefined' ? true : window.innerWidth >= 768);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [infoDrawerTab, setInfoDrawerTab] = useState<'manifesto' | 'ecosystem' | 'security' | 'terms'>('manifesto');

  const openInfoDrawer = (tab: 'manifesto' | 'ecosystem' | 'security' | 'terms' = 'manifesto') => {
    setInfoDrawerTab(tab);
    setIsInfoDrawerOpen(true);
    if (soundEnabled) playCyberClick();
  };

  const [user, setUser] = useState<User | null>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('lyaxis_user') : null;
    return saved ? JSON.parse(saved) : null;
  });

  const [guestId] = useState<string>(() => {
    if (typeof window === 'undefined') return `guest-${Date.now()}`;
    let saved = localStorage.getItem('lyaxis_guest_id');
    if (!saved) {
      saved = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('lyaxis_guest_id', saved);
    }
    return saved;
  });

  const activeUserId = user?.id || guestId;

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('lyaxis_conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lyaxis_conversations', JSON.stringify(conversations));
    } catch (e) {}
  }, [conversations]);

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lyaxis_selected_model');
      if (saved && (ALL_MODELS as readonly string[]).includes(saved)) {
        return saved as ModelId;
      }
    }
    return 'classic';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lyaxis_selected_model', selectedModel);
    } catch (e) {}
  }, [selectedModel]);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      try {
        localStorage.setItem(`lyaxis_msgs_${currentChatId}`, JSON.stringify(messages));
      } catch (e) {}
    }
  }, [currentChatId, messages]);

  // Track last active conversation per model for workspace-per-model behavior
  const [lastChatPerModel, setLastChatPerModel] = useState<Partial<Record<ModelType, string | null>>>(() => {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem('lyaxis_last_chat_per_model');
    return saved ? JSON.parse(saved) : {};
  });

  // Persist lastChatPerModel to localStorage
  const updateLastChatPerModel = (model: ModelType, chatId: string | null) => {
    setLastChatPerModel(prev => {
      const next = { ...prev, [model]: chatId };
      localStorage.setItem('lyaxis_last_chat_per_model', JSON.stringify(next));
      return next;
    });
  };
  const [inputValue, setInputValue] = useState('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? !isSoundMuted() : true;
  });
  const [showNexusSuggestion, setShowNexusSuggestion] = useState(false);

  // LYAXIS TRIAD™ Mode State
  const [isTriadActive, setIsTriadActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lyaxis_triad_active') === 'true';
    } catch {
      return false;
    }
  });

  const toggleTriad = () => {
    if (soundEnabled) playCyberClick();
    setIsTriadActive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lyaxis_triad_active', String(next));
      } catch {}
      return next;
    });
  };

  const [serverErrorBanner, setServerErrorBanner] = useState<string | null>(null);
  const [lastFailedUserText, setLastFailedUserText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus textarea ready to write immediately
    textareaRef.current?.focus();
  }, []);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [notebookContent, setNotebookContent] = useState('');
  const [notebookTitle, setNotebookTitle] = useState('Cuaderno LYAXIS');

  const handleOpenInNotebook = (content: string, model?: ModelType) => {
    if (soundEnabled) playCyberClick();
    setNotebookContent(content);
    const targetModel = model || selectedModel;
    const label = getModelLabel(targetModel);
    setNotebookTitle(`Apuntes ${label} • ${new Date().toLocaleDateString('es-MX')}`);
    setIsNotebookOpen(true);
  };

  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage(result);
      if (selectedModel !== 'nexus') {
        setShowNexusSuggestion(true);
      }
      if (soundEnabled) playCyberClick();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [inputValue]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSound = () => {
    const currentMuted = isSoundMuted();
    const nextMuted = !currentMuted;
    setSoundMuted(nextMuted);
    setSoundEnabled(!nextMuted);
    if (!nextMuted) playCyberClick();
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('lyaxis_user', JSON.stringify(loggedInUser));
    fetchConversations(loggedInUser.id);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lyaxis_user');
    fetchConversations(guestId);
  };

  const { isStreaming, sendMessage, startStream, stopStreaming } = useSSEStream({
    onDone: () => {
      fetchConversations(user?.id || 'anon');
    },
    onError: (err) => {
      const friendly = '⚠️ El servidor tardó en responder o está iniciando. Por favor, reintenta en unos segundos.';
      const rawMsg = err?.message || '';
      const bannerMsg = (rawMsg.includes('502') || rawMsg.includes('504') || rawMsg.includes('TIMEOUT') || rawMsg.includes('servidor') || rawMsg.includes('fetch') || rawMsg.includes('Failed'))
        ? friendly
        : (rawMsg || friendly);
      setServerErrorBanner(bannerMsg);
      setMessages((prev) => prev.filter((m) => !(m.role === 'model' && (!m.content || !m.content.trim()))));
    }
  });

  const fetchConversations = async (targetUserId?: string) => {
    try {
      const uid = targetUserId !== undefined ? targetUserId : (user?.id || 'anon');
      const url = `${API_BASE}/api/v1/conversations?user_id=${encodeURIComponent(uid)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const loaded = data.map((c: any) => ({
            id: c.id,
            userId: c.user_id || uid,
            title: c.title || 'Nueva conversación',
            createdAt: c.created_at || new Date().toISOString(),
            model: c.model || 'classic'
          }));
          setConversations(loaded);
          setCurrentChatId((curr) => {
            if (!curr && loaded.length > 0) {
              loadMessages(loaded[0].id);
              setSelectedModel(loaded[0].model || 'classic');
              return loaded[0].id;
            }
            return curr;
          });
        }
      }
    } catch (e) {
      console.warn("Aviso cargando conversaciones:", e);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const saved = localStorage.getItem(`lyaxis_msgs_${chatId}`);
      if (saved) {
        setMessages(JSON.parse(saved));
      }
      const res = await fetch(`${API_BASE}/api/v1/conversations/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
          localStorage.setItem(`lyaxis_msgs_${chatId}`, JSON.stringify(data));
        }
      }
    } catch (e) {
      console.warn("Aviso cargando mensajes:", e);
    }
  };

  useEffect(() => {
    fetchConversations(user?.id || 'anon');
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (chat: Conversation) => {
    if (isStreaming) return;
    setCurrentChatId(chat.id);
    // Keep sidebar selection without overriding model — user controls model from header
    updateLastChatPerModel(chat.model || 'classic', chat.id);
    loadMessages(chat.id);
    if (isMobile) setIsSidebarOpen(false);
  };

  const [isScanlineActive, setIsScanlineActive] = useState(false);
  const [isChromaticActive, setIsChromaticActive] = useState(false);

  // Switch model in-chat (persisting model for current conversation without resetting)
  const switchModel = async (newModel: ModelType) => {
    if (isStreaming || newModel === selectedModel) return;
    if (soundEnabled) playCyberClick();
    setIsScanlineActive(true);
    setIsChromaticActive(true);
    setTimeout(() => setIsScanlineActive(false), 750);
    setTimeout(() => setIsChromaticActive(false), 450);

    setSelectedModel(newModel);
    if (newModel === 'nexus') {
      setShowNexusSuggestion(false);
    }

    // If there is an active conversation, update its model without clearing messages
    if (currentChatId) {
      setConversations((prev) =>
        prev.map((c) => (c.id === currentChatId ? { ...c, model: newModel } : c))
      );
      try {
        await fetch(`${API_BASE}/api/v1/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentChatId,
            user_id: user?.id || 'anon',
            model: newModel
          })
        });
      } catch (err) {
        console.warn('Aviso actualizando modelo de conversación:', err);
      }
    }
  };

  const handleNewConversation = async (modelOverride?: ModelType) => {
    if (isStreaming) return;
    const cid = `chat-${Date.now()}`;
    const modelToUse = modelOverride || selectedModel;
    const uid = user?.id || 'anon';
    const newChat: Conversation = {
      id: cid,
      userId: uid,
      title: 'Nueva conversación',
      createdAt: new Date().toISOString(),
      model: modelToUse
    };
    setConversations((prev) => [newChat, ...prev.filter((c) => c.id !== cid)]);
    setCurrentChatId(cid);
    setMessages([]);
    if (isMobile) setIsSidebarOpen(false);

    try {
      await fetch(`${API_BASE}/api/v1/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cid,
          user_id: uid,
          title: 'Nueva conversación',
          model: modelToUse
        })
      });
    } catch (err) {
      console.warn("Aviso persistiendo conversación en backend:", err);
    }
  };

  const handleStartChat = handleNewConversation;
  const createNewChat = handleNewConversation;

  const handleDeleteConversation = async (chatId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/v1/conversations/${chatId}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Error eliminando conversación en backend:", err);
    }
    const updated = conversations.filter((c) => c.id !== chatId);
    setConversations(updated);
    if (currentChatId === chatId) {
      if (updated.length > 0) {
        selectConversation(updated[0]);
      } else {
        handleNewConversation();
      }
    }
  };

  const deleteConversation = handleDeleteConversation;

  const onUpdateTitle = async (chatId: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
    );
    try {
      await fetch(`${API_BASE}/api/v1/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chatId,
          user_id: user?.id || 'anon',
          title: newTitle,
          model: selectedModel
        })
      });
    } catch (err) {
      console.warn("Aviso actualizando título en backend:", err);
    }
  };

  const deleteAllConversations = async () => {
    if (isStreaming) return;
    try {
      await fetch(`${API_BASE}/api/v1/conversations/all?user_id=${user?.id || 'anon'}`, { method: 'DELETE' });
      setConversations([]);
      setMessages([]);
      setCurrentChatId(null);
    } catch (err) {
      console.error("Error vaciando historial:", err);
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
    setShowNexusSuggestion(false);

    let targetChatId = currentChatId;
    if (!targetChatId) {
      targetChatId = `chat-${Date.now()}`;
      setCurrentChatId(targetChatId);
      const uid = user?.id || 'anon';
      const initialTitle = (userText || 'Consulta con imagen').slice(0, 30);
      const localChat: Conversation = {
        id: targetChatId,
        userId: uid,
        title: initialTitle,
        createdAt: new Date().toISOString(),
        model: selectedModel
      };
      setConversations((prev) => [localChat, ...prev]);
      try {
        fetch(`${API_BASE}/api/v1/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: targetChatId,
            user_id: uid,
            title: initialTitle,
            model: selectedModel
          })
        }).catch(() => {});
      } catch {}
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
      model: selectedModel,
      image: imgToSend || undefined,
    };

    const assistantPlaceholderId = `model-${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'model',
      content: '',
      timestamp: new Date().toISOString(),
      model: selectedModel,
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, assistantMessage]);
    setServerErrorBanner(null);
    setLastFailedUserText(userText);

    // Active model individual temperature
    const activeMeta = MODEL_META[selectedModel] || MODEL_META.classic;
    const activeTemp = activeMeta.temperature ?? 0.4;

    await startStream(
      updatedMessages,
      selectedModel,
      targetChatId,
      user?.id || 'anon',
      (accumulatedText) => {
        if (soundEnabled && Math.random() > 0.4) {
          playCyberClick();
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
          const friendly = '⚠️ El servidor tardó en responder o está iniciando. Por favor, reintenta en unos segundos.';
          const rawMsg = err?.message || '';
          const bannerMsg = (rawMsg.includes('502') || rawMsg.includes('504') || rawMsg.includes('TIMEOUT') || rawMsg.includes('servidor') || rawMsg.includes('fetch') || rawMsg.includes('Failed'))
            ? friendly
            : (rawMsg || friendly);
          setServerErrorBanner(bannerMsg);
          setMessages((prev) =>
            prev.filter((m) => !(m.role === 'model' && (!m.content || !m.content.trim())))
          );
        },
        onDone: () => {
          setServerErrorBanner(null);
          setLastFailedUserText(null);
          fetchConversations(user?.id || 'anon');
        }
      }
    );

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantPlaceholderId ? { ...msg, isStreaming: false } : msg
      )
    );

    // Refresh conversation list so newly created/updated conversation shows in sidebar
    fetchConversations(user?.id || 'anon');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessageContent = (content: string, isModelStreaming?: boolean) => {
    if (content.includes('<slide')) {
      return (
        <SlideDeckViewer
          rawContent={content}
          presentationTitle={conversations.find(c => c.id === currentChatId)?.title || 'Presentación LYAXIS Canvas'}
        />
      );
    }

    if (content.includes('<thought>')) {
      const parts = content.split('</thought>');
      const thoughtPart = parts[0].replace('<thought>', '').trim();
      const finalContent = parts.length > 1 ? parts.slice(1).join('</thought>').trim() : '';

      return (
        <>
          <ThinkingAccordion thoughtText={thoughtPart} />
          {finalContent ? (
            finalContent.includes('<slide') ? (
              <SlideDeckViewer
                rawContent={finalContent}
                presentationTitle={conversations.find(c => c.id === currentChatId)?.title || 'Presentación LYAXIS Canvas'}
              />
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  table({ children, ...props }) {
                    return (
                      <div className="lyaxis-markdown-table-wrapper">
                        <table {...props}>{children}</table>
                      </div>
                    );
                  },
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children || '').replace(/\n$/, '');
                    if (!inline && match) {
                      return <CodeBlock language={match[1]} codeString={codeString} />;
                    }
                    return <code style={{ backgroundColor: '#111118', color: '#00D9FF', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontFamily: "'JetBrains Mono', Consolas, monospace" }} {...props}>{children}</code>;
                  }
                }}
              >
                {finalContent}
              </ReactMarkdown>
            )
          ) : isModelStreaming ? (
            <div style={{ fontSize: '13px', color: '#c084fc', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} /> Sintetizando solución final...
            </div>
          ) : null}
        </>
      );
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          table({ children, ...props }) {
            return (
              <div className="lyaxis-markdown-table-wrapper">
                <table {...props}>{children}</table>
              </div>
            );
          },
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children || '').replace(/\n$/, '');
            if (!inline && match) {
              return <CodeBlock language={match[1]} codeString={codeString} />;
            }
            return <code style={{ backgroundColor: '#111118', color: '#00D9FF', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontFamily: "'JetBrains Mono', Consolas, monospace" }} {...props}>{children}</code>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const getModelLabel = (modelKey: ModelType) => MODEL_META[modelKey]?.label || 'Classic';
  const getModelColor = (modelKey: ModelType) => MODEL_META[modelKey]?.color || '#F59E0B';

  const MODEL_ICONS: Record<ModelType, (size: number) => React.ReactNode> = {
    speed: (s) => <Sparkles size={s} color="#2563FF" />,
    cortex: (s) => <Brain size={s} color="#7C3AED" />,
    architect: (s) => <Compass size={s} color="#10B981" />,
    classic: (s) => <MessageCircle size={s} color="#F59E0B" />,
    phantom: (s) => <Crosshair size={s} color="#EF4444" />,
    nexus: (s) => <Waypoints size={s} color="#EC4899" />,
    forge: (s) => <Hammer size={s} color="#F97316" />,
    magister: (s) => <GraduationCap size={s} color="#06B6D4" />,
    root: (s) => <Terminal size={s} color="#00FF66" />,
  };

  const getModelIcon = (modelKey: ModelType) => MODEL_ICONS[modelKey]?.(14) || <Sparkles size={14} color="#2563FF" />;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* 2. Micro-Animación Cinemática de Entrada ("Boot Sequence") */}
      {showBoot && <BootSplash onComplete={() => setShowBoot(false)} />}

    <div
      className="cyber-grid-bg lyaxis-chat-root"
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        minHeight: '100dvh',
        maxHeight: '100dvh',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
        
        {/* Dynamic Ambient Aura */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 15%, ${getModelColor(selectedModel)}14 0%, transparent 65%)`,
          opacity: 0.85,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'background 1.2s ease-in-out'
        }} />
        
        {/* Backdrop overlay for mobile with blur */}
        {isMobile && isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
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

        {/* Sidebar */}
        <aside
          style={{
            position: isMobile ? 'fixed' : 'relative',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 10001,
            width: isSidebarOpen ? (isMobile ? '85%' : '280px') : '0px',
            maxWidth: isMobile ? '340px' : '280px',
            display: isSidebarOpen ? 'flex' : 'none',
            backgroundColor: '#0D0D15',
            borderRight: '1px solid #232336',
            flexDirection: 'column',
            padding: isSidebarOpen ? '16px' : '0px',
            flexShrink: 0,
            boxShadow: isMobile ? '12px 0 45px rgba(0,0,0,0.95)' : 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #141418' }}>
            <div
              onClick={() => {
                createNewChat();
                if (isMobile) setIsSidebarOpen(false);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              title="Iniciar nuevo chat"
            >
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg, #2563FF, #00D9FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(0, 217, 255, 0.3)', flexShrink: 0 }}>
                <Terminal size={18} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '15px', fontWeight: 700, margin: 0, letterSpacing: '0.5px' }}>LYAXIS IA</h1>
                <span style={{ fontSize: '11px', color: '#71717a' }}>LYAXIS labs™</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => openInfoDrawer('manifesto')}
                title="Casa Matriz: Manifiesto, Filosofía y Ecosistema LYAXIS labs™"
                style={{
                  background: 'rgba(0, 217, 255, 0.1)',
                  border: '1px solid rgba(0, 217, 255, 0.35)',
                  color: '#00D9FF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '40px',
                  minHeight: '40px',
                  borderRadius: '10px',
                  boxShadow: '0 0 14px rgba(0, 217, 255, 0.2)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Home size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
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

          {/* Tarjeta de Usuario */}
          <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#07070a', border: '1px solid #181822', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <img src={user.picture} alt={user.name} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #00D9FF' }} />
                <div style={{ overflow: 'hidden' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user.name}</span>
                  <span style={{ fontSize: '10px', color: '#71717a', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user.email || user.phone}</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#00D9FF', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                <LogIn size={15} />
                <span>Iniciar sesión</span>
              </button>
            )}
            {user && (
              <button type="button" onClick={handleLogout} title="Cerrar sesión" style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}>
                <LogOut size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              createNewChat();
              if (isMobile) setIsSidebarOpen(false);
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
              marginBottom: '12px',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={17} /> Nuevo Chat
          </button>

          {/* Indicador de Motor Activo con Subtítulo Descriptivo */}
          <div
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
              {MODEL_ICONS[selectedModel]?.(18)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', lineHeight: 1.25 }}>
                LYAXIS {getModelLabel(selectedModel)}
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {MODEL_META[selectedModel]?.tagline}
              </span>
            </div>
          </div>

          {/* Acceso Directo al Cuaderno / Mis Notas */}
          <button
            type="button"
            onClick={() => {
              if (soundEnabled) playCyberClick();
              if (isMobile) setIsSidebarOpen(false);
              if (!notebookContent && messages.length > 0) {
                const lastModel = [...messages].reverse().find((m) => m.role === 'model');
                if (lastModel?.content) {
                  setNotebookContent(lastModel.content);
                  setNotebookTitle(`Apuntes ${getModelLabel(selectedModel)} • ${new Date().toLocaleDateString('es-MX')}`);
                }
              }
              setIsNotebookOpen(true);
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
                fontSize: '9.5px',
                fontWeight: 700,
                color: '#00D9FF',
                backgroundColor: 'rgba(0, 217, 255, 0.15)',
                padding: '2px 7px',
                borderRadius: '6px',
                letterSpacing: '0.4px',
              }}
            >
              CANVAS
            </span>
          </button>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Historial {conversations.length > 0 && `(${conversations.length})`}
              </span>
              {conversations.length > 0 && (
                <button
                  type="button"
                  onClick={deleteAllConversations}
                  title="Borrar todo el historial"
                  style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <Trash2 size={11} /> Vaciar
                </button>
              )}
            </div>

            {conversations.length === 0 ? (
              <div style={{ padding: '16px 12px', textAlign: 'center', backgroundColor: '#07070a', border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '10px', marginTop: '4px' }}>
                <MessageCircle size={20} color="#00D9FF" style={{ margin: '0 auto 8px', display: 'block', opacity: 0.8 }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#d4d4d8', display: 'block', marginBottom: '4px' }}>
                  Sin historial guardado
                </span>
                <span style={{ fontSize: '11px', color: '#71717a', lineHeight: '1.4', display: 'block' }}>
                  Cada chat que inicies se guardará automáticamente aquí.
                </span>
              </div>
            ) : (
              conversations.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    selectConversation(chat);
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                  style={{
                    minHeight: '46px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    backgroundColor: currentChatId === chat.id ? `${getModelColor(chat.model)}22` : 'transparent',
                    border: currentChatId === chat.id ? `1px solid ${getModelColor(chat.model)}55` : '1px solid transparent',
                    color: currentChatId === chat.id ? '#ffffff' : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      {getModelIcon(chat.model)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13.5px', fontWeight: 600 }}>{chat.title}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                        {MODEL_META[chat.model]?.label || 'Classic'} • {MODEL_META[chat.model]?.tagline || ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => deleteConversation(chat.id, e)}
                    title="Eliminar conversación"
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
              ))
            )}
          </div>

          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid #141418',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: '4px',
              paddingRight: '4px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.3px' }}>
              Create. Break. Rebuild. • 2026
            </span>
            <button
              type="button"
              onClick={toggleSound}
              title={!soundEnabled ? 'Activar efectos de audio' : 'Silenciar efectos de audio'}
              style={{
                background: !soundEnabled ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 217, 255, 0.08)',
                border: !soundEnabled ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 217, 255, 0.3)',
                borderRadius: '6px',
                color: !soundEnabled ? '#52525b' : '#00D9FF',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                boxShadow: !soundEnabled ? 'none' : '0 0 10px rgba(0, 217, 255, 0.2)',
                transition: 'all 0.2s ease',
              }}
            >
              {!soundEnabled ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{!soundEnabled ? 'Muted' : 'Audio'}</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          className="lyaxis-main-layout"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            minHeight: '100dvh',
            maxHeight: '100dvh',
            backgroundColor: 'transparent',
            minWidth: 0,
            width: '100%',
            position: 'relative'
          }}
        >
          {isScanlineActive && (
            <div
              className="lyaxis-laser-scanline"
              style={{ '--scan-color': getModelColor(selectedModel) } as React.CSSProperties}
            />
          )}
          {isChromaticActive && (
            <div className="lyaxis-chromatic-overlay" />
          )}
          {/* Streaming progress bar */}
          {isStreaming && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }}>
              <div className="lyaxis-send-progress" />
            </div>
          )}
          {/* Header */}
          <header style={{ minHeight: '58px', borderBottom: '1px solid #141418', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 10px' : '0 24px', backgroundColor: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'relative', zIndex: 500, flexShrink: 0, gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  title="Mostrar barra lateral (Historial)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(0, 217, 255, 0.08)',
                    border: '1px solid rgba(0, 217, 255, 0.25)',
                    color: '#00D9FF',
                    padding: isMobile ? '8px 12px' : '6px 10px',
                    minWidth: isMobile ? '44px' : 'auto',
                    minHeight: isMobile ? '44px' : 'auto',
                    borderRadius: '8px',
                    fontSize: isMobile ? '13px' : '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 0 12px rgba(0, 217, 255, 0.12)',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <PanelLeft size={17} color="#00D9FF" />
                  {!isMobile && <span>Historial</span>}
                </button>
              )}

              {/* Selector de Motores — Custom Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: isMobile ? '8px 14px' : '8px 14px',
                    minHeight: isMobile ? '44px' : '36px',
                    borderRadius: '10px',
                    border: '1px solid #181822',
                    backgroundColor: '#08080c',
                    color: '#ffffff',
                    fontSize: isMobile ? '13.5px' : '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: getModelColor(selectedModel) }}>
                    {MODEL_ICONS[selectedModel]?.(15)}
                  </div>
                  {getModelLabel(selectedModel)}
                  <ChevronDown size={14} style={{ color: '#71717a', transform: isModelDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {isModelDropdownOpen && (
                  <>
                    {/* Invisible overlay to close dropdown when clicking outside */}
                    <div 
                      style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'transparent' }} 
                      onClick={() => setIsModelDropdownOpen(false)} 
                    />
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      width: isMobile ? 'calc(100vw - 24px)' : '310px',
                      maxWidth: '340px',
                      backgroundColor: '#08080d',
                      border: '1px solid rgba(0, 217, 255, 0.35)',
                      borderRadius: '12px',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      zIndex: 9999,
                      boxShadow: '0 15px 50px rgba(0, 0, 0, 0.95), 0 0 24px rgba(0, 217, 255, 0.18)',
                      animation: 'cyberTitleEntrance 0.2s ease-out forwards',
                      maxHeight: '75vh',
                      overflowY: 'auto',
                    }}>
                      <div style={{ padding: '6px 8px 4px', fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Modelos Individuales Lyaxis IA
                      </div>
                      {ALL_MODELS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => { switchModel(m); setIsModelDropdownOpen(false); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: selectedModel === m ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            color: selectedModel === m ? '#ffffff' : '#a1a1aa',
                            transition: 'all 0.2s ease',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selectedModel === m ? 'rgba(255, 255, 255, 0.08)' : 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: getModelColor(m), flexShrink: 0 }}>
                            {MODEL_ICONS[m]?.(16)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                            <span style={{ fontSize: '13px', fontWeight: selectedModel === m ? 700 : 500, color: selectedModel === m ? '#ffffff' : '#e2e8f0', lineHeight: 1.3 }}>
                              {getModelLabel(m)}
                            </span>
                            <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {MODEL_META[m]?.tagline}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!user && (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#121218',
                    border: '1px solid #22222e',
                    color: '#ffffff',
                    padding: isMobile ? '5px 10px' : '6px 14px',
                    borderRadius: '20px',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <LogIn size={13} />
                  <span>{isMobile ? 'Entrar' : 'Acceder'}</span>
                </button>
              )}
              {/* LYAXIS Info / Home Button ("La casa donde hay inf de LYAXIS") */}
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playCyberClick();
                  openInfoDrawer('manifesto');
                }}
                title="Casa Matriz: Manifiesto, Filosofía y Ecosistema LYAXIS labs™"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(0, 217, 255, 0.08)',
                  border: '1px solid rgba(0, 217, 255, 0.25)',
                  color: '#00D9FF',
                  padding: isMobile ? '8px 12px' : '6px 12px',
                  minHeight: isMobile ? '44px' : 'auto',
                  minWidth: isMobile ? '44px' : 'auto',
                  borderRadius: '8px',
                  fontSize: isMobile ? '13px' : '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(0, 217, 255, 0.12)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Home size={15} color="#00D9FF" />
                {!isMobile && <span>LYAXIS labs™</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playCyberClick();
                  setIsDashboardOpen(true);
                }}
                title="Abrir Telemetría HUD"
                className="lyaxis-sound-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(0, 217, 255, 0.08)',
                  border: '1px solid rgba(0, 217, 255, 0.25)',
                  color: '#00D9FF',
                  padding: isMobile ? '8px 12px' : '6px 12px',
                  minHeight: isMobile ? '44px' : 'auto',
                  minWidth: isMobile ? '44px' : 'auto',
                  borderRadius: '8px',
                  fontSize: isMobile ? '13px' : '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(0, 217, 255, 0.12)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Activity size={14} className="lyaxis-hero-icon" />
                <span>HUD</span>
              </button>

              {/* LYAXIS Notebook Canvas Studio Button */}
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playCyberClick();
                  if (!notebookContent && messages.length > 0) {
                    const lastModel = [...messages].reverse().find((m) => m.role === 'model');
                    if (lastModel?.content) {
                      setNotebookContent(lastModel.content);
                      setNotebookTitle(`Apuntes ${getModelLabel(selectedModel)} • ${new Date().toLocaleDateString('es-MX')}`);
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
                  border: isNotebookOpen ? '1px solid rgba(0, 217, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: isNotebookOpen ? '#00D9FF' : '#ffffff',
                  padding: isMobile ? '8px 12px' : '6px 12px',
                  minHeight: isMobile ? '44px' : 'auto',
                  minWidth: isMobile ? '44px' : 'auto',
                  borderRadius: '8px',
                  fontSize: isMobile ? '13px' : '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <BookOpen size={15} color="#00D9FF" />
                {!isMobile && <span>Notebook</span>}
              </button>
              <button
                type="button"
                onClick={() => exportChatToPDF(
                  conversations.find(c => c.id === currentChatId)?.title || 'Conversación LYAXIS',
                  getModelLabel(selectedModel),
                  getModelColor(selectedModel),
                  messages
                )}
                title="Descargar chat completo en PDF"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  padding: isMobile ? '8px 12px' : '6px 12px',
                  minHeight: isMobile ? '44px' : 'auto',
                  minWidth: isMobile ? '44px' : 'auto',
                  borderRadius: '8px',
                  fontSize: isMobile ? '13px' : '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <FileDown size={15} color="#00D9FF" />
                {!isMobile && <span>PDF</span>}
              </button>
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? "Silenciar audio" : "Activar audio"}
                style={{
                  background: 'none',
                  border: '1px solid #1c1c26',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  minWidth: isMobile ? '44px' : '32px',
                  minHeight: isMobile ? '44px' : '32px',
                  color: soundEnabled ? '#00D9FF' : '#52525b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: soundEnabled ? '#00D9FF11' : 'transparent',
                }}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            </div>
          </header>

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
                animation: 'fadeIn 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
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
                  onClick={() => {
                    if (lastFailedUserText) {
                      handleSend(lastFailedUserText);
                    } else if (messages.length > 0) {
                      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                      if (lastUser && lastUser.content) {
                        handleSend(lastUser.content);
                      }
                    }
                  }}
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
                    transition: 'all 0.2s ease'
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
                    alignItems: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Main Area: Standard Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px' : '24px 16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ maxWidth: '960px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#71717a', gap: '20px', textAlign: 'center', minHeight: '60vh', padding: '16px 12px', animation: 'fadeIn 0.3s ease-out' }}>
                  
                  {/* Model Quick Switcher Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', maxWidth: '780px', marginBottom: '4px' }}>
                    {ALL_MODELS.map((m) => {
                      const isSelected = selectedModel === m;
                      const modelColor = getModelColor(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            switchModel(m);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '11.5px',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            backgroundColor: isSelected ? `${modelColor}22` : 'rgba(255, 255, 255, 0.03)',
                            border: isSelected ? `1px solid ${modelColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                            color: isSelected ? '#ffffff' : '#a1a1aa',
                            boxShadow: isSelected ? `0 0 16px ${modelColor}44` : 'none',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        >
                          <span style={{ color: modelColor, display: 'flex', alignItems: 'center' }}>
                            {MODEL_ICONS[m]?.(12)}
                          </span>
                          {getModelLabel(m)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Main Central Emblem */}
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Glowing Aura Ring */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '96px',
                        height: '96px',
                        borderRadius: '30px',
                        background: `radial-gradient(circle, ${getModelColor(selectedModel)}55 0%, transparent 70%)`,
                        filter: 'blur(16px)',
                        animation: 'lyaxisPulse 2.5s infinite ease-in-out',
                      }}
                    />
                    <div
                      className="lyaxis-empty-state-orb"
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: `linear-gradient(135deg, ${getModelColor(selectedModel)}, #00D9FF)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 0 35px ${getModelColor(selectedModel)}66, 0 0 15px rgba(0, 217, 255, 0.4)`,
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {MODEL_ICONS[selectedModel]?.(32)}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h2
                      style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        color: '#ffffff',
                        margin: '0 0 6px 0',
                        letterSpacing: '-0.4px',
                        background: 'linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      LYAXIS {getModelLabel(selectedModel)}
                    </h2>
                    <p style={{ fontSize: '13.5px', maxWidth: '520px', margin: '0 auto', lineHeight: '1.55', color: '#a1a1aa' }}>
                      {MODEL_META[selectedModel]?.description}
                    </p>
                  </div>

                  {/* High-Tech Capability Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#00D9FF', backgroundColor: 'rgba(0, 217, 255, 0.08)', border: '1px solid rgba(0, 217, 255, 0.2)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Zap size={11} /> Streaming ~14ms
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: getModelColor(selectedModel), backgroundColor: `${getModelColor(selectedModel)}14`, border: `1px solid ${getModelColor(selectedModel)}33`, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Shield size={11} /> Encriptación AES-256
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#a78bfa', backgroundColor: 'rgba(167, 139, 250, 0.08)', border: '1px solid rgba(167, 139, 250, 0.2)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Cpu size={11} /> Motor Neuronal LYAXIS
                    </span>
                  </div>

                  {/* Suggested Prompt Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', width: '100%', maxWidth: '640px', marginTop: '10px' }}>
                    {(MODEL_PROMPTS[selectedModel] || []).map((prompt, i) => (
                      <button
                        key={`${selectedModel}-${i}`}
                        type="button"
                        className="lyaxis-prompt-card"
                        onClick={() => handleSend(prompt.text)}
                        style={{
                          backgroundColor: 'rgba(8, 8, 14, 0.75)',
                          border: `1px solid ${getModelColor(selectedModel)}33`,
                          borderRadius: '14px',
                          padding: isMobile ? '14px 16px' : '14px 16px',
                          minHeight: isMobile ? '56px' : '48px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: '#ffffff',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.5)',
                        }}
                      >
                        <div
                          className="prompt-icon"
                          style={{
                            backgroundColor: prompt.bg,
                            border: `1px solid ${prompt.border}`,
                            borderRadius: '10px',
                            width: isMobile ? '38px' : '32px',
                            height: isMobile ? '38px' : '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {prompt.icon}
                        </div>
                        <div style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          <span className="prompt-text" style={{ fontSize: isMobile ? '14.5px' : '13px', lineHeight: '1.5', display: 'block', color: '#f8fafc', fontWeight: 500 }}>{prompt.text}</span>
                        </div>
                        <ChevronRight size={16} color={getModelColor(selectedModel)} style={{ flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>

                  {/* Telemetry Ticker Strip */}
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '10.5px',
                      color: '#52525b',
                    }}
                  >
                    <span style={{ color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981', display: 'inline-block' }} />
                      SISTEMA ACTIVO
                    </span>
                    <span>•</span>
                    <span>LATENCIA: ~14ms</span>
                    <span>•</span>
                    <span>MOTOR: {selectedModel.toUpperCase()}</span>
                  </div>

                </div>
              ) : (
                messages.map((msg, msgIndex) => (
                  <MessageBubble
                    key={msg.id || msgIndex}
                    message={msg}
                    activeModel={selectedModel}
                    isMobile={isMobile}
                    onExportPDF={exportChatToPDF}
                    onOpenInNotebook={handleOpenInNotebook}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
                  {/* Input Area */}
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
              {/* Automatic Nexus Suggestion Banner if user uploaded an image and isn't on Nexus */}
              {showNexusSuggestion && selectedImage && selectedModel !== 'nexus' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    marginBottom: '8px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(236, 72, 153, 0.12)',
                    border: '1px solid rgba(236, 72, 153, 0.35)',
                    boxShadow: '0 0 15px rgba(236, 72, 153, 0.15)',
                    gap: '10px',
                    animation: 'fadeIn 0.25s ease-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <Sparkles size={14} color="#EC4899" />
                    <span style={{ fontSize: '12px', color: '#fbcfe8', lineHeight: '1.4' }}>
                      Has adjuntado una imagen. Se recomienda <strong>LYAXIS Nexus</strong> (visión multimodal LLaMA 3.2 11B Vision).
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        switchModel('nexus');
                        setShowNexusSuggestion(false);
                      }}
                      style={{
                        backgroundColor: '#EC4899',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 0 10px rgba(236, 72, 153, 0.4)',
                      }}
                    >
                      Cambiar a Nexus
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNexusSuggestion(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f472b6',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
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
                    border: `1px solid ${selectedModel === 'nexus' ? '#EC4899' : 'rgba(255, 255, 255, 0.15)'}`,
                    boxShadow: '0 4px 18px rgba(0,0,0,0.7)',
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
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: selectedModel === 'nexus' ? '#f472b6' : '#ffffff' }}>
                      Imagen lista {selectedModel === 'nexus' ? '(Nexus Multimodal)' : ''}
                    </span>
                    <span style={{ fontSize: '10px', color: '#71717a' }}>Base64 codificado</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setShowNexusSuggestion(false);
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

              <div
                className={isTriadActive ? 'lyaxis-triad-active-box' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  backgroundColor: '#08080c',
                  border: isTriadActive ? '1px solid transparent' : (selectedImage ? `1px solid ${getModelColor(selectedModel)}66` : '1px solid #1a1a24'),
                  borderRadius: '14px',
                  padding: isMobile ? '8px 10px' : '12px 16px',
                  gap: '8px',
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

                {/* LYAXIS TRIAD™ Toggle Button */}
                <button
                  type="button"
                  onClick={toggleTriad}
                  title="Activar o desactivar debate triádico LYAXIS TRIAD™: Create ➔ Break ➔ Rebuild"
                  style={{
                    height: isMobile ? '44px' : '36px',
                    padding: '0 10px',
                    borderRadius: '10px',
                    backgroundColor: isTriadActive ? 'rgba(124, 58, 237, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: isTriadActive ? '1px solid #7C3AED' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: isTriadActive ? '#ffffff' : '#71717a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    boxShadow: isTriadActive ? '0 0 14px rgba(124, 58, 237, 0.45)' : 'none',
                  }}
                >
                  <Zap size={14} color={isTriadActive ? '#00D9FF' : '#71717a'} />
                  {!isMobile && <span>TRIAD</span>}
                  <span style={{ color: isTriadActive ? '#10B981' : '#71717a', fontWeight: 800 }}>
                    {isTriadActive ? 'ON' : 'OFF'}
                  </span>
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
                          : `Mensaje a LYAXIS ${getModelLabel(selectedModel)}...`)
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
                        : ((inputValue.trim() || selectedImage) ? getModelColor(selectedModel) : '#1c1c24'),
                      border: 'none',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: (inputValue.trim() || selectedImage) ? 'pointer' : 'default',
                      flexShrink: 0,
                      boxShadow: (inputValue.trim() || selectedImage) 
                        ? (isTriadActive ? '0 0 16px rgba(124, 58, 237, 0.5)' : `0 0 16px ${getModelColor(selectedModel)}44`) 
                        : 'none',
                    }}
                  >
                    <Send size={16} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </main>

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />

        <FuturisticDashboardModal
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          selectedModel={selectedModel}
          onSelectModel={(m) => {
            switchModel(m);
            if (soundEnabled) playCyberClick();
          }}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          messageCount={messages.length}
          conversationCount={conversations.length}
        />

        <LyaxisInfoDrawer
          isOpen={isInfoDrawerOpen}
          onClose={() => setIsInfoDrawerOpen(false)}
          initialTab={infoDrawerTab}
        />

        <NotebookStudio
          isOpen={isNotebookOpen}
          onClose={() => setIsNotebookOpen(false)}
          initialContent={notebookContent}
          initialTitle={notebookTitle}
          activeModel={selectedModel}
          isMobile={isMobile}
        />

        <InstallPwaPrompt />
      </div>
    </GoogleOAuthProvider>
  );
}