import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, ShieldCheck, Lock, Sparkles, Terminal } from 'lucide-react';
import { API_BASE } from '../config';
import { playKeyClick, playVaultUnlock, playDenialBeep } from '../utils/audio';

interface Props {
  onUnlock?: () => void;
}

export default function Gatekeeper({ onUnlock }: Props) {
  // Synchronous state check prevents any flash of the app if already unlocked
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('lyaxis_vault_token');
    }
    return false;
  });

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'granted' | 'denied'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fadeout, setFadeout] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Lock scroll when locked
  useEffect(() => {
    if (!isUnlocked) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 350);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isUnlocked]);

  // Lightweight cosmic particle field
  useEffect(() => {
    if (isUnlocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: { x: number; y: number; size: number; speedY: number; speedX: number; opacity: number }[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.6 + 0.4,
        speedY: (Math.random() * 0.3 + 0.1) * -1,
        speedX: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.6 + 0.2
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${p.opacity})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
        ctx.fill();
      }
      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [isUnlocked]);

  // If already unlocked, return null in 0ms (no interference with chat)
  if (isUnlocked) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length > 9) raw = raw.slice(0, 9);

    // Format automatically to: LYX - XXX - XXX
    let formatted = '';
    if (raw.length > 0) {
      formatted = raw.slice(0, 3);
      if (raw.length > 3) {
        formatted += ' - ' + raw.slice(3, 6);
      }
      if (raw.length > 6) {
        formatted += ' - ' + raw.slice(6, 9);
      }
    }
    setCode(formatted);
    playKeyClick();

    if (status === 'denied') {
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.replace(/\s+/g, '').trim();
    if (cleanCode.length < 11 || status === 'verifying' || status === 'granted') return;

    setStatus('verifying');
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('granted');
        playVaultUnlock();
        localStorage.setItem('lyaxis_vault_token', data.token);

        // Sequence: Glow -> Vault opening sound -> Radial dissolve & expansion
        setTimeout(() => {
          setFadeout(true);
          setTimeout(() => {
            setIsUnlocked(true);
            onUnlock?.();
          }, 850);
        }, 1200);
      } else {
        setStatus('denied');
        playDenialBeep();
        setErrorMessage(data.detail || 'ERROR 403: TOKEN INVÁLIDO O YA CANJEADO POR OTRO USUARIO');
      }
    } catch (err: any) {
      setStatus('denied');
      playDenialBeep();
      setErrorMessage('ERROR 403: NO SE PUDO ESTABLECER CONEXIÓN CON EL SERVIDOR DE AUTORIZACIÓN');
    }
  };

  const isCodeComplete = code.replace(/\s+/g, '').length === 11; // LYX-XXX-XXX (11 chars)

  return (
    <>
      <style>{`
        @keyframes lyxBreathe {
          0%, 100% {
            box-shadow: 0 0 25px rgba(0, 240, 255, 0.2), 0 0 50px rgba(0, 240, 255, 0.1);
            border-color: rgba(0, 240, 255, 0.35);
          }
          50% {
            box-shadow: 0 0 45px rgba(0, 240, 255, 0.45), 0 0 85px rgba(124, 58, 237, 0.3);
            border-color: rgba(0, 240, 255, 0.7);
          }
        }
        @keyframes laserRun {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes glitchShake {
          0% { transform: translate(0, 0); }
          20% { transform: translate(-7px, 2px); }
          40% { transform: translate(7px, -3px); }
          60% { transform: translate(-5px, 3px); }
          80% { transform: translate(5px, -1px); }
          100% { transform: translate(0, 0); }
        }
        .laser-btn-active {
          background-size: 250% 250%;
          animation: laserRun 3s linear infinite;
        }
        .glitch-shake-active {
          animation: glitchShake 0.4s ease-in-out;
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: '#040407',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          overflow: 'hidden',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          transition: 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), filter 0.85s ease',
          opacity: fadeout ? 0 : 1,
          transform: fadeout ? 'scale(1.08)' : 'scale(1)',
          filter: fadeout ? 'blur(10px)' : 'none',
          pointerEvents: fadeout ? 'none' : 'all'
        }}
      >
        {/* Canvas background for space dust particles */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1
          }}
        />

        {/* Ambient radial lighting */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 45%, rgba(0, 240, 255, 0.08) 0%, rgba(124, 58, 237, 0.05) 50%, transparent 80%)',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />

        {/* Subtle geometric cyberpunk grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(circle at 50% 50%, black 35%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 35%, transparent 85%)',
            pointerEvents: 'none',
            zIndex: 3
          }}
        />

        {/* Central Card */}
        <div
          className={status === 'denied' ? 'glitch-shake-active' : ''}
          style={{
            maxWidth: '540px',
            width: '100%',
            background: 'rgba(7, 7, 13, 0.88)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: status === 'granted'
              ? '1px solid rgba(0, 255, 102, 0.7)'
              : status === 'denied'
              ? '1px solid rgba(239, 68, 68, 0.7)'
              : '1px solid rgba(0, 240, 255, 0.25)',
            boxShadow: status === 'granted'
              ? '0 0 60px rgba(0, 255, 102, 0.35), inset 0 0 30px rgba(0, 255, 102, 0.15)'
              : status === 'denied'
              ? '0 0 60px rgba(239, 68, 68, 0.35), inset 0 0 30px rgba(239, 68, 68, 0.15)'
              : '0 0 70px rgba(0, 240, 255, 0.12), inset 0 0 35px rgba(124, 58, 237, 0.06)',
            borderRadius: '24px',
            padding: '48px 36px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 10,
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
          }}
        >
          {/* Security Tagline */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 16px',
              borderRadius: '999px',
              fontSize: '11px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: status === 'granted' ? '#00FF66' : status === 'denied' ? '#EF4444' : '#00F0FF',
              marginBottom: '26px',
              fontWeight: 600
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: status === 'granted' ? '#00FF66' : status === 'denied' ? '#EF4444' : '#00F0FF',
                boxShadow: `0 0 10px ${status === 'granted' ? '#00FF66' : status === 'denied' ? '#EF4444' : '#00F0FF'}`
              }}
            />
            {status === 'granted'
              ? 'AUTORIZACIÓN CONFIRMADA // NIVEL 1'
              : '● PROTOCOLO CERRADO // SECTOR 17 DE OCTUBRE'}
          </div>

          {/* Central Isotype with Pulsating Aura */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '22px' }}>
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(124, 58, 237, 0.25) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                animation: status === 'granted' ? 'none' : 'lyxBreathe 3.5s infinite ease-in-out',
                boxShadow: status === 'granted'
                  ? '0 0 40px rgba(0, 255, 102, 0.5)'
                  : '0 0 35px rgba(0, 240, 255, 0.3)'
              }}
            >
              {status === 'granted' ? (
                <ShieldCheck size={44} color="#00FF66" />
              ) : status === 'denied' ? (
                <ShieldAlert size={44} color="#EF4444" />
              ) : (
                <Lock size={40} color="#00F0FF" />
              )}
            </div>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              margin: '0 0 10px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            ACCESO RESTRINGIDO A BETA PRIVADA
          </h1>

          {/* Subtext */}
          <p
            style={{
              margin: '0 auto 30px',
              fontSize: '13.5px',
              color: '#94A3B8',
              lineHeight: 1.6,
              maxWidth: '440px',
              fontWeight: 400
            }}
          >
            Este entorno de ejecución multi-motor está reservado para los 30 creadores autorizados por{' '}
            <strong style={{ color: '#E2E8F0', fontWeight: 600 }}>Oscar Naim Ambrocio Aguirre</strong>.
          </p>

          {/* Input form */}
          <form onSubmit={handleVerify}>
            <div style={{ position: 'relative', marginBottom: '18px' }}>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={handleInputChange}
                disabled={status === 'verifying' || status === 'granted'}
                placeholder="LYX - XXX - XXX"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: '100%',
                  background: 'rgba(4, 4, 8, 0.85)',
                  border: status === 'granted'
                    ? '1.5px solid #00FF66'
                    : status === 'denied'
                    ? '1.5px solid #EF4444'
                    : '1.5px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  fontSize: '21px',
                  fontWeight: 800,
                  textAlign: 'center',
                  letterSpacing: '0.18em',
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                  color: status === 'granted' ? '#00FF66' : status === 'denied' ? '#EF4444' : '#00F0FF',
                  outline: 'none',
                  boxShadow: status === 'granted'
                    ? '0 0 25px rgba(0, 255, 102, 0.3), inset 0 2px 8px rgba(0,0,0,0.8)'
                    : status === 'denied'
                    ? '0 0 25px rgba(239, 68, 68, 0.3), inset 0 2px 8px rgba(0,0,0,0.8)'
                    : '0 0 20px rgba(0, 240, 255, 0.15), inset 0 2px 8px rgba(0,0,0,0.8)',
                  transition: 'all 0.25s ease'
                }}
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  color: '#EF4444',
                  fontSize: '12px',
                  marginBottom: '18px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  lineHeight: 1.4
                }}
              >
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Granted Success Message */}
            {status === 'granted' && (
              <div
                style={{
                  color: '#00FF66',
                  fontSize: '13px',
                  marginBottom: '18px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(0, 255, 102, 0.12)',
                  border: '1px solid rgba(0, 255, 102, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '10px'
                }}
              >
                <Sparkles size={16} />
                <span>[ AUTORIZACIÓN NIVEL 1 CONFIRMADA // PASE VÁLIDO ]</span>
              </div>
            )}

            {/* Laser Border Execution Button */}
            <div
              style={{
                position: 'relative',
                borderRadius: '16px',
                padding: '2px',
                background: status === 'granted'
                  ? '#00FF66'
                  : isCodeComplete
                  ? 'linear-gradient(90deg, #00F0FF, #7C3AED, #00F0FF)'
                  : 'rgba(255, 255, 255, 0.08)',
                backgroundSize: '200% 200%',
                animation: isCodeComplete && status !== 'granted' ? 'laserRun 2.5s linear infinite' : 'none',
                boxShadow: status === 'granted'
                  ? '0 0 35px rgba(0, 255, 102, 0.5)'
                  : isCodeComplete
                  ? '0 0 30px rgba(0, 240, 255, 0.35)'
                  : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              <button
                type="submit"
                disabled={!isCodeComplete || status === 'verifying' || status === 'granted'}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: '14px',
                  border: 'none',
                  background: status === 'granted'
                    ? '#00FF66'
                    : isCodeComplete
                    ? 'linear-gradient(135deg, #070710 0%, #0d0d1a 100%)'
                    : '#08080d',
                  color: status === 'granted'
                    ? '#000000'
                    : isCodeComplete
                    ? '#00F0FF'
                    : 'rgba(255, 255, 255, 0.3)',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: isCodeComplete && status !== 'verifying' && status !== 'granted' ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontFamily: "'JetBrains Mono', monospace"
                }}
              >
                {status === 'verifying' ? (
                  <>
                    <Terminal size={16} className="animate-spin" />
                    <span>[ VERIFICANDO EN CRIPTÓGRAFO... ]</span>
                  </>
                ) : status === 'granted' ? (
                  <>
                    <Sparkles size={16} />
                    <span>[ PASE VÁLIDO // ACCEDIENDO ]</span>
                  </>
                ) : (
                  <span>[ INICIAR DESENCRIPTACIÓN ]</span>
                )}
              </button>
            </div>
          </form>

          {/* Footer watermark */}
          <div
            style={{
              marginTop: '32px',
              fontSize: '10.5px',
              color: '#475569',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 500
            }}
          >
            LYAXIS labs™ · ARQUITECTURA DE SEGURIDAD VIP
          </div>
        </div>
      </div>
    </>
  );
}
