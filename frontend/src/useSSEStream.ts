import { useState, useRef, useCallback } from 'react';
import type { Message } from './types';
import { API_BASE } from './config';

export interface UseSSEStreamOptions {
  onDone?: (fullText: string) => void;
  onError?: (err: Error) => void;
}

export interface StreamCallOptions {
  onDone?: (fullText: string) => void;
  onError?: (err: Error) => void;
  timeoutMs?: number;
  temperature?: number;
}

export function useSSEStream({ onDone: hookOnDone, onError: hookOnError }: UseSSEStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      messages: Message[],
      model: 'speed' | 'cortex' | 'architect' | string,
      conversationId: string | null,
      userId: string | undefined,
      onToken: (accumulated: string) => void,
      options?: StreamCallOptions
    ) => {
      setIsStreaming(true);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const activeOnDone = options?.onDone || hookOnDone;
      const activeOnError = options?.onError || hookOnError;
      const timeoutMs = options?.timeoutMs ?? 65000;

      let accumulatedText = '';
      let rafId: number | null = null;
      let latestText = '';
      let timeoutTriggered = false;

      // Timer to detect Render cold start timeouts (free tier takes ~50-60s or fails with 504)
      const timeoutTimer = setTimeout(() => {
        timeoutTriggered = true;
        abortController.abort(new Error('TIMEOUT'));
      }, timeoutMs);

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
          .filter((m) => m && ((m.content && String(m.content).trim()) || m.image) && !String(m.content || '').startsWith('⚠️') && !String(m.content || '').startsWith('❌'))
          .map((m) => ({
            id: m.id || undefined,
            role: (m.role === 'model' || m.role === 'assistant') ? 'model' : 'user',
            content: String(m.content || '').trim(),
            image: m.image || undefined,
          }));

        if (sanitizedMessages.length === 0 && messages.length > 0) {
          const last = messages[messages.length - 1];
          if (last && (last.content || last.image)) {
            sanitizedMessages = [{
              id: last.id || undefined,
              role: 'user',
              content: String(last.content || '').trim(),
              image: last.image || undefined,
            }];
          }
        }

        if (sanitizedMessages.length === 0) {
          sanitizedMessages = [{ role: 'user', content: 'Hola', id: undefined, image: undefined }];
        }

        const tempMap: Record<string, number> = {
          cortex: 0.2,
          root: 0.2,
          phantom: 0.3,
          speed: 0.6,
          architect: 0.5,
          magister: 0.6,
          classic: 0.7,
          nexus: 0.8,
          forge: 0.85
        };

        const resolvedTemp = options?.temperature !== undefined
          ? options.temperature
          : (tempMap[String(model)] ?? 0.6);

        const payload = {
          conversation_id: conversationId || null,
          user_id: userId || null,
          messages: sanitizedMessages,
          model: String(model || 'speed'),
          temperature: resolvedTemp,
        };

        const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });

        // Clear timeout once connection is established and headers received
        clearTimeout(timeoutTimer);

        // Handle server errors (Render cold start 502/504 or server 500)
        if (!response.ok) {
          let errMsg = '⚠️ El servidor tardó en responder o está iniciando. Por favor, reintenta en unos segundos.';
          if (response.status >= 500) {
            errMsg = '⚠️ El servidor tardó en responder o está iniciando. Por favor, reintenta en unos segundos.';
          } else {
            errMsg = `⚠️ Error del servidor (${response.status}). Intenta de nuevo.`;
          }

          try {
            const errText = await response.text();
            // Try to extract a token or error from SSE body if JSON
            const matchToken = errText.match(/"token"\s*:\s*"([^"]+)"/);
            const matchErr = errText.match(/"error"\s*:\s*"([^"]+)"/);
            if (matchToken) {
              errMsg = matchToken[1];
            } else if (matchErr) {
              errMsg = matchErr[1];
            }
          } catch {
            // ignore JSON parse errors on HTML 502/504 pages
          }

          accumulatedText = errMsg;
          onToken(errMsg);
          const errorObj = new Error(errMsg);
          if (activeOnError) activeOnError(errorObj);
          return;
        }

        if (!response.body) {
          const errBody = new Error('La respuesta no incluye cuerpo de streaming.');
          if (activeOnError) activeOnError(errBody);
          return;
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
                if (parsed.error && !parsed.token) {
                  accumulatedText += `\n\n⚠️ ${parsed.error}`;
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

        if (activeOnDone) activeOnDone(accumulatedText);
      } catch (err: any) {
        clearTimeout(timeoutTimer);
        const isAbort = err.name === 'AbortError' && !timeoutTriggered;
        if (!isAbort) {
          console.error('Error en streaming / red:', err);
          let friendlyMsg = '⚠️ El servidor tardó en responder o está iniciando. Por favor, reintenta en unos segundos.';
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            friendlyMsg = '⚠️ Sin conexión a internet. Verifica tu red y reintenta.';
          }
          accumulatedText = friendlyMsg;
          onToken(friendlyMsg);
          const errInstance = err instanceof Error ? err : new Error(friendlyMsg);
          if (activeOnError) activeOnError(errInstance);
        }
      } finally {
        clearTimeout(timeoutTimer);
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [hookOnDone, hookOnError]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    isStreaming,
    sendMessage,
    startStream: sendMessage,
    stopStreaming
  };
}

export const useStream = useSSEStream;