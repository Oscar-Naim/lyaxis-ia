import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Send, Square, Sparkles, Brain, Compass, Plus, Trash2, Terminal, Home, Volume2, VolumeX, ChevronDown, ChevronRight, Cpu, LogOut, LogIn } from 'lucide-react';
import type { Message, Conversation, User } from './types';
import { useSSEStream } from './useSSEStream';
import { CodeBlock } from './CodeBlock';
import { LandingPage } from './LandingPage';
import { AuthModal } from './AuthModal';

const API_BASE = 'http://localhost:8000';
const GOOGLE_CLIENT_ID = "789123456789-lyaxisexample.apps.googleusercontent.com";

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
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lyaxis_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'speed' | 'cortex' | 'architect'>('speed');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('lyaxis_sound') === 'true';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          id: Date.now().toString(),
          role: 'model',
          content: `⚠️ Error de conexión: ${err.message}`,
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
        } else if (data.length === 0) {
          createNewChat();
        }
      }
    } catch (e) {
      console.error("Error cargando conversaciones:", e);
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
      console.error("Error cargando mensajes:", e);
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
  };

  const createNewChat = async () => {
    if (isStreaming) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, title: 'Nueva conversación', model: selectedModel })
      });
      if (res.ok) {
        const newChat = await res.json();
        setConversations((prev) => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setMessages([]);
      }
    } catch (e) {
      console.error("Error creando chat:", e);
    }
  };

  const deleteConversation = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/v1/conversations/${chatId}`, { method: 'DELETE' });
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
    if (!textToSend.trim() || isStreaming) return;

    let targetChatId = currentChatId;
    if (!targetChatId) {
      const res = await fetch(`${API_BASE}/api/v1/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, title: textToSend.trim().slice(0, 30), model: selectedModel })
      });
      const newChat = await res.json();
      targetChatId = newChat.id;
      setCurrentChatId(targetChatId);
      setConversations((prev) => [newChat, ...prev]);
    }

    const userText = textToSend.trim();
    setInputValue('');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    const assistantPlaceholderId = (Date.now() + 1).toString();
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
    if (modelKey === 'architect') return 'LYAXIS Architect';
    if (modelKey === 'cortex') return 'LYAXIS Cortex';
    return 'LYAXIS Speed';
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
      <div className="cyber-grid-bg" style={{ display: 'flex', width: '100vw', height: '100vh', color: '#ffffff' }}>
        {/* Sidebar */}
        <aside style={{ width: '280px', backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', borderRight: '1px solid #141418', display: 'flex', flexDirection: 'column', padding: '16px', flexShrink: 0 }}>
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
            <button
              onClick={() => setView('landing')}
              title="Volver a la portada"
              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            >
              <Home size={17} />
            </button>
          </div>

          {/* Tarjeta de Usuario / Iniciar Sesión */}
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
                <span>Iniciar sesión / Registrarse</span>
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
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'transparent', minWidth: 0 }}>
          {/* Header */}
          <header style={{ height: '60px', borderBottom: '1px solid #141418', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Motor:</span>
              <div style={{ display: 'flex', backgroundColor: '#08080c', padding: '3px', borderRadius: '8px', border: '1px solid #181822' }}>
                <button
                  onClick={() => setSelectedModel('speed')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: selectedModel === 'speed' ? '#2563FF' : 'transparent',
                    color: '#ffffff',
                  }}
                >
                  <Sparkles size={13} /> Speed
                </button>
                <button
                  onClick={() => setSelectedModel('cortex')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: selectedModel === 'cortex' ? '#7C3AED' : 'transparent',
                    color: '#ffffff',
                  }}
                >
                  <Brain size={13} /> Cortex
                </button>
                <button
                  onClick={() => setSelectedModel('architect')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: selectedModel === 'architect' ? '#10B981' : 'transparent',
                    color: '#ffffff',
                  }}
                >
                  <Compass size={13} /> Architect
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {!user && (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#121218',
                    border: '1px solid #22222e',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <LogIn size={14} />
                  <span>Acceder</span>
                </button>
              )}
              <button
                onClick={toggleSound}
                title={soundEnabled ? "Silenciar sonido de tecleo" : "Activar sonido de tecleo cibernético"}
                style={{
                  background: 'none',
                  border: '1px solid #1c1c26',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: soundEnabled ? '#00D9FF' : '#52525b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  backgroundColor: soundEnabled ? '#00D9FF11' : 'transparent',
                }}
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                <span>{soundEnabled ? 'Audio ON' : 'Mute'}</span>
              </button>
              <span style={{ fontSize: '12px', color: '#52525b' }}>v1.0-beta</span>
            </div>
          </header>

          {/* Scrollable Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ maxWidth: '860px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px', flex: 1 }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#71717a', gap: '16px', textAlign: 'center', minHeight: '50vh' }}>
                  <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: `linear-gradient(135deg, ${getModelColor(selectedModel)}, #00D9FF)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${getModelColor(selectedModel)}44` }}>
                    {selectedModel === 'architect' ? <Compass size={28} color="#ffffff" /> : selectedModel === 'cortex' ? <Brain size={28} color="#ffffff" /> : <Terminal size={28} color="#ffffff" />}
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    {getModelLabel(selectedModel)}
                  </h2>
                  <p style={{ fontSize: '14px', maxWidth: '520px', margin: 0, lineHeight: '1.5', color: '#a1a1aa' }}>
                    {selectedModel === 'architect'
                      ? 'Módulo de arquitectura de prompts y mentoría técnica. Pídeme diseñar un System Prompt para producción o explicarte cualquier concepto técnico paso a paso.'
                      : selectedModel === 'cortex'
                      ? 'Motor de razonamiento profundo para arquitecturas de sistemas, algoritmos y depuración compleja.'
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
                      maxWidth: msg.role === 'user' ? '80%' : '100%',
                      width: msg.role === 'user' ? 'auto' : '100%',
                      backgroundColor: msg.role === 'user' ? '#111116' : 'rgba(6, 6, 9, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: msg.role === 'user' ? '1px solid #22222c' : '1px solid #14141c',
                      borderRadius: '14px',
                      padding: '16px 20px',
                      fontSize: '14.5px',
                      lineHeight: '1.65',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11.5px', color: '#71717a' }}>
                      <span style={{ fontWeight: 600, color: msg.role === 'user' ? '#a1a1aa' : getModelColor(selectedModel) }}>
                        {msg.role === 'user' ? 'Tú' : getModelLabel(selectedModel)}
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
          <div style={{ padding: '16px 24px 20px', borderTop: '1px solid #121216', backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
            <div style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', backgroundColor: '#08080c', border: '1px solid #1a1a24', borderRadius: '14px', padding: '12px 16px', gap: '12px', boxShadow: '0 4px 25px rgba(0,0,0,0.8)' }}>
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedModel === 'cortex' ? "Pídeme analizar un algoritmo o arquitectura profunda..." : selectedModel === 'architect' ? "Pídeme diseñar un System Prompt o explicarte un concepto..." : "Escribe tu mensaje a LYAXIS IA..."}
                  rows={1}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '14px',
                    resize: 'none',
                    outline: 'none',
                    maxHeight: '160px',
                    fontFamily: 'inherit',
                  }}
                />
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dc2626', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Square size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
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
                      transition: 'background-color 0.2s',
                      boxShadow: inputValue.trim() ? `0 0 16px ${getModelColor(selectedModel)}44` : 'none',
                    }}
                  >
                    <Send size={16} />
                  </button>
                )}
              </div>
              <div style={{ textAlign: 'center', fontSize: '11px', color: '#44444e', marginTop: '8px' }}>
                LYAXIS IA • Modo {getModelLabel(selectedModel)} activo
              </div>
            </div>
          </div>
        </main>

        {/* Modal de Autenticación */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    </GoogleOAuthProvider>
  );
}