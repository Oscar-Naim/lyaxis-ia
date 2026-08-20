import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Send, Square, Sparkles, Brain, Compass, Plus, Trash2, Terminal, Home, Volume2, VolumeX, ChevronDown, ChevronRight, Cpu, LogOut, LogIn, Menu, X, Copy, Check, Zap, Code2, BookOpen, Lightbulb, Activity, MessageCircle, Crosshair, Waypoints, Flame, Network, Shield, Palette, PanelLeft, PanelLeftClose, Hammer, GraduationCap, FileDown } from 'lucide-react';
import { exportChatToPDF } from './pdfExporter';

type ModelType = 'speed' | 'cortex' | 'architect' | 'classic' | 'phantom' | 'nexus' | 'forge' | 'magister';

const ALL_MODELS: ModelType[] = ['speed', 'cortex', 'architect', 'classic', 'phantom', 'nexus', 'forge', 'magister'];

const MODEL_META: Record<ModelType, { label: string; color: string; description: string }> = {
  speed: { label: 'Speed', color: '#2563FF', description: 'Asistente de desarrollo ágil y streaming ultrarrápido de LYAXIS labs.' },
  cortex: { label: 'Cortex', color: '#7C3AED', description: 'Motor de razonamiento profundo para algoritmos y arquitectura.' },
  architect: { label: 'Architect', color: '#10B981', description: 'Módulo de arquitectura de prompts y mentoría técnica.' },
  classic: { label: 'Classic', color: '#F59E0B', description: 'Tu compañero inteligente para el día a día. Pregunta lo que quieras.' },
  phantom: { label: 'Phantom', color: '#EF4444', description: 'El deconstructor. Encuentra fallas, bugs y puntos de fracaso.' },
  nexus: { label: 'Nexus', color: '#EC4899', description: 'Sintetizador creativo. Conecta ideas de dominios imposibles.' },
  forge: { label: 'Forge', color: '#F97316', description: 'Constructor práctico. Convierte ideas vagas en proyectos reales y concretos.' },
  magister: { label: 'Magister', color: '#06B6D4', description: 'Copiloto pedagógico y arquitecto de planeaciones docente SEP para todos los niveles.' },
};

