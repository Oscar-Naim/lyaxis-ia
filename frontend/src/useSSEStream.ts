import { useState, useRef, useCallback } from 'react';
import type { Message } from './types';

interface UseSSEStreamOptions {
  apiBaseUrl?: string;
  onDone?: (fullText: string) => void;
  onError?: (err: Error) => void;
}

const getCleanApiBase = (customUrl?: string) => {
  let url = customUrl || import.meta.env.VITE_API_BASE || 'https://lyaxis-ia.onrender.com';
  url = url.trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
};

export function useSSEStream({ apiBaseUrl, onDone, onError }: UseSSEStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      messages: Message[],
      model: 'speed' | 'cortex' | 'architect' | string,
      conversationId: string | null,
      onToken: (accumulated: string) => void
    ) => {
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();
      let accumulatedText = '';

      // Fuerza la URL absoluta hacia Render sin prefijo de Vercel
      const baseUrl = getCleanApiBase(apiBaseUrl);

      try {
        const payload = {
          conversation_id: conversationId,
          messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
          model,
          temperature: model === 'cortex' ? 0.3 : model === 'architect' ? 0.5 : 0.7,
        };

        const response = await fetch(`${baseUrl}/api/v1/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Error en el servidor: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('La respuesta no incluye cuerpo de streaming.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataContent = trimmed.slice(6);
              try {
                const parsed = JSON.parse(dataContent);
                if (parsed.token) {
                  accumulatedText += parsed.token;
                  onToken(accumulatedText);
                }
              } catch {
                accumulatedText += dataContent;
                onToken(accumulatedText);
              }
            }
          }
        }

        if (onDone) onDone(accumulatedText);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error en streaming:', err);
          if (onError) onError(err);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [apiBaseUrl, onDone, onError]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return { isStreaming, sendMessage, stopStreaming };
}