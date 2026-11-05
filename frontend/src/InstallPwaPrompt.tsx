import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('lyaxis_pwa_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleResize = () => setIsMobileView(window.innerWidth < 768);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <>
      {/* Non-intrusive Cyber-HUD Install Toast — Top-Right below Header so it never covers Chat Input */}
      <div
        style={{
          position: 'fixed',
          top: isMobileView ? '68px' : '68px',
          right: isMobileView ? '12px' : '20px',
          left: isMobileView ? '12px' : 'auto',
          zIndex: 42,
          maxWidth: isMobileView ? 'calc(100vw - 24px)' : '350px',
          padding: '10px 14px',
          borderRadius: '14px',
          border: '1px solid rgba(0, 217, 255, 0.35)',
          backgroundColor: 'rgba(8, 10, 18, 0.94)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 217, 255, 0.16)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              backgroundColor: 'rgba(0, 217, 255, 0.1)',
              border: '1px solid rgba(0, 217, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00D9FF',
              flexShrink: 0,
            }}
          >
            <Download size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h4
              style={{
                margin: 0,
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                whiteSpace: 'nowrap',
              }}
            >
              Instalar App PWA
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '10.5px',
                color: '#94a3b8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Acceso directo en PC y móvil
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #00D9FF, #2563FF)',
              color: '#000000',
              fontWeight: 800,
              fontSize: '11px',
              letterSpacing: '0.4px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(0, 217, 255, 0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            Instalar ⤓
          </button>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              try {
                localStorage.setItem('lyaxis_pwa_dismissed', 'true');
              } catch {}
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#71717a',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Manual Installation Guide Modal (Inline Cyber-HUD Styles — works without Tailwind) */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              padding: '22px',
              borderRadius: '18px',
              border: '1px solid rgba(0, 217, 255, 0.4)',
              backgroundColor: '#070910',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.95), 0 0 40px rgba(0, 217, 255, 0.18)',
              textAlign: 'left',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '12px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Monitor size={18} color="#00D9FF" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  Instalar LYAXIS IA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#cbd5e1' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px' }}>
                <div style={{ color: '#00D9FF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11.5px' }}>
                  <Monitor size={14} /> PC / Escritorio (Chrome, Edge, Brave)
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.45 }}>
                  Haz clic en el icono <strong style={{ color: '#ffffff' }}>Instalar (⊕ / ⤓)</strong> en el extremo derecho de la barra de direcciones.
                </p>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px' }}>
                <div style={{ color: '#00D9FF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11.5px' }}>
                  <Smartphone size={14} /> Android (Chrome)
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.45 }}>
                  Toca el menú <strong style={{ color: '#ffffff' }}>⋮</strong> del navegador y elige <strong style={{ color: '#ffffff' }}>"Instalar aplicación"</strong> o <strong style={{ color: '#ffffff' }}>"Añadir a pantalla de inicio"</strong>.
                </p>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '12px' }}>
                <div style={{ color: '#00D9FF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11.5px' }}>
                  <Smartphone size={14} /> iPhone / iPad (Safari)
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.45 }}>
                  Toca <strong style={{ color: '#ffffff' }}>Compartir (⎋)</strong> en Safari y selecciona <strong style={{ color: '#ffffff' }}>"Añadir a pantalla de inicio"</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '11px',
                background: 'linear-gradient(135deg, #00D9FF, #2563FF)',
                color: '#000000',
                fontWeight: 800,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
