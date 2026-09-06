import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, ShieldCheck, Lock, Sparkles, Terminal, KeyRound } from 'lucide-react';
import { API_BASE } from '../config';
import { playKeyClick, playVaultUnlock, playDenialBeep } from '../utils/audio';

interface Props {
  onUnlock?: () => void;
}

export default function Gatekeeper({ onUnlock }: Props) {
  // Synchronous state check avoids any layout flicker if already unlocked
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

  // Lock body scroll while locked
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

  // Vibrant multi-color cosmic particle field (Cyan, Purple, Magenta, Emerald, Electric Blue)
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

    const colors = [
      { r: 0, g: 240, b: 255 },    // Electric Cyan
      { r: 168, g: 85, b: 247 },   // Neon Violet
      { r: 236, g: 72, b: 153 },   // Hot Pink / Magenta
      { r: 0, g: 255, b: 102 },    // Emerald Neon
      { r: 59, g: 130, b: 246 },   // High-voltage Blue
    ];

    const particles: {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: { r: number; g: number; b: number };
    }[] = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.2 + 0.6,
        speedY: (Math.random() * 0.45 + 0.15) * -1,
        speedX: (Math.random() - 0.5) * 0.35,
        opacity: Math.random() * 0.7 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)]
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
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.9)`;
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

  // If already unlocked, return null in 0ms (0 impact on chat)
  if (isUnlocked) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length > 9) raw = raw.slice(0, 9);

    // Auto-format: LYX - XXX - XXX
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

        // Sequence: Emerald glow -> Sub-bass unlock chime -> Radial shield dissipation
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
        @keyframes lyxChromaPulse {
          0%, 100% {
            box-shadow: 0 0 35px rgba(0, 240, 255, 0.45), 0 0 70px rgba(168, 85, 247, 0.35);
            border-color: rgba(0, 240, 255, 0.7);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 55px rgba(236, 72, 153, 0.5), 0 0 110px rgba(0, 240, 255, 0.45);
            border-color: rgba(236, 72, 153, 0.85);
            transform: scale(1.03);
          }
        }
        @keyframes rainbowLaserRun {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes plasmaFloat1 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.15); }
          100% { transform: translate(-20px, 25px) scale(0.95); }
        }
        @keyframes plasmaFloat2 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-50px, 35px) scale(1.2); }
          100% { transform: translate(30px, -20px) scale(0.9); }
        }
        @keyframes glitchShake {
          0% { transform: translate(0, 0); }
          20% { transform: translate(-8px, 3px); }
          40% { transform: translate(8px, -3px); }
          60% { transform: translate(-6px, 4px); }
          80% { transform: translate(6px, -2px); }
          100% { transform: translate(0, 0); }
        }
        .glitch-shake-active {
          animation: glitchShake 0.4s ease-in-out;
        }
        .rainbow-laser-beam {
          background-size: 300% 300%;
          animation: rainbowLaserRun 3s linear infinite;
        }
      `}</style>

      {/* Main Frosted Translucent Overlay - CHAT IS VISIBLE BEHIND! */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          // Translucent glassmorphism shield: chat is softly visible through the blur!
          background: 'radial-gradient(ellipse at 50% 30%, rgba(124, 58, 237, 0.25) 0%, rgba(0, 240, 255, 0.16) 35%, rgba(4, 4, 12, 0.68) 75%, rgba(2, 2, 8, 0.82) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
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
          filter: fadeout ? 'blur(12px)' : 'none',
          pointerEvents: fadeout ? 'none' : 'all'
        }}
      >
        {/* Floating Colorful Ambient Plasma Orbs */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: '12%',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 1,
            animation: 'plasmaFloat1 12s ease-in-out infinite alternate',
            filter: 'blur(40px)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: '520px',
            height: '520px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 240, 255, 0.24) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 1,
            animation: 'plasmaFloat2 14s ease-in-out infinite alternate',
            filter: 'blur(40px)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '45%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 1,
            filter: 'blur(45px)'
          }}
        />

        {/* Canvas background for multi-color floating neon particles */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 2
          }}
        />

        {/* Cyberpunk Holographic Grid with Neon Glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(0, 240, 255, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(168, 85, 247, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 85%)',
            pointerEvents: 'none',
            zIndex: 3
          }}
        />

        {/* Central Frosted Glass Hologram Card */}
        <div
          className={status === 'denied' ? 'glitch-shake-active' : ''}
          style={{
            maxWidth: '540px',
            width: '100%',
            // Translucent glass so background highlights and shapes shine through
            background: 'rgba(9, 9, 22, 0.62)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: status === 'granted'
              ? '1.5px solid rgba(0, 255, 102, 0.85)'
              : status === 'denied'
              ? '1.5px solid rgba(239, 68, 68, 0.85)'
              : '1.5px solid rgba(0, 240, 255, 0.45)',
            boxShadow: status === 'granted'
              ? '0 0 70px rgba(0, 255, 102, 0.4), inset 0 0 30px rgba(0, 255, 102, 0.2)'
              : status === 'denied'
              ? '0 0 70px rgba(239, 68, 68, 0.4), inset 0 0 30px rgba(239, 68, 68, 0.2)'
              : '0 0 60px rgba(0, 240, 255, 0.25), 0 0 100px rgba(168, 85, 247, 0.22), inset 0 0 40px rgba(0, 240, 255, 0.08)',
            borderRadius: '26px',
            padding: '48px 36px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 10,
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
          }}
        >
          {/* Security Tagline Chip with Gradient Border */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: status === 'granted'
                ? '1px solid rgba(0, 255, 102, 0.5)'
                : status === 'denied'
                ? '1px solid rgba(239, 68, 68, 0.5)'
                : '1px solid rgba(0, 240, 255, 0.4)',
              padding: '7px 18px',
              borderRadius: '999px',
              fontSize: '11px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: status === 'granted' ? '#00FF66' : status === 'denied' ? '#EF4444' : '#00F0FF',
              marginBottom: '26px',
              fontWeight: 700,
              boxShadow: '0 0 16px rgba(0, 240, 255, 0.2)'
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: status === 'granted' ? '#00FF66' : status === 'denied' ? '#EF4444' : '#00F0FF',
                boxShadow: `0 0 12px ${status === 'granted' ? '#00FF66' : status === 'denied' ? '#EF4444' : '#00F0FF'}`
              }}
            />
            {status === 'granted'
              ? 'AUTORIZACIÓN CONFIRMADA // NIVEL 1'
              : '● PROTOCOLO CERRADO // SECTOR 17 DE OCTUBRE'}
          </div>

          {/* Central Isotype with Chromatic Glowing Aura */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '22px' }}>
            <div
              style={{
                width: '92px',
                height: '92px',
                borderRadius: '26px',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.22) 0%, rgba(168, 85, 247, 0.35) 50%, rgba(236, 72, 153, 0.25) 100%)',
                border: '1.5px solid rgba(0, 240, 255, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                animation: status === 'granted' ? 'none' : 'lyxChromaPulse 3.5s infinite ease-in-out',
                boxShadow: status === 'granted'
                  ? '0 0 45px rgba(0, 255, 102, 0.6)'
                  : '0 0 40px rgba(0, 240, 255, 0.45)'
              }}
            >
              {status === 'granted' ? (
                <ShieldCheck size={48} color="#00FF66" />
              ) : status === 'denied' ? (
                <ShieldAlert size={48} color="#EF4444" />
              ) : (
                <Lock size={42} color="#00F0FF" />
              )}
            </div>
          </div>

          {/* Title with Holographic Neon Gradient */}
          <h1
            style={{
              fontSize: '23px',
              fontWeight: 900,
              margin: '0 0 10px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #FFFFFF 10%, #00F0FF 45%, #C084FC 75%, #F472B6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
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
              color: '#CBD5E1',
              lineHeight: 1.65,
              maxWidth: '450px',
              fontWeight: 400
            }}
          >
            Este entorno de ejecución multi-motor está reservado para los 30 creadores autorizados por{' '}
            <strong style={{ color: '#00F0FF', fontWeight: 700, textShadow: '0 0 10px rgba(0, 240, 255, 0.4)' }}>
              Oscar Naim Ambrocio Aguirre
            </strong>.
          </p>

          {/* Input Form */}
          <form onSubmit={handleVerify}>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
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
                  background: 'rgba(4, 4, 14, 0.75)',
                  backdropFilter: 'blur(16px)',
                  border: status === 'granted'
                    ? '2px solid #00FF66'
                    : status === 'denied'
                    ? '2px solid #EF4444'
                    : '1.5px solid rgba(0, 240, 255, 0.55)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  fontSize: '22px',
                  fontWeight: 800,
                  textAlign: 'center',
                  letterSpacing: '0.18em',
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                  color: status === 'granted' ? '#00FF66' : status === 'denied' ? '#EF4444' : '#00F0FF',
                  textShadow: status === 'granted' 
                    ? '0 0 12px rgba(0, 255, 102, 0.6)' 
                    : '0 0 12px rgba(0, 240, 255, 0.5)',
                  outline: 'none',
                  boxShadow: status === 'granted'
                    ? '0 0 30px rgba(0, 255, 102, 0.35), inset 0 2px 8px rgba(0,0,0,0.8)'
                    : status === 'denied'
                    ? '0 0 30px rgba(239, 68, 68, 0.35), inset 0 2px 8px rgba(0,0,0,0.8)'
                    : '0 0 25px rgba(0, 240, 255, 0.25), inset 0 2px 8px rgba(0,0,0,0.8)',
                  transition: 'all 0.25s ease'
                }}
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  color: '#FF6B6B',
                  fontSize: '12px',
                  marginBottom: '18px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  lineHeight: 1.4,
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
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
                  background: 'rgba(0, 255, 102, 0.15)',
                  border: '1px solid rgba(0, 255, 102, 0.5)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  boxShadow: '0 0 25px rgba(0, 255, 102, 0.3)'
                }}
              >
                <Sparkles size={16} />
                <span>[ AUTORIZACIÓN NIVEL 1 CONFIRMADA // PASE VÁLIDO ]</span>
              </div>
            )}

            {/* Continuous Multi-Color Laser Border Execution Button */}
            <div
              className={isCodeComplete && status !== 'granted' ? 'rainbow-laser-beam' : ''}
              style={{
                position: 'relative',
                borderRadius: '16px',
                padding: '2px',
                background: status === 'granted'
                  ? '#00FF66'
                  : isCodeComplete
                  ? 'linear-gradient(90deg, #00F0FF, #A855F7, #EC4899, #00FF66, #00F0FF)'
                  : 'linear-gradient(90deg, rgba(0, 240, 255, 0.3), rgba(168, 85, 247, 0.3))',
                boxShadow: status === 'granted'
                  ? '0 0 40px rgba(0, 255, 102, 0.6)'
                  : isCodeComplete
                  ? '0 0 35px rgba(0, 240, 255, 0.45), 0 0 50px rgba(236, 72, 153, 0.3)'
                  : '0 0 15px rgba(0, 240, 255, 0.15)',
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
                    ? 'linear-gradient(135deg, rgba(7, 7, 20, 0.95) 0%, rgba(16, 12, 32, 0.95) 100%)'
                    : 'rgba(8, 8, 18, 0.85)',
                  color: status === 'granted'
                    ? '#000000'
                    : isCodeComplete
                    ? '#00F0FF'
                    : 'rgba(255, 255, 255, 0.4)',
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
                  fontFamily: "'JetBrains Mono', monospace",
                  textShadow: isCodeComplete && status !== 'granted' ? '0 0 10px rgba(0, 240, 255, 0.5)' : 'none'
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
                  <>
                    <KeyRound size={16} color={isCodeComplete ? '#00F0FF' : 'rgba(255, 255, 255, 0.4)'} />
                    <span>[ INICIAR DESENCRIPTACIÓN ]</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Watermark */}
          <div
            style={{
              marginTop: '32px',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 600,
              background: 'linear-gradient(90deg, #00F0FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              opacity: 0.85
            }}
          >
            LYAXIS labs™ · ARQUITECTURA DE SEGURIDAD VIP
          </div>
        </div>
      </div>
    </>
  );
}
