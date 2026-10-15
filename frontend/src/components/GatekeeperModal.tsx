import React, { useState, useEffect, useRef } from 'react';
import { Key, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

export interface GatekeeperModalProps {
  isOpen: boolean;
  onUnlock: (token: string, tier: string) => void;
}

export interface GatekeeperApiResponse {
  valid?: boolean;
  success?: boolean;
  tier?: string;
  user_tier?: string;
  role?: string;
  message?: string;
  error?: string;
}

/**
 * @deprecated Protocolo "ZERO VIP Gatekeeper" deshabilitado.
 * LYAXIS IA ahora opera con acceso 100% público e inmediato sin requerir llaves ni tokens.
 * Este componente se mantiene desacoplado por compatibilidad de tipos e importaciones.
 */
export const GatekeeperModal: React.FC<GatekeeperModalProps> = ({
  isOpen,
  onUnlock,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Desbloqueo automático no bloqueante en caso de invocarse con isOpen=true
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onUnlock('LYX-PUBLIC-CORE', 'public');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onUnlock]);

  if (!isOpen) return null;

  // Auto-formateo opcional en mayúsculas a la estructura LYX-XXX-XXX
  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (raw.length === 6 && !raw.startsWith('LYX')) {
      raw = 'LYX' + raw;
    }

    if (raw.length > 9) {
      raw = raw.slice(0, 9);
    }

    const parts: string[] = [];
    if (raw.length > 0) parts.push(raw.slice(0, 3));
    if (raw.length > 3) parts.push(raw.slice(3, 6));
    if (raw.length > 6) parts.push(raw.slice(6, 9));

    setTokenInput(parts.join('-'));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Bypass del protocolo Gatekeeper: Acceso público inmediato sin llamadas de red a VITE_GATEKEEPER_API_URL
    setIsSuccess(true);
    const resolvedTier = 'public';

    try {
      localStorage.setItem('lyaxis_user_tier', resolvedTier);
    } catch (storageErr) {
      console.warn('Aviso guardando tier en localStorage:', storageErr);
    }

    setTimeout(() => {
      setIsLoading(false);
      onUnlock(tokenInput || 'LYX-PUBLIC-CORE', resolvedTier);
    }, 200);
  };

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#050505] p-4 select-none"
      style={{
        backgroundColor: '#050505',
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gatekeeper-title"
    >
      {/* Fondo ambiental táctico con cuadrícula y resplandores */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '650px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(0, 255, 102, 0.12), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.08), transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      {/* Contenedor Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#090d16] border border-zinc-800 p-6 sm:p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl font-mono text-slate-100 overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#090d16',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 255, 102, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
        }}
      >
        {/* Borde superior neón tricolor característico de LYAXIS */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #00FF66, #00D9FF, #2563FF)',
          }}
        />

        {/* Encabezado y Emblema */}
        <div className="flex flex-col items-center text-center mb-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '22px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#050505',
              border: '1px solid rgba(0, 255, 102, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 0 20px rgba(0, 255, 102, 0.15), inset 0 0 12px rgba(0, 255, 102, 0.08)',
            }}
          >
            <ShieldCheck size={28} color="#00ff66" />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#00ff66',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            <span>ACCESO PÚBLICO HABILITADO // OPEN CORE</span>
          </div>

          <h2
            id="gatekeeper-title"
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 6px 0',
              letterSpacing: '-0.3px',
            }}
          >
            LYAXIS IA • Acceso Libre
          </h2>

          <p
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              margin: 0,
              lineHeight: 1.5,
              maxWidth: '360px',
            }}
          >
            El acceso es 100% público e inmediato. No se requieren llaves ni tokens de invitación para acceder al ecosistema.
          </p>
        </div>

        {/* Formulario / Acción Inmediata */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#71717a',
                }}
              >
                <Key size={18} color="#00ff66" />
              </div>

              <input
                ref={inputRef}
                id="lyaxis-token-input"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={tokenInput}
                onChange={handleTokenChange}
                disabled={isLoading || isSuccess}
                placeholder="ACCESO PÚBLICO ACTIVO"
                className="w-full pl-11 pr-4 py-3.5 text-base sm:text-lg font-mono font-bold tracking-widest text-center text-white bg-[#050505] border border-zinc-800 focus:border-green-400 focus:outline-none rounded-xl transition-all shadow-inner"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 16px 12px 42px',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  textAlign: 'center',
                  color: '#00ff66',
                  backgroundColor: '#050505',
                  border: '1px solid rgba(0, 255, 102, 0.3)',
                  borderRadius: '12px',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  fontSize: '11.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white hover:bg-slate-200 text-black font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-all shadow-lg shadow-white/10"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '13px 18px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              color: '#050505',
              border: 'none',
              fontSize: '13px',
              fontWeight: 800,
              fontFamily: 'monospace',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(255, 255, 255, 0.18)',
              transition: 'all 0.2s ease',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Iniciando Sesión...</span>
              </>
            ) : isSuccess ? (
              <>
                <ShieldCheck size={16} />
                <span>Acceso Concedido</span>
              </>
            ) : (
              <>
                <span>Entrar a LYAXIS IA</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Pie con nota de arquitectura */}
        <div
          style={{
            marginTop: '22px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            textAlign: 'center',
            fontSize: '10.5px',
            color: '#64748b',
          }}
        >
          <p style={{ margin: '0 0 4px 0' }}>
            LYAXIS labs™ • Public Access Architecture
          </p>
          <p style={{ margin: 0, fontSize: '9.5px', color: '#475569' }}>
            Protocolo de acceso irrestricto activo para todos los usuarios
          </p>
        </div>
      </div>
    </div>
  );
};

export default GatekeeperModal;
