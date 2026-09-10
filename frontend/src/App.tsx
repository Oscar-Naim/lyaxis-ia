import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { ModelType, ModelId, Message, Conversation, User } from './types';
import { ALL_MODELS, API_BASE, GOOGLE_CLIENT_ID, THEMES } from './config';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { AuthModal } from './AuthModal';
import { FuturisticDashboardModal } from './FuturisticDashboardModal';
import { LyaxisInfoDrawer } from './LyaxisInfoDrawer';
import { InstallPwaPrompt } from './InstallPwaPrompt';
import { BootSplash } from './components/BootSplash';
import { exportChatToPDF } from './pdfExporter';
import { isSoundMuted, setSoundMuted, playCyberClick } from './sound';

export default function App() {
  const [showBoot, setShowBoot] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('lyaxis_boot_seen') !== 'true' : false
  );
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [infoDrawerTab, setInfoDrawerTab] = useState<'manifesto' | 'ecosystem' | 'security' | 'terms'>('manifesto');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 768));

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? !isSoundMuted() : true;
  });

  const [isScanlineActive, setIsScanlineActive] = useState(false);
  const [isChromaticActive, setIsChromaticActive] = useState(false);

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
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const currentUid = user?.id || guestId;
      const sanitized = parsed.filter(
        (c: any) => c && c.userId && c.userId !== 'anon' && c.userId === currentUid
      );
      if (sanitized.length !== parsed.length) {
        localStorage.setItem('lyaxis_conversations', JSON.stringify(sanitized));
      }
      return sanitized;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lyaxis_conversations', JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelId>('speed');

  useEffect(() => {
    try {
      localStorage.setItem('lyaxis_active_model', selectedModel);
      localStorage.setItem('lyaxis_selected_model', selectedModel);
    } catch {}
  }, [selectedModel]);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      try {
        localStorage.setItem(`lyaxis_msgs_${currentChatId}`, JSON.stringify(messages));
      } catch {}
    }
  }, [currentChatId, messages]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
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

  const openInfoDrawer = (tab: 'manifesto' | 'ecosystem' | 'security' | 'terms' = 'manifesto') => {
    setInfoDrawerTab(tab);
    setIsInfoDrawerOpen(true);
    if (soundEnabled) playCyberClick();
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('lyaxis_user', JSON.stringify(loggedInUser));
    fetchConversations(loggedInUser.id);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lyaxis_user');
    setConversations([]);
    setMessages([]);
    setCurrentChatId(null);
    fetchConversations(guestId);
  };

  const fetchConversations = async (targetUserId?: string) => {
    try {
      const uid = targetUserId !== undefined ? targetUserId : activeUserId;
      if (!uid || uid === 'anon') {
        setConversations([]);
        return;
      }
      const url = `${API_BASE}/api/v1/conversations?user_id=${encodeURIComponent(uid)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const loaded = data
            .filter((c: any) => c && c.user_id && c.user_id !== 'anon')
            .map((c: any) => ({
              id: c.id,
              userId: c.user_id || uid,
              title: c.title || 'Nueva conversación',
              createdAt: c.created_at || new Date().toISOString(),
              model: c.model || 'speed',
            }));
          setConversations(loaded);
          setCurrentChatId((curr) => {
            if (!curr && loaded.length > 0) {
              loadMessages(loaded[0].id);
              // Always maintain 'speed' as the default model when opening the app
              return loaded[0].id;
            }
            return curr;
          });
        }
      }
    } catch (e) {
      console.warn('Aviso cargando conversaciones:', e);
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
      console.warn('Aviso cargando mensajes:', e);
    }
  };

  useEffect(() => {
    fetchConversations(activeUserId);
  }, [user, activeUserId]);

  const selectConversation = (chat: Conversation) => {
    setCurrentChatId(chat.id);
    if (chat.model && (ALL_MODELS as readonly string[]).includes(chat.model)) {
      setSelectedModel(chat.model as ModelId);
    }
    loadMessages(chat.id);
    if (isMobile) setIsSidebarOpen(false);
  };

  const switchModel = async (newModel: ModelType) => {
    if (newModel === selectedModel) return;
    if (soundEnabled) playCyberClick();
    setIsScanlineActive(true);
    setIsChromaticActive(true);
    setTimeout(() => setIsScanlineActive(false), 750);
    setTimeout(() => setIsChromaticActive(false), 450);

    setSelectedModel(newModel);

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
            user_id: activeUserId,
            model: newModel,
          }),
        });
      } catch (err) {
        console.warn('Aviso actualizando modelo de conversación:', err);
      }
    }
  };

  const handleNewConversation = async (modelOverride?: ModelType) => {
    const cid = `chat-${Date.now()}`;
    const modelToUse = modelOverride || 'speed';
    setSelectedModel('speed');
    try {
      localStorage.setItem('lyaxis_active_model', 'speed');
      localStorage.setItem('lyaxis_selected_model', 'speed');
    } catch {}
    const uid = activeUserId;
    const newChat: Conversation = {
      id: cid,
      userId: uid,
      title: 'Nueva conversación',
      createdAt: new Date().toISOString(),
      model: modelToUse,
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
          model: modelToUse,
        }),
      });
    } catch (err) {
      console.warn('Aviso persistiendo conversación en backend:', err);
    }
  };

  const handleDeleteConversation = async (chatId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/v1/conversations/${chatId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error eliminando conversación en backend:', err);
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

  const deleteAllConversations = async () => {
    try {
      await fetch(`${API_BASE}/api/v1/conversations/all?user_id=${activeUserId}`, { method: 'DELETE' });
      setConversations([]);
      setMessages([]);
      setCurrentChatId(null);
    } catch (err) {
      console.error('Error vaciando historial:', err);
    }
  };

  const currentTheme = THEMES[selectedModel] || THEMES.speed;

  useEffect(() => {
    document.documentElement.style.setProperty('--current-glow', currentTheme.glow);
    document.documentElement.style.setProperty('--current-primary', currentTheme.primary);
  }, [selectedModel, currentTheme]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {showBoot && <BootSplash onFinish={() => setShowBoot(false)} onComplete={() => setShowBoot(false)} />}
      <div
        className={`lyaxis-app-container ${isScanlineActive ? 'scanline-active' : ''}`}
        style={{
          '--current-glow': currentTheme.glow,
          '--current-primary': currentTheme.primary,
        } as React.CSSProperties}
      >
        <Sidebar
          isOpen={isSidebarOpen}
          isMobile={isMobile}
          onClose={() => setIsSidebarOpen(false)}
          onNewChat={() => handleNewConversation('speed')}
          onHomeClick={() => handleNewConversation('speed')}
          onOpenManifesto={() => openInfoDrawer('manifesto')}
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          conversations={conversations}
          currentChatId={currentChatId}
          onSelectConversation={selectConversation}
          onDeleteConversation={handleDeleteConversation}
          onDeleteAllConversations={deleteAllConversations}
          selectedModel={selectedModel}
          onSelectModel={(m) => switchModel(m)}
          soundMuted={!soundEnabled}
          onToggleSoundMute={toggleSound}
        />

        <ChatView
          messages={messages}
          setMessages={setMessages}
          selectedModel={selectedModel}
          setSelectedModel={switchModel}
          currentChatId={currentChatId}
          setCurrentChatId={setCurrentChatId}
          activeUserId={activeUserId}
          isMobile={isMobile}
          soundEnabled={soundEnabled}
          playCyberClick={playCyberClick}
          onConversationUpdated={() => fetchConversations(activeUserId)}
          onExportPDF={exportChatToPDF}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          onOpenDashboard={() => setIsDashboardOpen(true)}
          onOpenInfoDrawer={openInfoDrawer}
          isScanlineActive={isScanlineActive}
          isChromaticActive={isChromaticActive}
        />

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

        <InstallPwaPrompt />
      </div>
    </GoogleOAuthProvider>
  );
}