import { useState, useEffect, useCallback } from 'react';

/**
 * ==============================================================================
 * LYAXIS TRIAD™ — Sliding Window Rate Limiting Hook
 * Regla de negocio: Máximo 3 consultas cada 6 horas (21,600,000 ms).
 * Los modelos individuales estándar (Speed, Classic, etc.) permanecen ilimitados.
 * ==============================================================================
 */

export const TRIAD_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 horas en milisegundos (21,600,000 ms)
export const TRIAD_MAX_REQUESTS = 3;
export const TRIAD_STORAGE_KEY = 'lyaxis_triad_usage';

export interface TriadQuotaCheck {
  allowed: boolean;
  remaining: number;
  nextResetInMs: number;
  resetTime: number;
  activeCount: number;
}

/**
 * Formatea una duración en milisegundos a una representación legible en español.
 * Ejemplos: "Disponible en 2h 45m", "Disponible en 12m 30s", "Disponible en 45s", "Disponible ahora"
 */
export function formatResetCountdown(ms: number): string {
  if (ms <= 0) return 'Disponible ahora';

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `Disponible en ${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `Disponible en ${minutes}m ${seconds}s`;
  }
  return `Disponible en ${seconds}s`;
}

/**
 * Inspecciona el estado de la cuota deslizante de TRIAD sin alterar el estado.
 * Limpia automáticamente timestamps que ya hayan expirado fuera de la ventana de 6h.
 */
export function checkTriadLimit(): TriadQuotaCheck {
  if (typeof window === 'undefined') {
    return {
      allowed: true,
      remaining: TRIAD_MAX_REQUESTS,
      nextResetInMs: 0,
      resetTime: 0,
      activeCount: 0,
    };
  }

  const now = Date.now();
  let timestamps: number[] = [];

  try {
    const raw = localStorage.getItem(TRIAD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        timestamps = parsed.filter((t) => typeof t === 'number' && !isNaN(t));
      }
    }
  } catch {
    timestamps = [];
  }

  // Filtrar solo las peticiones hechas en las últimas 6 horas
  const activeTimestamps = timestamps
    .filter((ts) => now - ts < TRIAD_WINDOW_MS)
    .sort((a, b) => a - b);

  try {
    localStorage.setItem(TRIAD_STORAGE_KEY, JSON.stringify(activeTimestamps));
  } catch {
    // Protección contra modo incógnito o storage lleno
  }

  const activeCount = activeTimestamps.length;
  const remaining = Math.max(0, TRIAD_MAX_REQUESTS - activeCount);
  const oldest = activeTimestamps[0] || now;
  const resetTime = oldest + TRIAD_WINDOW_MS;
  const nextResetInMs = activeCount > 0 ? Math.max(0, resetTime - now) : 0;

  return {
    allowed: activeCount < TRIAD_MAX_REQUESTS,
    remaining,
    nextResetInMs,
    resetTime,
    activeCount,
  };
}

/**
 * Alias de compatibilidad semántica solicitado por la especificación.
 */
export const canExecuteTriad = checkTriadLimit;

/**
 * Consume 1 slot de la cuota de TRIAD registrando el timestamp actual.
 * Retorna true si el consumo fue exitoso, o false si no había cuota disponible.
 */
export function consumeTriadSlot(): boolean {
  if (typeof window === 'undefined') return true;

  const status = checkTriadLimit();
  if (!status.allowed) {
    return false;
  }

  const now = Date.now();
  let timestamps: number[] = [];

  try {
    const raw = localStorage.getItem(TRIAD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        timestamps = parsed.filter((t) => typeof t === 'number' && !isNaN(t));
      }
    }
  } catch {
    timestamps = [];
  }

  const activeTimestamps = timestamps.filter((ts) => now - ts < TRIAD_WINDOW_MS);
  activeTimestamps.push(now);

  try {
    localStorage.setItem(TRIAD_STORAGE_KEY, JSON.stringify(activeTimestamps));
  } catch {
    // Ignorar errores de storage
  }

  // Despachar evento para sincronizar inmediatamente todos los componentes montados
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lyaxis_triad_quota_changed'));
  }

  return true;
}

/**
 * Sincroniza el almacenamiento local en caso de que el backend responda HTTP 429
 * evitando discrepancias si el usuario manipuló el localStorage.
 */
export function syncServerQuota(retryAfterMs?: number): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const simulatedOldest = retryAfterMs && retryAfterMs > 0
    ? now - (TRIAD_WINDOW_MS - retryAfterMs)
    : now - 1000;

  const filledTimestamps = [simulatedOldest, simulatedOldest + 10, simulatedOldest + 20];
  try {
    localStorage.setItem(TRIAD_STORAGE_KEY, JSON.stringify(filledTimestamps));
  } catch {}

  window.dispatchEvent(new CustomEvent('lyaxis_triad_quota_changed'));
}

/**
 * Hook reactivo para componentes de React.
 * Proporciona el estado en tiempo real, cuenta regresiva por segundo y acciones de consumo.
 */
export function useTriadQuota() {
  const [quota, setQuota] = useState<TriadQuotaCheck>(() => checkTriadLimit());

  const refresh = useCallback(() => {
    setQuota(checkTriadLimit());
  }, []);

  useEffect(() => {
    refresh();

    const handleUpdate = () => refresh();
    window.addEventListener('lyaxis_triad_quota_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Actualizador de cuenta regresiva en vivo si se han consumido slots
    const interval = setInterval(() => {
      refresh();
    }, 1000);

    return () => {
      window.removeEventListener('lyaxis_triad_quota_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, [refresh]);

  const timeRemainingFormatted = formatResetCountdown(quota.nextResetInMs);
  const badgeLabel = `⚡ TRIAD [${quota.remaining}/${TRIAD_MAX_REQUESTS}]`;
  const isFull = quota.remaining === TRIAD_MAX_REQUESTS;
  const statusLabel = isFull
    ? `${TRIAD_MAX_REQUESTS}/${TRIAD_MAX_REQUESTS} disponibles`
    : timeRemainingFormatted;

  return {
    ...quota,
    canExecuteTriad: checkTriadLimit,
    consumeTriadSlot: () => {
      const consumed = consumeTriadSlot();
      refresh();
      return consumed;
    },
    syncServerQuota: (retryAfterMs?: number) => {
      syncServerQuota(retryAfterMs);
      refresh();
    },
    timeRemainingFormatted,
    badgeLabel,
    statusLabel,
    refresh,
  };
}

export default useTriadQuota;
