import { useState, useRef, useCallback, useEffect } from 'react';
import type { Message, MessageUsage } from './types';
import { API_BASE, getAuthHeaders } from './config';

export type TriadCoreType = 'create' | 'break' | 'rebuild';

export interface TriadState {
  create: string;
  break: string;
  rebuild: string;
}

/**
 * Normaliza el objeto `usage` del backend (snake_case en SSE / BD) a `MessageUsage`.
 * Devuelve `undefined` si no hay datos utilizables.
 */
export function normalizeUsage(raw: any): MessageUsage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const prompt = Number(raw.prompt_tokens ?? raw.promptTokens ?? 0) || 0;
  const completion = Number(raw.completion_tokens ?? raw.completionTokens ?? 0) || 0;
  const totalRaw = Number(raw.total_tokens ?? raw.totalTokens ?? 0) || 0;
  const total = totalRaw || prompt + completion;
  const modelUsedRaw = raw.model_used ?? raw.modelUsed;
  const modelUsed = Array.isArray(modelUsedRaw)
    ? modelUsedRaw.filter(Boolean).join(' + ')
    : modelUsedRaw && typeof modelUsedRaw === 'object'
      ? Object.values(modelUsedRaw).filter(Boolean).join(' + ')
      : modelUsedRaw
        ? String(modelUsedRaw)
        : undefined;
  if (!total && !modelUsed) return undefined;
  return { promptTokens: prompt, completionTokens: completion, totalTokens: total, modelUsed };
}

export interface UseSSEStreamOptions {
  onDone?: (fullText: string, usage?: MessageUsage) => void;
  onError?: (err: Error) => void;
}

export interface StreamCallOptions {
  onDone?: (fullText: string, usage?: MessageUsage) => void;
  onError?: (err: Error) => void;
  timeoutMs?: number;
  temperature?: number;
  triad_mode?: boolean;
  onTriadToken?: (triad: TriadState, currentCore: TriadCoreType | null) => void;
}

