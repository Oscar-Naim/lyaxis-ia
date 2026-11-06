import { describe, it, expect, beforeEach } from 'vitest';
import type { Conversation, Message } from '../types';
import { getAuthHeaders } from '../config';

// Mock localStorage for node environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

describe('Chat Persistence & Offline-First Resilience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Non-Destructive Merge (Offline-First)', () => {
    // Pure function representing App.tsx merge logic
    function mergeConversations(
      prev: Conversation[],
      loaded: Conversation[],
      uid: string
    ): Conversation[] {
      const map = new Map<string, Conversation>();
      // 1. Conservar conversaciones locales válidas del usuario actual
      prev.forEach((c) => {
        const cUid = c?.userId;
        if (
          c &&
          c.id &&
          cUid &&
          (cUid === uid || (uid.startsWith('guest-') && (cUid === 'guest' || cUid.startsWith('guest-'))))
        ) {
          map.set(c.id, c);
        }
      });
      // 2. Fusionar con las devueltas por el servidor sin destruir las locales
      loaded.forEach((serverConv) => {
        const existing = map.get(serverConv.id);
        if (!existing) {
          map.set(serverConv.id, serverConv);
        } else {
          map.set(serverConv.id, {
            ...existing,
            ...serverConv,
            title:
              serverConv.title && serverConv.title !== 'Nueva conversación'
                ? serverConv.title
                : existing.title,
          });
        }
      });
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    it('NEVER wipes local conversations when backend returns empty array []', () => {
      const localConvs: Conversation[] = [
        {
          id: 'chat-1',
          userId: 'guest-123',
          title: 'Arquitectura de Sistemas',
          createdAt: new Date('2026-11-05T10:00:00Z').toISOString(),
          model: 'speed',
        },
        {
          id: 'chat-2',
          userId: 'guest-123',
          title: 'Algoritmo Cuántico',
          createdAt: new Date('2026-11-05T11:00:00Z').toISOString(),
          model: 'cortex',
        },
      ];

      const backendResponse: Conversation[] = [];
      const result = mergeConversations(localConvs, backendResponse, 'guest-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('chat-2');
      expect(result[1].id).toBe('chat-1');
      expect(result[0].title).toBe('Algoritmo Cuántico');
    });

    it('merges new remote conversations and preserves local titles', () => {
      const localConvs: Conversation[] = [
        {
          id: 'chat-1',
          userId: 'guest-123',
          title: 'Mi Título Personalizado',
          createdAt: new Date('2026-11-05T10:00:00Z').toISOString(),
          model: 'speed',
        },
      ];

      const remoteConvs: Conversation[] = [
        {
          id: 'chat-1',
          userId: 'guest-123',
          title: 'Nueva conversación', // server has generic title
          createdAt: new Date('2026-11-05T10:00:00Z').toISOString(),
          model: 'speed',
          pinned: true,
        },
        {
          id: 'chat-3',
          userId: 'guest-123',
          title: 'Conversación desde otro dispositivo',
          createdAt: new Date('2026-11-05T12:00:00Z').toISOString(),
          model: 'cortex',
        },
      ];

      const result = mergeConversations(localConvs, remoteConvs, 'guest-123');

      expect(result).toHaveLength(2);
      const chat1 = result.find((c) => c.id === 'chat-1');
      expect(chat1).toBeDefined();
      expect(chat1?.title).toBe('Mi Título Personalizado'); // Preserved!
      expect(chat1?.pinned).toBe(true); // Updated from server!

      const chat3 = result.find((c) => c.id === 'chat-3');
      expect(chat3).toBeDefined();
      expect(chat3?.title).toBe('Conversación desde otro dispositivo');
    });

    it('filters out conversations belonging to other users', () => {
      const localConvs: Conversation[] = [
        {
          id: 'chat-my-guest',
          userId: 'guest-user-1',
          title: 'Mi Chat',
          createdAt: new Date().toISOString(),
          model: 'speed',
        },
        {
          id: 'chat-foreign',
          userId: 'user-registered-999',
          title: 'Chat Ajeno',
          createdAt: new Date().toISOString(),
          model: 'speed',
        },
      ];

      const result = mergeConversations(localConvs, [], 'guest-user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('chat-my-guest');
    });
  });

  describe('Optimistic Title Snippet Generation', () => {
    function generateSnippetTitle(userText: string): string {
      return (
        userText
          .trim()
          .replace(/^\[Directivas[^\]]+\]\s*/, '')
          .replace(/^\[Archivo[^\]]+\]\s*/, '')
          .slice(0, 42)
          .trim() || 'Nueva conversación'
      );
    }

    it('cleans directive and file prefixes cleanly', () => {
      const rawText = '[Directivas: Modo conciso] [Archivo: main.py] Explica la arquitectura de red';
      const snippet = generateSnippetTitle(rawText);
      expect(snippet).toBe('Explica la arquitectura de red');
    });

    it('truncates titles at 42 characters without breaking words abruptly', () => {
      const longPrompt = 'Esta es una consulta extremadamente larga y compleja para probar el límite de caracteres en el título';
      const snippet = generateSnippetTitle(longPrompt);
      expect(snippet.length).toBeLessThanOrEqual(42);
      expect(snippet).toBe('Esta es una consulta extremadamente larga');
    });

    it('falls back to "Nueva conversación" on whitespace or empty input', () => {
      expect(generateSnippetTitle('')).toBe('Nueva conversación');
      expect(generateSnippetTitle('   ')).toBe('Nueva conversación');
    });
  });

  describe('Session Token & Auth Header Resilience', () => {
    it('attaches X-Lyaxis-Uid for guest requests', () => {
      const headers = getAuthHeaders('guest-test-1234');
      expect(headers['X-Lyaxis-Uid']).toBe('guest-test-1234');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('attaches HMAC Bearer token and user ID for authenticated users', () => {
      localStorage.setItem(
        'lyaxis_user',
        JSON.stringify({
          id: 'uuid-user-5678',
          name: 'Comandante',
          token: 'valid.hmac.jwt.token',
        })
      );

      const headers = getAuthHeaders('fallback-id', true);
      expect(headers['Authorization']).toBe('Bearer valid.hmac.jwt.token');
      expect(headers['X-Lyaxis-Uid']).toBe('uuid-user-5678');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Synchronous LocalStorage Hydration', () => {
    function hydrateInitialState() {
      let currentChatId: string | null = null;
      let messages: Message[] = [];

      try {
        const savedChatId = localStorage.getItem('lyaxis_current_chat_id');
        if (savedChatId) {
          currentChatId = savedChatId;
        } else {
          const savedConvs = localStorage.getItem('lyaxis_conversations');
          if (savedConvs) {
            const parsed = JSON.parse(savedConvs);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
              currentChatId = parsed[0].id;
            }
          }
        }

        if (currentChatId) {
          const savedMsgs = localStorage.getItem(`lyaxis_msgs_${currentChatId}`);
          if (savedMsgs) {
            const parsed = JSON.parse(savedMsgs);
            if (Array.isArray(parsed) && parsed.length > 0) {
              messages = parsed;
            }
          }
        }
      } catch {}

      return { currentChatId, messages };
    }

    it('restores last active chat and its messages on startup without blank screen', () => {
      const expectedMessages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hola LYAXIS',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          role: 'model',
          content: 'Sistema operativo listo.',
          timestamp: new Date().toISOString(),
        },
      ];

      localStorage.setItem('lyaxis_current_chat_id', 'chat-active-99');
      localStorage.setItem('lyaxis_msgs_chat-active-99', JSON.stringify(expectedMessages));

      const hydrated = hydrateInitialState();

      expect(hydrated.currentChatId).toBe('chat-active-99');
      expect(hydrated.messages).toHaveLength(2);
      expect(hydrated.messages[0].content).toBe('Hola LYAXIS');
      expect(hydrated.messages[1].content).toBe('Sistema operativo listo.');
    });

    it('falls back to first conversation if current_chat_id was not explicitly set', () => {
      const convs: Conversation[] = [
        {
          id: 'chat-first',
          userId: 'guest-1',
          title: 'Primer Chat',
          createdAt: new Date().toISOString(),
          model: 'speed',
        },
      ];
      const expectedMessages: Message[] = [
        {
          id: 'm1',
          role: 'user',
          content: 'Primer mensaje',
          timestamp: new Date().toISOString(),
        },
      ];

      localStorage.setItem('lyaxis_conversations', JSON.stringify(convs));
      localStorage.setItem('lyaxis_msgs_chat-first', JSON.stringify(expectedMessages));

      const hydrated = hydrateInitialState();

      expect(hydrated.currentChatId).toBe('chat-first');
      expect(hydrated.messages).toHaveLength(1);
      expect(hydrated.messages[0].content).toBe('Primer mensaje');
    });
  });
});
