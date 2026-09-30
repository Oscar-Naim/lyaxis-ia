import React, { useState, useEffect, useRef } from 'react';
import { Key, ShieldCheck, AlertCircle, Loader2, ArrowRight, Lock } from 'lucide-react';

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

export const GatekeeperModal: React.FC<GatekeeperModalProps> = ({
  isOpen,
  onUnlock,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto-formateo en mayúsculas a la estructura LYX-XXX-XXX
  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Si el usuario pega un código de 6 caracteres sin 'LYX', anteponer 'LYX'
    if (raw.length === 6 && !raw.startsWith('LYX')) {
      raw = 'LYX' + raw;
    }

    // Limitar a máximo 9 caracteres alfanuméricos (3 + 3 + 3)
    if (raw.length > 9) {
      raw = raw.slice(0, 9);
    }

    // Construir estructura con guiones: LYX-XXX-XXX
    const parts: string[] = [];
    if (raw.length > 0) parts.push(raw.slice(0, 3));
    if (raw.length > 3) parts.push(raw.slice(3, 6));
    if (raw.length > 6) parts.push(raw.slice(6, 9));

    setTokenInput(parts.join('-'));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tokenInput.trim().toUpperCase();

    // Validar formato completo de 9 caracteres alfanuméricos (ej: LYX-XXX-XXX)
    const alphanumericCount = clean.replace(/[^A-Z0-9]/g, '').length;
    if (alphanumericCount < 9) {
      setError('Formato incompleto. Introduce los 9 caracteres (LYX-XXX-XXX).');
      return;
    }

    setIsLoading(true);
    setError(null);

    const apiUrl =
      (import.meta.env.VITE_GATEKEEPER_API_URL as string) ||
      'https://zero-vip-gatekeeper-lyaxis.vercel.app/api/validate';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ token: clean }),
      });

      const data: GatekeeperApiResponse | null = await response.json().catch(() => null);

      if (response.ok && data && (data.valid === true || data.success === true)) {
        const validatedTier = data.tier || data.user_tier || data.role || 'VIP';
        setIsSuccess(true);

        try {
          localStorage.setItem('lyaxis_access_token', clean);
          localStorage.setItem('lyaxis_user_tier', validatedTier);
        } catch (storageErr) {
          console.warn('Aviso guardando en localStorage:', storageErr);
        }

        setTimeout(() => {
          onUnlock(clean, validatedTier);
        }, 500);
      } else {
        const errorMsg =
          data?.message ||
          data?.error ||
          (response.status === 404
            ? 'Endpoint de validación no encontrado. Verifica VITE_GATEKEEPER_API_URL.'
            : 'Llave de invitación inválida o expirada.');
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Error al validar token Gatekeeper:', err);
      setError(
        err?.message?.includes('Failed to fetch')
          ? 'Error de conexión con el servicio Gatekeeper. Verifica tu conexión o CORS.'
          : 'Error de red al intentar validar la llave de acceso.'
      );
    } finally {
      setIsLoading(false);
    }
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
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.12), transparent 70%)',
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
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.08), transparent 70%)',
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
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 217, 255, 0.1)',
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
            background: 'linear-gradient(90deg, #2563FF, #00D9FF, #7C3AED)',
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
              border: '1px solid rgba(0, 217, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 0 20px rgba(0, 217, 255, 0.15), inset 0 0 12px rgba(0, 217, 255, 0.08)',
            }}
          >
            {isSuccess ? (
              <ShieldCheck size={28} color="#00ff66" />
            ) : (
              <Lock size={26} color="#00D9FF" />
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#00D9FF',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            <span>TERMINAL BIOMÉTRICA // ZERO VIP</span>
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
            Control de Acceso LYAXIS
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
            El ecosistema neural está blindado. Introduce una llave de invitación válida para continuar.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="lyaxis-token-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                fontWeight: 700,
                color: '#a1a1aa',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '8px',
              }}
            >
              <span>Llave de Invitación</span>
              <span style={{ color: '#00D9FF', fontSize: '10px' }}>ESTRUCTURA LYX-XXX-XXX</span>
            </label>

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
                <Key size={18} color="#00D9FF" />
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
                placeholder="LYX-XXX-XXX"
                maxLength={11}
                className="w-full pl-11 pr-4 py-3.5 text-base sm:text-lg font-mono font-bold tracking-widest text-center text-white bg-[#050505] border border-zinc-800 focus:border-cyan-400 focus:outline-none rounded-xl transition-all shadow-inner"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 16px 12px 42px',
                  fontSize: '17px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  letterSpacing: '3px',
                  textAlign: 'center',
                  color: '#ffffff',
                  backgroundColor: '#050505',
                  border: error ? '1px solid #ef4444' : '1px solid #27272a',
                  borderRadius: '12px',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onFocus={(e) => {
                  if (!error) e.currentTarget.style.borderColor = '#00D9FF';
                }}
                onBlur={(e) => {
                  if (!error) e.currentTarget.style.borderColor = '#27272a';
                }}
              />
            </div>

            {/* Mensaje de Error */}
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
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Estado de Éxito */}
            {isSuccess && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  fontSize: '11.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <ShieldCheck size={15} style={{ flexShrink: 0 }} />
                <span>Llave criptográfica autorizada. Desbloqueando sesión...</span>
              </div>
            )}
          </div>

          {/* Botón de Envío Claro (Alto Contraste) */}
          <button
            type="submit"
            disabled={isLoading || isSuccess || tokenInput.length < 5}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white hover:bg-slate-200 text-black font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-all shadow-lg shadow-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
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
              cursor: isLoading || isSuccess || tokenInput.length < 5 ? 'not-allowed' : 'pointer',
              opacity: isLoading || isSuccess || tokenInput.length < 5 ? 0.45 : 1,
              boxShadow: '0 4px 18px rgba(255, 255, 255, 0.18)',
              transition: 'all 0.2s ease',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Validando Credencial...</span>
              </>
            ) : isSuccess ? (
              <>
                <ShieldCheck size={16} />
                <span>Acceso Autorizado</span>
              </>
            ) : (
              <>
                <span>Desbloquear Ecosistema</span>
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
            LYAXIS labs™ • Zero-Trust Perimeter Architecture
          </p>
          <p style={{ margin: 0, fontSize: '9.5px', color: '#475569' }}>
            Para asistencia o emisión de tokens consulta la consola VIP Gatekeeper
          </p>
        </div>
      </div>
    </div>
  );
};

export default GatekeeperModal;