export function useSSEStream({ onDone: hookOnDone, onError: hookOnError }: UseSSEStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeStreamIdRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpieza estricta y cancelación al desmontar el hook
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (timeoutTimerRef.current !== null) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
    };
  }, []);

  const stopStreaming = useCallback(() => {
    activeStreamIdRef.current += 1; // Invalida cualquier callback asíncrono en vuelo
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (timeoutTimerRef.current !== null) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (
      messages: Message[],
      model: 'speed' | 'cortex' | 'architect' | string,
      conversationId: string | null,
      userId: string | undefined,
      onToken: (accumulated: string, triad?: TriadState) => void,
      options?: StreamCallOptions
    ) => {
      // 1. Cancelar de forma atómica cualquier stream previo en ejecución
      stopStreaming();

      const streamId = ++activeStreamIdRef.current;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsStreaming(true);

      const activeOnDone = options?.onDone || hookOnDone;
      const activeOnError = options?.onError || hookOnError;
      const timeoutMs = options?.timeoutMs ?? 65000;

      let accumulatedText = '';
      let finalUsage: MessageUsage | undefined = undefined;
      const triadState: TriadState = { create: '', break: '', rebuild: '' };
      let activeCore: TriadCoreType | null = null;
      let isTriadStream = Boolean(options?.triad_mode);

      let latestText = '';
      let timeoutTriggered = false;

      // Timer to detect Render cold start timeouts (free tier takes ~50-60s or fails with 504)
      timeoutTimerRef.current = setTimeout(() => {
        if (activeStreamIdRef.current !== streamId) return;
        timeoutTriggered = true;
        abortController.abort(new Error('TIMEOUT'));
      }, timeoutMs);

      // Batch DOM updates at screen refresh rate instead of per-token
      const scheduleFlush = () => {
        if (activeStreamIdRef.current !== streamId) return;
        latestText = accumulatedText;
        const currentTriad = { ...triadState };
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            if (activeStreamIdRef.current !== streamId) return;
            onToken(latestText, isTriadStream ? currentTriad : undefined);
            rafIdRef.current = null;
          });
        }
      };

      try {
        // Recortar historial a los últimos 4-6 mensajes para optimizar tokens y no saturar TPM/RPM
        // En modo TRIAD se limita a los últimos 4 mensajes (máx 2 turnos); en modo normal a los últimos 6 mensajes
        const MAX_HISTORY_MESSAGES = options?.triad_mode ? 4 : 6;
        const trimmedHistory = messages.length > MAX_HISTORY_MESSAGES
          ? messages.slice(-MAX_HISTORY_MESSAGES)
          : messages;

        // Detectar si hay imágenes para mantener base64 solo en el turno activo más reciente
        const lastImgIdx = trimmedHistory.map((m) => Boolean(m.image)).lastIndexOf(true);

        let sanitizedMessages = trimmedHistory
          .filter((m) => m && ((m.content && String(m.content).trim()) || m.image) && !String(m.content || '').startsWith('⚠️') && !String(m.content || '').startsWith('❌'))
          .map((m, idx) => {
            let contentStr = String(m.content || '').trim();
            const isPriorAssistant =
              (m.role === 'model' || (m.role as string) === 'assistant') &&
              idx < trimmedHistory.length - 1;
            // Limpiar bloques internos <thought>...</thought> en turnos previos para ahorrar tokens de entrada
            if (isPriorAssistant && contentStr.includes('<thought>')) {
              contentStr = contentStr.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
            }
            // Si es un mensaje previo de TRIAD en el historial, sintetizarlo para no reenviar miles de tokens
            if (contentStr.includes('[TRIAD_CORE:rebuild]')) {
              const matchRebuild = contentStr.match(/\[TRIAD_CORE:rebuild\]([\s\S]*?)\[\/TRIAD_CORE:rebuild\]/);
              if (matchRebuild && matchRebuild[1]) {
                const cleanRebuild = matchRebuild[1].replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
                contentStr = `[Síntesis de turno previo]: ${cleanRebuild.slice(0, 350)}...`;
              }
            } else if (contentStr.length > 700 && idx < trimmedHistory.length - 1) {
              contentStr = `${contentStr.slice(0, 700)}...`;
            }

            return {
              id: m.id || undefined,
              role: (m.role === 'model' || (m.role as string) === 'assistant') ? 'model' : 'user',
              content: contentStr,
              // Mantener imagen base64 solo en el turno más reciente para no inflar payloads
              image: idx === lastImgIdx ? m.image : undefined,
            };
          });

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
          speed: 0.3,
          architect: 0.3,
          magister: 0.4,
          classic: 0.4,
          zenith: 0.4,
          nexus: 0.5,
          forge: 0.5,
        };

        const resolvedTemp = options?.temperature !== undefined
          ? options.temperature
          : (tempMap[String(model)] ?? 0.3);

        const payload = {
          conversation_id: conversationId || null,
          user_id: userId || null,
          messages: sanitizedMessages,
          model: String(model || 'speed'),
          temperature: resolvedTemp,
          triad_mode: Boolean(options?.triad_mode),
        };

        const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(userId || undefined, true),
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });

        if (timeoutTimerRef.current !== null) {
          clearTimeout(timeoutTimerRef.current);
          timeoutTimerRef.current = null;
        }

        if (activeStreamIdRef.current !== streamId) return;

        // Handle server errors (Render cold start 502/504, 429 Rate Limit, or server 500)
        if (!response.ok) {
          let errMsg = '⚠️ El servidor tardó en responder o está iniciando. Por favor, reintenta en unos segundos.';
          let reason: string | undefined = undefined;
          let retryMs: number | undefined = undefined;

          if (response.status === 429) {
            errMsg = '⚠️ Cuota o enfriamiento de LYAXIS TRIAD™ activo.';
          } else if (response.status >= 500) {
            errMsg = '⚠️ El servidor tardó en responder o está iniciando. Por favor, reintenta en unos segundos.';
          } else {
            errMsg = `⚠️ Error del servidor (${response.status}). Intenta de nuevo.`;
          }

          try {
            const errText = await response.text();
            // Try to extract a token, error or message from SSE body if JSON
            const matchToken = errText.match(/"token"\s*:\s*"([^"]+)"/);
            const matchErr = errText.match(/"error"\s*:\s*"([^"]+)"/);
            const matchMsg = errText.match(/"message"\s*:\s*"([^"]+)"/);
            const matchReason = errText.match(/"reason"\s*:\s*"([^"]+)"/);
            const matchRetry = errText.match(/"retryAfterMs"\s*:\s*(\d+)/);

            if (matchMsg) {
              errMsg = matchMsg[1];
            } else if (matchToken) {
              errMsg = matchToken[1];
            } else if (matchErr) {
              errMsg = matchErr[1];
            }

            if (matchReason) {
              reason = matchReason[1];
            }
            if (matchRetry) {
              retryMs = parseInt(matchRetry[1], 10);
            }

            if (response.status === 429 && typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('lyaxis_triad_server_429', {
                  detail: { retryAfterMs: retryMs, message: errMsg, reason },
                })
              );
            }
          } catch {
            // ignore JSON parse errors on HTML 502/504 pages
          }

          accumulatedText = errMsg;
          onToken(errMsg, isTriadStream ? { ...triadState } : undefined);
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
          if (activeStreamIdRef.current !== streamId) return;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue; // Ignorar líneas vacías y comentarios/pings
            if (trimmed === 'data: [DONE]') continue; // Centinela de fin estándar

            if (trimmed.startsWith('data: ')) {
              const dataContent = trimmed.slice(6);
              try {
                const parsed = JSON.parse(dataContent);

                if (parsed.token) {
                  if (parsed.core && (parsed.core === 'create' || parsed.core === 'break' || parsed.core === 'rebuild')) {
                    isTriadStream = true;
                    activeCore = parsed.core as TriadCoreType;
                    triadState[activeCore] += parsed.token;
                    accumulatedText = `[TRIAD_CORE:create]\n${triadState.create}\n[/TRIAD_CORE:create]\n\n[TRIAD_CORE:break]\n${triadState.break}\n[/TRIAD_CORE:break]\n\n[TRIAD_CORE:rebuild]\n${triadState.rebuild}\n[/TRIAD_CORE:rebuild]`;
                    if (options?.onTriadToken) {
                      options.onTriadToken({ ...triadState }, activeCore);
                    }
                  } else {
                    accumulatedText += parsed.token;
                  }
                  scheduleFlush();
                } else if (parsed.done) {
                  // Telemetría real de tokens emitida por el backend en el frame final
                  const usage = normalizeUsage(parsed.usage);
                  if (usage) finalUsage = usage;
                  scheduleFlush();
                }

                if (parsed.error && !parsed.token) {
                  accumulatedText += `\n\n⚠️ ${parsed.error}`;
                  scheduleFlush();
                }
              } catch {
                // Suprimir silenciosamente errores de parseo JSON sin concatenar basura técnica
              }
            }
          }
        }

        if (activeStreamIdRef.current !== streamId) return;

        // Final flush — ensure all remaining text is rendered
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        onToken(accumulatedText, isTriadStream ? { ...triadState } : undefined);
        if (options?.onTriadToken && isTriadStream) {
          options.onTriadToken({ ...triadState }, activeCore);
        }

        if (activeOnDone) activeOnDone(accumulatedText, finalUsage);
      } catch (err: any) {
        if (timeoutTimerRef.current !== null) {
          clearTimeout(timeoutTimerRef.current);
          timeoutTimerRef.current = null;
        }
        if (activeStreamIdRef.current !== streamId) return;

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
        if (activeStreamIdRef.current === streamId) {
          if (timeoutTimerRef.current !== null) {
            clearTimeout(timeoutTimerRef.current);
            timeoutTimerRef.current = null;
          }
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      }
    },
    [hookOnDone, hookOnError, stopStreaming]
  );

  return {
    isStreaming,
    sendMessage,
    startStream: sendMessage,
    stopStreaming
  };
}

export const useStream = useSSEStream;