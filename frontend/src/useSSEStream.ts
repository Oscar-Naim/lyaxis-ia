import { useState, useRef, useCallback } from 'react';
import type { Message } from './types';
import { API_BASE } from './config';

interface UseSSEStreamOptions {
  onDone?: (fullText: string) => void;
  onError?: (err: Error) => void;
}

export function useSSEStream({ onDone, onError }: UseSSEStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      messages: Message[],
      model: 'speed' | 'cortex' | 'architect' | string,
      conversationId: string | null,
      userId: string | undefined,
      onToken: (accumulated: string) => void
    ) => {
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();
      let accumulatedText = '';
      let rafId: number | null = null;
      let latestText = '';

      // Batch DOM updates at screen refresh rate instead of per-token
      const scheduleFlush = () => {
        latestText = accumulatedText;
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            onToken(latestText);
            rafId = null;
          });
        }
      };

      try {
        let sanitizedMessages = messages
          .filter((m) => m && m.content && String(m.content).trim() && !String(m.content).startsWith('⚠️') && !String(m.content).startsWith('❌'))
          .map((m) => ({
            id: m.id || undefined,
            role: (m.role === 'model' || m.role === 'assistant') ? 'model' : 'user',
            content: String(m.content).trim(),
          }));

        if (sanitizedMessages.length === 0 && messages.length > 0) {
          const last = messages[messages.length - 1];
          if (last && last.content) {
            sanitizedMessages = [{
              id: last.id || undefined,
              role: 'user',
              content: String(last.content).trim(),
            }];
          }
        }

        if (sanitizedMessages.length === 0) {
          sanitizedMessages = [{ role: 'user', content: 'Hola', id: undefined }];
        }

        const tempMap: Record<string, number> = {
          cortex: 0.3, phantom: 0.4, architect: 0.5, forge: 0.6, speed: 0.7, classic: 0.8, nexus: 0.9
        };

        const payload = {
          conversation_id: conversationId || null,
          user_id: userId || null,
          messages: sanitizedMessages,
          model: String(model || 'speed'),
          temperature: tempMap[String(model)] ?? 0.7,
        };

        const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        });

        // If server error, try to read SSE body for friendly message, fallback gracefully
        if (!response.ok) {
          let errMsg = `⚠️ Error del servidor (${response.status}). Intenta de nuevo.`;
          try {
            const errText = await response.text();
            // Try to extract a token from SSE body
            const match = errText.match(/"token"\s*:\s*"([^"]+)"/);
            if (match) errMsg = match[1];
          } catch { /* ignore */ }
          accumulatedText = errMsg;
          onToken(errMsg);
          if (onDone) onDone(errMsg);
          return;
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
                  scheduleFlush();
                }
              } catch {
                accumulatedText += dataContent;
                scheduleFlush();
              }
            }
          }
        }

        // Final flush — ensure all remaining text is rendered
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        onToken(accumulatedText);

        if (onDone) onDone(accumulatedText);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error en streaming:', err);
          const friendlyMsg = `⚠️ No se pudo conectar con LYAXIS IA. Verifica tu conexión e intenta de nuevo.`;
          onToken(friendlyMsg);
          if (onError) onError(err);
        }
      } finally {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [onDone, onError]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return { isStreaming, sendMessage, stopStreaming };
}