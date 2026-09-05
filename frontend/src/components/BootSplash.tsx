import React, { useState, useEffect } from 'react';
import { Terminal, Sparkles } from 'lucide-react';

interface BootSplashProps {
  onComplete: () => void;
}

export const BootSplash: React.FC<BootSplashProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Check if already seen in current session
    const seen = typeof window !== 'undefined' ? sessionStorage.getItem('lyaxis_boot_seen') : null;
    if (seen === 'true') {
      onComplete();
      return;
    }

    // 1.2 seconds boot sequence, followed by 300ms fade-out
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 1200);

    const finishTimer = setTimeout(() => {
      try {
        sessionStorage.setItem('lyaxis_boot_seen', 'true');
      } catch {
        // Ignore storage errors in private browsing
      }
      onComplete();
    }, 1500);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    try {
      sessionStorage.setItem('lyaxis_boot_seen', 'true');
    } catch {}
    setIsExiting(true);
    setTimeout(onComplete, 200);
  };

  return (
    <div
      onClick={handleSkip}
      role="banner"
      aria-label="LYAXIS IA Boot Sequence"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#050508',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        opacity: isExiting ? 0 : 1,
        filter: isExiting ? 'blur(12px)' : 'blur(0px)',
        transform: isExiting ? 'scale(1.04)' : 'scale(1)',
        transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), filter 0.35s ease, transform 0.35s ease',
      }}
    >
      {/* Background Cyber Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(0, 217, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 217, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* Central Expanding Neon Pulse */}
      <div
        style={{
          position: 'absolute',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 217, 255, 0.28) 0%, rgba(37, 99, 255, 0.15) 45%, transparent 70%)',
          filter: 'blur(35px)',
          animation: 'bootPulseGlow 1.8s infinite ease-in-out',
          pointerEvents: 'none',
        }}
      />

      {/* Central Logo Box */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '0 20px',
          textAlign: 'center',
        }}
      >
        {/* Emblem with Glowing Aura */}
        <div
          style={{
            position: 'relative',
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #2563FF, #00D9FF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 45px rgba(0, 217, 255, 0.6), 0 0 20px rgba(37, 99, 255, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            animation: 'bootEmblemPop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <Terminal size={32} color="#ffffff" />
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 10px #10B981',
              border: '2px solid #050508',
            }}
          />
        </div>

        {/* Brand Name */}
        <div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 900,
              letterSpacing: '3px',
              margin: '0 0 6px 0',
              color: '#ffffff',
              textShadow: '0 0 25px rgba(0, 217, 255, 0.5), 0 0 50px rgba(37, 99, 255, 0.3)',
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            LYAXIS IA
          </h1>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              fontStyle: 'italic',
              letterSpacing: '1.5px',
              color: '#00D9FF',
              margin: 0,
              opacity: 0.9,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Create. Break. Rebuild.
          </p>
        </div>

        {/* Terminal Line */}
        <div
          style={{
            marginTop: '12px',
            padding: '7px 16px',
            borderRadius: '24px',
            backgroundColor: 'rgba(0, 217, 255, 0.08)',
            border: '1px solid rgba(0, 217, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 20px rgba(0, 217, 255, 0.1)',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
          <span
            style={{
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#cbd5e1',
              letterSpacing: '0.8px',
              fontWeight: 600,
            }}
          >
            &gt; INITIALIZING SYSTEM // 9 MOTORS READY
          </span>
          <span
            style={{
              display: 'inline-block',
              width: '7px',
              height: '13px',
              backgroundColor: '#00D9FF',
              animation: 'bootCursorBlink 0.7s infinite',
            }}
          />
        </div>

        {/* Subtle skip hint on mobile */}
        <span
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#52525b',
            letterSpacing: '0.5px',
          }}
        >
          Toca para omitir
        </span>
      </div>

      <style>{`
        @keyframes bootPulseGlow {
          0%, 100% {
            transform: scale(0.9);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.18);
            opacity: 1;
          }
        }
        @keyframes bootEmblemPop {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes bootCursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default BootSplash;