const MODEL_PROMPTS: Record<ModelType, { icon: React.ReactNode; bg: string; border: string; text: string }[]> = {
  speed: [
    { icon: <Code2 size={16} color="#2563FF" />, bg: 'rgba(37, 99, 255, 0.12)', border: 'rgba(37, 99, 255, 0.25)', text: 'Crea un hook de React para infinite scroll con IntersectionObserver' },
    { icon: <Zap size={16} color="#00D9FF" />, bg: 'rgba(0, 217, 255, 0.12)', border: 'rgba(0, 217, 255, 0.25)', text: 'Genera una API REST con FastAPI, validación y docs automáticos' },
    { icon: <Flame size={16} color="#F97316" />, bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.25)', text: 'Implementa un dark mode toggle con CSS custom properties' },
    { icon: <Terminal size={16} color="#2563FF" />, bg: 'rgba(37, 99, 255, 0.12)', border: 'rgba(37, 99, 255, 0.25)', text: 'Construye un componente de notificaciones toast animadas' },
  ],
  cortex: [
    { icon: <Brain size={16} color="#7C3AED" />, bg: 'rgba(124, 58, 237, 0.12)', border: 'rgba(124, 58, 237, 0.25)', text: 'Analiza la complejidad temporal de este algoritmo recursivo' },
    { icon: <Network size={16} color="#a78bfa" />, bg: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.25)', text: 'Diseña un sistema de caché distribuido con invalidación' },
    { icon: <Cpu size={16} color="#7C3AED" />, bg: 'rgba(124, 58, 237, 0.12)', border: 'rgba(124, 58, 237, 0.25)', text: '¿Cuándo usar BFS vs DFS? Dame el framework de decisión' },
    { icon: <Lightbulb size={16} color="#c084fc" />, bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.25)', text: 'Compara microservicios vs monolito para un MVP de 3 personas' },
  ],
  architect: [
    { icon: <Compass size={16} color="#10B981" />, bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)', text: 'Diseña un System Prompt para un agente de soporte técnico' },
    { icon: <BookOpen size={16} color="#34d399" />, bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.25)', text: 'Enséñame el patrón Observer como si tuviera 12 años' },
    { icon: <Code2 size={16} color="#10B981" />, bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)', text: 'Estructura un prompt de producción con few-shot examples' },
    { icon: <Shield size={16} color="#6ee7b7" />, bg: 'rgba(110, 231, 183, 0.12)', border: 'rgba(110, 231, 183, 0.25)', text: '¿Cuáles son los 5 errores más comunes al diseñar prompts?' },
  ],
  classic: [
    { icon: <Lightbulb size={16} color="#F59E0B" />, bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', text: '¿Cuáles son las mejores técnicas de productividad para devs?' },
    { icon: <MessageCircle size={16} color="#fbbf24" />, bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.25)', text: 'Ayúdame a redactar un correo profesional convincente' },
    { icon: <BookOpen size={16} color="#F59E0B" />, bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', text: 'Dame un plan de estudio para aprender Rust en 30 días' },
    { icon: <Sparkles size={16} color="#fcd34d" />, bg: 'rgba(252, 211, 77, 0.12)', border: 'rgba(252, 211, 77, 0.25)', text: 'Recomiéndame libros que cambien mi forma de pensar' },
  ],
  phantom: [
    { icon: <Crosshair size={16} color="#EF4444" />, bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', text: '¿Por qué mi código falla en producción pero no en local?' },
    { icon: <Shield size={16} color="#f87171" />, bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.25)', text: 'Encuentra las 3 peores vulnerabilidades de esta API' },
    { icon: <Flame size={16} color="#EF4444" />, bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', text: 'Destruye mi plan de negocio — dime por qué fracasaría' },
    { icon: <Zap size={16} color="#fca5a5" />, bg: 'rgba(252, 165, 165, 0.12)', border: 'rgba(252, 165, 165, 0.25)', text: 'Audita esta arquitectura y muéstrame dónde se rompe' },
  ],
  nexus: [
    { icon: <Waypoints size={16} color="#EC4899" />, bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.25)', text: 'Conecta la biología con el diseño de software' },
    { icon: <Palette size={16} color="#f472b6" />, bg: 'rgba(244, 114, 182, 0.12)', border: 'rgba(244, 114, 182, 0.25)', text: '¿Qué pasaría si los videojuegos fueran educación formal?' },
    { icon: <Sparkles size={16} color="#EC4899" />, bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.25)', text: 'Genera 10 nombres únicos para mi proyecto usando etimología' },
    { icon: <Lightbulb size={16} color="#f9a8d4" />, bg: 'rgba(249, 168, 212, 0.12)', border: 'rgba(249, 168, 212, 0.25)', text: 'Combina minimalismo japonés con arquitectura de APIs' },
  ],
  forge: [
    { icon: <Hammer size={16} color="#F97316" />, bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.25)', text: 'Quiero hacer una página para intercambiar habilidades' },
    { icon: <Lightbulb size={16} color="#fb923c" />, bg: 'rgba(251, 146, 60, 0.12)', border: 'rgba(251, 146, 60, 0.25)', text: 'Tengo una idea para vender postres, ayúdame a estructurarla' },
    { icon: <Waypoints size={16} color="#F97316" />, bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.25)', text: 'Diseña un sistema personal para organizar mi dinero' },
    { icon: <Compass size={16} color="#fdba74" />, bg: 'rgba(253, 186, 116, 0.12)', border: 'rgba(253, 186, 116, 0.25)', text: 'Quiero aprender fotografía, hazme un plan práctico' },
  ],
  magister: [
    { icon: <GraduationCap size={16} color="#06B6D4" />, bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.25)', text: 'Crea una planeación NEM (Fase 4, 3° Primaria) para el proyecto "Cuidado del Agua"' },
    { icon: <BookOpen size={16} color="#22d3ee" />, bg: 'rgba(34, 211, 238, 0.12)', border: 'rgba(34, 211, 238, 0.25)', text: 'Diseña un proyecto STEAM de Indagación para Secundaria sobre Energías Renovables' },
    { icon: <Sparkles size={16} color="#06B6D4" />, bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.25)', text: 'Genera una rúbrica analítica de evaluación formativa para Preescolar en expresión artística' },
    { icon: <Compass size={16} color="#67e8f9" />, bg: 'rgba(103, 232, 249, 0.12)', border: 'rgba(103, 232, 249, 0.25)', text: 'Estructura una secuencia didáctica de 5 sesiones de historia para Preparatoria' },
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

let audioCtx: AudioContext | null = null;
const playCyberClick = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx && AudioCtx) audioCtx = new AudioCtx();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.02);

    gain.gain.setValueAtTime(0.015, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  } catch {}
};

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
  const [view, setView] = useState<'landing' | 'chat'>('landing');
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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelType>('speed');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

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
    return typeof window !== 'undefined' ? localStorage.getItem('lyaxis_sound') === 'true' : false;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

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
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('lyaxis_sound', String(next));
    if (next) playCyberClick();
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

  const { isStreaming, sendMessage, stopStreaming } = useSSEStream({
    onDone: () => {
      fetchConversations(activeUserId);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `⚠️ Aviso de servicio: ${err.message}`,
          timestamp: new Date().toISOString(),
          model: selectedModel,
        }
      ]);
    }
  });

  const fetchConversations = async (targetUserId?: string) => {
    try {
      const uid = targetUserId || activeUserId;
      const url = `${API_BASE}/api/v1/conversations?user_id=${uid}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !currentChatId) {
          selectConversation(data[0]);
        }
      }
    } catch (e) {
      console.warn("Aviso cargando conversaciones:", e);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/conversations/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.warn("Aviso cargando mensajes:", e);
    }
  };

  useEffect(() => {
    fetchConversations(activeUserId);
  }, [activeUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (chat: Conversation) => {
    if (isStreaming) return;
    setCurrentChatId(chat.id);
    // Keep sidebar selection without overriding model — user controls model from header
    updateLastChatPerModel(chat.model || 'speed', chat.id);
    loadMessages(chat.id);
    if (isMobile) setIsSidebarOpen(false);
  };

  const [isScanlineActive, setIsScanlineActive] = useState(false);
  const [isChromaticActive, setIsChromaticActive] = useState(false);

  // Switch model and load last conversation for that model
  const switchModel = (newModel: ModelType) => {
    if (isStreaming || newModel === selectedModel) return;
    if (soundEnabled) playCyberClick();
    setIsScanlineActive(true);
    setIsChromaticActive(true);
    setTimeout(() => setIsScanlineActive(false), 750);
    setTimeout(() => setIsChromaticActive(false), 450);

    // Save current conversation for current model
    if (currentChatId) {
      updateLastChatPerModel(selectedModel, currentChatId);
    }
    setSelectedModel(newModel);
    // Load last conversation for the new model
    const lastChatId = lastChatPerModel[newModel];
    if (lastChatId) {
      const chat = conversations.find(c => c.id === lastChatId);
      if (chat) {
        setCurrentChatId(lastChatId);
        loadMessages(lastChatId);
        return;
      }
    }
    // No previous conversation for this model — show empty state
    setCurrentChatId(null);
    setMessages([]);
  };

  const createNewChat = () => {
    if (isStreaming) return;
    const localId = `chat-${Date.now()}`;
    const newChat: Conversation = {
      id: localId,
      userId: activeUserId,
      title: 'Nueva conversación',
      createdAt: new Date().toISOString(),
      model: selectedModel
    };
    setConversations((prev) => [newChat, ...prev]);
    setCurrentChatId(localId);
    setMessages([]);
    if (isMobile) setIsSidebarOpen(false);
  };

  const deleteConversation = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      fetch(`${API_BASE}/api/v1/conversations/${chatId}`, { method: 'DELETE' });
      const updated = conversations.filter((c) => c.id !== chatId);
      setConversations(updated);
      if (currentChatId === chatId) {
        if (updated.length > 0) {
          selectConversation(updated[0]);
        } else {
          createNewChat();
        }
      }
    } catch (err) {
      console.error("Error eliminando conversación:", err);
    }
  };

  const deleteAllConversations = async () => {
    if (isStreaming) return;
    try {
      await fetch(`${API_BASE}/api/v1/conversations/all?user_id=${activeUserId}`, { method: 'DELETE' });
      setConversations([]);
      setMessages([]);
      setCurrentChatId(null);
    } catch (err) {
      console.error("Error vaciando historial:", err);
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputValue;
    if (!textToSend || !textToSend.trim() || isStreaming) return;

    const userText = textToSend.trim();
    setInputValue('');

    let targetChatId = currentChatId;
    if (!targetChatId) {
      targetChatId = `chat-${Date.now()}`;
      setCurrentChatId(targetChatId);
      const localChat: Conversation = {
        id: targetChatId,
        userId: activeUserId,
        title: userText.slice(0, 30),
        createdAt: new Date().toISOString(),
        model: selectedModel
      };
      setConversations((prev) => [localChat, ...prev]);
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
      model: selectedModel,
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

    await sendMessage(updatedMessages, selectedModel, targetChatId, activeUserId, (accumulatedText) => {
      if (soundEnabled && Math.random() > 0.4) {
        playCyberClick();
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantPlaceholderId
            ? { ...msg, content: accumulatedText }
            : msg
        )
      );
    });

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantPlaceholderId ? { ...msg, isStreaming: false } : msg
      )
    );

    // Refresh conversation list so newly created/updated conversation shows in sidebar
    fetchConversations(activeUserId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessageContent = (content: string, isModelStreaming?: boolean) => {
    if (content.includes('<thought>')) {
      const parts = content.split('</thought>');
      const thoughtPart = parts[0].replace('<thought>', '').trim();
      const finalContent = parts.length > 1 ? parts.slice(1).join('</thought>').trim() : '';

      return (
        <>
          <ThinkingAccordion thoughtText={thoughtPart} />
          {finalContent ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
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
        remarkPlugins={[remarkGfm]}
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

  const getModelLabel = (modelKey: ModelType) => MODEL_META[modelKey]?.label || 'Speed';
  const getModelColor = (modelKey: ModelType) => MODEL_META[modelKey]?.color || '#2563FF';

  const MODEL_ICONS: Record<ModelType, (size: number) => React.ReactNode> = {
    speed: (s) => <Sparkles size={s} color="#2563FF" />,
    cortex: (s) => <Brain size={s} color="#7C3AED" />,
    architect: (s) => <Compass size={s} color="#10B981" />,
    classic: (s) => <MessageCircle size={s} color="#F59E0B" />,
    phantom: (s) => <Crosshair size={s} color="#EF4444" />,
    nexus: (s) => <Waypoints size={s} color="#EC4899" />,
    forge: (s) => <Hammer size={s} color="#F97316" />,
    magister: (s) => <GraduationCap size={s} color="#06B6D4" />,
  };

  const getModelIcon = (modelKey: ModelType) => MODEL_ICONS[modelKey]?.(14) || <Sparkles size={14} color="#2563FF" />;

  if (view === 'landing') {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <LandingPage
          onEnterChat={() => setView('chat')}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenInfo={openInfoDrawer}
        />
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onLoginSuccess={handleLoginSuccess} />
        <LyaxisInfoDrawer isOpen={isInfoDrawerOpen} onClose={() => setIsInfoDrawerOpen(false)} initialTab={infoDrawerTab} />
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="cyber-grid-bg" style={{ display: 'flex', width: '100vw', height: '100vh', color: '#ffffff', position: 'relative', overflow: 'hidden' }}>
        
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
        
        {isMobile && isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', zIndex: 90 }}
          />
        )}

        {/* Sidebar */}
        <aside
          style={{
            position: isMobile ? 'fixed' : 'relative',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 100,
            width: isSidebarOpen ? '280px' : '0px',
            display: isSidebarOpen ? 'flex' : 'none',
            backgroundColor: '#000000',
            borderRight: '1px solid #141418',
            flexDirection: 'column',
            padding: isSidebarOpen ? '16px' : '0px',
            flexShrink: 0,
            boxShadow: isMobile ? '10px 0 40px rgba(0,0,0,0.9)' : 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #141418' }}>
            <div
              onClick={() => setView('landing')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              title="Volver a la portada de inicio"
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563FF, #00D9FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(0, 217, 255, 0.3)' }}>
                <Terminal size={18} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '15px', fontWeight: 700, margin: 0, letterSpacing: '0.5px' }}>LYAXIS IA</h1>
                <span style={{ fontSize: '11px', color: '#71717a' }}>LYAXIS labs™</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => openInfoDrawer('manifesto')}
                title="Manifiesto, Filosofía y Legales de LYAXIS labs™"
                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }}
              >
                <Home size={17} />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="Ocultar barra lateral"
                style={{ background: 'none', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
              >
                <PanelLeftClose size={17} />
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
            onClick={createNewChat}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', backgroundColor: '#0a0a0e', border: '1px solid #1c1c24', borderRadius: '8px', color: '#ffffff', fontSize: '13px', cursor: 'pointer', marginBottom: '16px' }}
          >
            <Plus size={16} /> Nuevo Chat
          </button>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Historial</span>
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
            {conversations.map((chat) => (
              <div
                key={chat.id}
                onClick={() => selectConversation(chat)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: currentChatId === chat.id ? `${getModelColor(chat.model)}22` : 'transparent',
                  border: currentChatId === chat.id ? `1px solid ${getModelColor(chat.model)}55` : '1px solid transparent',
                  color: currentChatId === chat.id ? '#ffffff' : '#a1a1aa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {getModelIcon(chat.model)}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.title}</span>
                </div>
                <Trash2
                  size={14}
                  color="#52525b"
                  onClick={(e) => deleteConversation(chat.id, e)}
                />
              </div>
            ))}
          </div>

          <div style={{ paddingTop: '12px', borderTop: '1px solid #141418', fontSize: '11px', color: '#52525b', textAlign: 'center' }}>
            Create. Break. Rebuild. • 2026
          </div>
        </aside>

        {/* Main Chat Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'transparent', minWidth: 0, width: '100%', position: 'relative' }}>
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
          <header style={{ minHeight: '58px', borderBottom: '1px solid #141418', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 12px' : '0 24px', backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', flexShrink: 0, gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  title="Mostrar barra lateral (Historial)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(0, 217, 255, 0.08)',
                    border: '1px solid rgba(0, 217, 255, 0.25)',
                    color: '#00D9FF',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 0 12px rgba(0, 217, 255, 0.12)',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <PanelLeft size={16} color="#00D9FF" />
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
                    padding: isMobile ? '6px 10px' : '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid #181822',
                    backgroundColor: '#08080c',
                    color: '#ffffff',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: getModelColor(selectedModel) }}>
                    {MODEL_ICONS[selectedModel]?.(14)}
                  </div>
                  {getModelLabel(selectedModel)}
                  <ChevronDown size={14} style={{ color: '#71717a', transform: isModelDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {isModelDropdownOpen && (
                  <>
                    {/* Invisible overlay to close dropdown when clicking outside */}
                    <div 
                      style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
                      onClick={() => setIsModelDropdownOpen(false)} 
                    />
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '6px',
                      width: '220px',
                      backgroundColor: '#08080c',
                      border: '1px solid #181822',
                      borderRadius: '12px',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      zIndex: 100,
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                      animation: 'cyberTitleEntrance 0.2s ease-out forwards',
                    }}>
                      <div style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Modelos Lyaxis IA
                      </div>
                      {ALL_MODELS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => { switchModel(m); setIsModelDropdownOpen(false); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: selectedModel === m ? 700 : 500,
                            cursor: 'pointer',
                            backgroundColor: selectedModel === m ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                            color: selectedModel === m ? '#ffffff' : '#a1a1aa',
                            transition: 'all 0.2s ease',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selectedModel === m ? 'rgba(255, 255, 255, 0.05)' : 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: getModelColor(m) }}>
                            {MODEL_ICONS[m]?.(14)}
                          </div>
                          {getModelLabel(m)}
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
                  gap: '4px',
                  backgroundColor: 'rgba(0, 217, 255, 0.08)',
                  border: '1px solid rgba(0, 217, 255, 0.25)',
                  color: '#00D9FF',
                  padding: isMobile ? '5px 8px' : '6px 12px',
                  borderRadius: '8px',
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(0, 217, 255, 0.12)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Activity size={13} className="lyaxis-hero-icon" />
                <span>HUD</span>
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
                  gap: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  padding: isMobile ? '5px 8px' : '6px 12px',
                  borderRadius: '8px',
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <FileDown size={14} color="#00D9FF" />
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
                  padding: '6px 8px',
                  color: soundEnabled ? '#00D9FF' : '#52525b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: soundEnabled ? '#00D9FF11' : 'transparent',
                }}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
            </div>
          </header>

          {/* Scrollable Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px' : '24px 16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ maxWidth: '860px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#71717a', gap: '14px', textAlign: 'center', minHeight: '50vh', padding: '0 12px' }}>
                  <div className="lyaxis-empty-state-orb" style={{ width: '48px', height: '48px', borderRadius: '14px', background: `linear-gradient(135deg, ${getModelColor(selectedModel)}, #00D9FF)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${getModelColor(selectedModel)}44` }}>
                    {MODEL_ICONS[selectedModel]?.(24)}
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    LYAXIS {getModelLabel(selectedModel)}
                  </h2>
                  <p style={{ fontSize: '13.5px', maxWidth: '480px', margin: 0, lineHeight: '1.5', color: '#a1a1aa' }}>
                    {MODEL_META[selectedModel]?.description}
                  </p>

                  {/* Suggested Prompts — Dynamic per Model */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', width: '100%', maxWidth: '580px', marginTop: '20px' }}>
                    {(MODEL_PROMPTS[selectedModel] || []).map((prompt, i) => (
                      <button
                        key={`${selectedModel}-${i}`}
                        type="button"
                        className="lyaxis-prompt-card"
                        onClick={() => handleSend(prompt.text)}
                      >
                        <div
                          className="prompt-icon"
                          style={{ backgroundColor: prompt.bg, border: `1px solid ${prompt.border}` }}
                        >
                          {prompt.icon}
                        </div>
                        <span className="prompt-text">{prompt.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, msgIndex) => {
                  const messageModel = msg.model || selectedModel;
                  return (
                    <div
                      key={msg.id || msgIndex}
                      className="lyaxis-msg-bubble"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignSelf: 'flex-start',
                        maxWidth: '100%',
                        width: '100%',
                        backgroundColor: msg.role === 'user' ? '#0d0d12' : 'rgba(6, 6, 9, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: msg.role === 'user' ? '1px solid #22222c' : `1px solid ${msg.role === 'model' ? getModelColor(messageModel) + '33' : '#14141c'}`,
                        borderRadius: '14px',
                        padding: isMobile ? '12px 14px' : '16px 20px',
                        fontSize: isMobile ? '13.5px' : '14.5px',
                        lineHeight: '1.6',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                        overflowWrap: 'break-word',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#71717a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {msg.role === 'model' && getModelIcon(messageModel)}
                          <span style={{ fontWeight: 600, color: msg.role === 'user' ? '#a1a1aa' : getModelColor(messageModel) }}>
                            {msg.role === 'user' ? 'Tú' : `LYAXIS ${getModelLabel(messageModel)}`}
                          </span>
                        </div>
                        {msg.role === 'model' && msg.content && !msg.isStreaming && (
                          <div className="lyaxis-action-bar">
                            <button
                              type="button"
                              title="Copiar respuesta"
                              className={`lyaxis-action-btn${copiedMsgId === msg.id ? ' copied' : ''}`}
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                setCopiedMsgId(msg.id);
                                setTimeout(() => setCopiedMsgId(null), 2000);
                              }}
                            >
                              {copiedMsgId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                            <button
                              type="button"
                              title="Descargar esta respuesta como PDF"
                              className="lyaxis-action-btn"
                              onClick={() => exportChatToPDF(
                                conversations.find(c => c.id === currentChatId)?.title || 'Respuesta LYAXIS',
                                getModelLabel(messageModel),
                                getModelColor(messageModel),
                                [msg]
                              )}
                            >
                              <FileDown size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="markdown-content" style={{ opacity: msg.role === 'model' && msg.isStreaming ? 0.8 : 1 }}>
                        {!msg.content && msg.isStreaming ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 2px' }}>
                            <span className="lyaxis-loading-dot" />
                            <span className="lyaxis-loading-dot" />
                            <span className="lyaxis-loading-dot" />
                          </div>
                        ) : !msg.content && !msg.isStreaming ? (
                          <span style={{ color: '#71717a', fontStyle: 'italic' }}>⚠️ Conectando con la IA...</span>
                        ) : (
                          <>
                            {renderMessageContent(msg.content, msg.isStreaming)}
                            {msg.isStreaming && <span className="lyaxis-cursor" />}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div style={{ padding: isMobile ? '10px 12px 14px' : '16px 24px 20px', borderTop: '1px solid #121216', backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', backgroundColor: '#08080c', border: '1px solid #1a1a24', borderRadius: '14px', padding: isMobile ? '8px 12px' : '12px 16px', gap: '10px', boxShadow: '0 4px 25px rgba(0,0,0,0.8)' }}>
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu mensaje a LYAXIS IA..."
                  rows={1}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: isMobile ? '13.5px' : '14px',
                    resize: 'none',
                    outline: 'none',
                    maxHeight: '140px',
                    fontFamily: 'inherit',
                  }}
                />
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dc2626', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Square size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: inputValue.trim() ? getModelColor(selectedModel) : '#1c1c24',
                      border: 'none',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: inputValue.trim() ? 'pointer' : 'default',
                      flexShrink: 0,
                      boxShadow: inputValue.trim() ? `0 0 16px ${getModelColor(selectedModel)}44` : 'none',
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
      </div>
    </GoogleOAuthProvider>
  );
}