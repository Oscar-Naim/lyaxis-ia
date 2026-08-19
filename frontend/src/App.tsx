import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Send, Square, Sparkles, Brain, Compass, Plus, Trash2, Terminal, Home, Volume2, VolumeX, ChevronDown, ChevronRight, Cpu, LogOut, LogIn, Menu, X } from 'lucide-react';
import type { Message, Conversation, User } from './types';
import { useSSEStream } from './useSSEStream';
import { CodeBlock } from './CodeBlock';
import { LandingPage } from './LandingPage';
import { AuthModal } from './AuthModal';
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
  if (!thoughtText.trim()) return null;

  return (
    <div style={{ margin: '0 0 14px 0', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(124, 58, 237, 0.35)', backgroundColor: 'rgba(12, 8, 20, 0.7)', boxShadow: '0 0 18px rgba(124, 58, 237, 0.15)' }}>
      <button
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const [user, setUser] = useState<User | null>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('lyaxis_user') : null;
    return saved ? JSON.parse(saved) : null;
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'speed' | 'cortex' | 'architect'>('speed');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('lyaxis_sound') === 'true' : false;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    fetchConversations(undefined);
  };

  const { isStreaming, sendMessage, stopStreaming } = useSSEStream({
    onDone: () => {
      fetchConversations(user?.id);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `⚠️ Aviso de conexión: ${err.message}. Si el servidor estaba inactivo, se activará en unos segundos.`,
          timestamp: new Date().toISOString(),
        }
      ]);
    }
  });

  const fetchConversations = async (userId?: string) => {
    try {
      const url = userId ? `${API_BASE}/api/v1/conversations?user_id=${userId}` : `${API_BASE}/api/v1/conversations`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !currentChatId) {
          setCurrentChatId(data[0].id);
          loadMessages(data[0].id);
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
    fetchConversations(user?.id);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (chatId: string) => {
    if (isStreaming) return;
    setCurrentChatId(chatId);
    loadMessages(chatId);
    if (isMobile) setIsSidebarOpen(false);
  };

  const createNewChat = () => {
    if (isStreaming) return;
    const localId = `chat-${Date.now()}`;
    const newChat: Conversation = {
      id: localId,
      userId: user?.id,
      title: 'Nueva conversación',
      createdAt: new Date().toISOString(),
      model: selectedModel
    };
    setConversations((prev) => [newChat, ...prev]);
    setCurrentChatId(localId);
    setMessages([]);
    if (isMobile) setIsSidebarOpen(false);

    try {
      fetch(`${API_BASE}/api/v1/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, title: 'Nueva conversación', model: selectedModel })
      });
    } catch {}
  };

  const deleteConversation = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      fetch(`${API_BASE}/api/v1/conversations/${chatId}`, { method: 'DELETE' });
      const updated = conversations.filter((c) => c.id !== chatId);
      setConversations(updated);
      if (currentChatId === chatId) {
        if (updated.length > 0) {
          setCurrentChatId(updated[0].id);
          loadMessages(updated[0].id);
        } else {
          createNewChat();
        }
      }
    } catch (err) {
      console.error("Error eliminando conversación:", err);
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
        userId: user?.id,
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
    };

    const assistantPlaceholderId = `model-${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'model',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, assistantMessage]);

    await sendMessage(updatedMessages, selectedModel, targetChatId, (accumulatedText) => {
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
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children || '').replace(/\n$/, '');
                  if (!inline && match) {
                    return <CodeBlock language={match} codeString={codeString} />;
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
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children || '').replace(/\n$/, '');
            if (!inline && match) {
              return <CodeBlock language={match} codeString={codeString} />;
            }
            return <code style={{ backgroundColor: '#111118', color: '#00D9FF', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontFamily: "'JetBrains Mono', Consolas, monospace" }} {...props}>{children}</code>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const getModelLabel = (modelKey: 'speed' | 'cortex' | 'architect') => {
    if (modelKey === 'architect') return 'Architect';
    if (modelKey === 'cortex') return 'Cortex';
    return 'Speed';
  };

  const getModelColor = (modelKey: 'speed' | 'cortex' | 'architect') => {
    if (modelKey === 'architect') return '#10B981';
    if (modelKey === 'cortex') return '#7C3AED';
    return '#2563FF';
  };

  if (view === 'landing') {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <LandingPage onEnterChat={() => setView('chat')} onOpenAuth={() => setIsAuthOpen(true)} />
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onLoginSuccess={handleLoginSuccess} />
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="cyber-grid-bg" style={{ display: 'flex', width: '100vw', height: '100vh', color: '#ffffff', position: 'relative', overflow: 'hidden' }}>
        
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
            width: '280px',
            backgroundColor: '#000000',
            borderRight: '1px solid #141418',
            display: !isMobile || isSidebarOpen ? 'flex' : 'none',
            flexDirection: 'column',
            padding: '16px',
            flexShrink: 0,
            boxShadow: isMobile ? '10px 0 40px rgba(0,0,0,0.9)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #141418' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                onClick={() => setView('landing')}
                title="Volver a la portada"
                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }}
              >
                <Home size={17} />
              </button>
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }}
                >
                  <X size={18} />
                </button>
              )}
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
                onClick={() => setIsAuthOpen(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#00D9FF', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                <LogIn size={15} />
                <span>Iniciar sesión</span>
              </button>
            )}
            {user && (
              <button onClick={handleLogout} title="Cerrar sesión" style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}>
                <LogOut size={14} />
              </button>
            )}
          </div>

          <button
            onClick={createNewChat}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', backgroundColor: '#0a0a0e', border: '1px solid #1c1c24', borderRadius: '8px', color: '#ffffff', fontSize: '13px', cursor: 'pointer', marginBottom: '16px' }}
          >
            <Plus size={16} /> Nuevo Chat
          </button>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Historial</span>
            {conversations.map((chat) => (
              <div
                key={chat.id}
                onClick={() => selectConversation(chat.id)}
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
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.title}</span>
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
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'transparent', minWidth: 0, width: '100%' }}>
          {/* Header */}
          <header style={{ minHeight: '58px', borderBottom: '1px solid #141418', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 12px' : '0 24px', backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', flexShrink: 0, gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  style={{ background: 'none', border: '1px solid #1c1c24', color: '#ffffff', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Menu size={18} />
                </button>
              )}

              {/* Selector de Motores */}
              <div style={{ display: 'flex', backgroundColor: '#08080c', padding: '2px', borderRadius: '8px', border: '1px solid #181822' }}>
                <button
                  onClick={() => setSelectedModel('speed')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: isMobile ? '5px 8px' : '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: selectedModel === 'speed' ? '#2563FF' : 'transparent',
                    color: '#ffffff',
                  }}
                >
                  <Sparkles size={12} /> Speed
                </button>
                <button
                  onClick={() => setSelectedModel('cortex')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: isMobile ? '5px 8px' : '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: selectedModel === 'cortex' ? '#7C3AED' : 'transparent',
                    color: '#ffffff',
                  }}
                >
                  <Brain size={12} /> Cortex
                </button>
                <button
                  onClick={() => setSelectedModel('architect')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: isMobile ? '5px 8px' : '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: isMobile ? '11px' : '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: selectedModel === 'architect' ? '#10B981' : 'transparent',
                    color: '#ffffff',
                  }}
                >
                  <Compass size={12} /> Architect
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!user && (
                <button
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
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `linear-gradient(135deg, ${getModelColor(selectedModel)}, #00D9FF)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${getModelColor(selectedModel)}44` }}>
                    {selectedModel === 'architect' ? <Compass size={24} color="#ffffff" /> : selectedModel === 'cortex' ? <Brain size={24} color="#ffffff" /> : <Terminal size={24} color="#ffffff" />}
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    LYAXIS {getModelLabel(selectedModel)}
                  </h2>
                  <p style={{ fontSize: '13.5px', maxWidth: '480px', margin: 0, lineHeight: '1.5', color: '#a1a1aa' }}>
                    {selectedModel === 'architect'
                      ? 'Módulo de arquitectura de prompts y mentoría técnica.'
                      : selectedModel === 'cortex'
                      ? 'Motor de razonamiento profundo para algoritmos y arquitectura.'
                      : 'Asistente de desarrollo ágil y streaming ultrarrápido de LYAXIS labs.'}
                  </p>
                </div>
              ) : (
                messages.map((msg, msgIndex) => (
                  <div
                    key={msg.id || msgIndex}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: msg.role === 'user' ? (isMobile ? '90%' : '80%') : '100%',
                      width: msg.role === 'user' ? 'auto' : '100%',
                      backgroundColor: msg.role === 'user' ? '#111116' : 'rgba(6, 6, 9, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: msg.role === 'user' ? '1px solid #22222c' : '1px solid #14141c',
                      borderRadius: '14px',
                      padding: isMobile ? '12px 14px' : '16px 20px',
                      fontSize: isMobile ? '13.5px' : '14.5px',
                      lineHeight: '1.6',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                      overflowWrap: 'break-word',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#71717a' }}>
                      <span style={{ fontWeight: 600, color: msg.role === 'user' ? '#a1a1aa' : getModelColor(selectedModel) }}>
                        {msg.role === 'user' ? 'Tú' : `LYAXIS ${getModelLabel(selectedModel)}`}
                      </span>
                    </div>
                    <div style={{ color: '#e4e4e7', overflowWrap: 'break-word' }}>
                      {!msg.content && msg.isStreaming ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 2px' }}>
                          <span className="lyaxis-loading-dot" />
                          <span className="lyaxis-loading-dot" />
                          <span className="lyaxis-loading-dot" />
                        </div>
                      ) : (
                        <>
                          {renderMessageContent(msg.content, msg.isStreaming)}
                          {msg.isStreaming && <span className="lyaxis-cursor" />}
                        </>
                      )}
                    </div>
                  </div>
                ))
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
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
      </div>
    </GoogleOAuthProvider>
  );
}