import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
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
      {/* Floating Cyber-HUD Install Prompt Bar — Positioned above bottom bar */}
      <div 
        style={{
          position: 'fixed',
          bottom: '90px',
          right: '24px',
          zIndex: 9990,
          maxWidth: '380px',
          width: 'calc(100vw - 3rem)',
          padding: '12px 16px',
          borderRadius: '16px',
          border: '1px solid rgba(0, 217, 255, 0.35)',
          backgroundColor: 'rgba(8, 8, 14, 0.94)',
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.9), 0 0 25px rgba(0, 217, 255, 0.2)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D9FF', flexShrink: 0 }}>
            <Download size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Instalar App PWA
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Descarga LYAXIS IA en tu dispositivo</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              padding: '6px 14px',
              background: 'linear-gradient(135deg, #00D9FF, #2563FF)',
              color: '#000000',
              fontWeight: 800,
              fontSize: '11px',
              letterSpacing: '0.5px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(0, 217, 255, 0.4)',
              transition: 'transform 0.2s',
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
            style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Manual Installation Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl border border-cyan-500/40 bg-black/95 relative overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.2)] text-left">
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-cyan-400" />
                <h3 className="font-sans font-bold text-base text-white uppercase tracking-wide">Instalar LYAXIS IA</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs text-gray-300">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <div className="text-cyan-400 font-bold flex items-center gap-2 uppercase">
                  <Monitor className="w-4 h-4" /> PC / Escritorio (Chrome, Edge, Brave)
                </div>
                <p className="text-[11px] text-gray-400">
                  Haz clic en el icono de <strong className="text-white">Instalar (⊕ / ⤓)</strong> en la barra de direcciones de tu navegador arriba a la derecha.
                </p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <div className="text-cyan-400 font-bold flex items-center gap-2 uppercase">
                  <Smartphone className="w-4 h-4" /> Celular (Android / Chrome)
                </div>
                <p className="text-[11px] text-gray-400">
                  Toca el menú de 3 puntos (⋮) arriba a la derecha y selecciona <strong className="text-white">"Añadir a la pantalla de inicio"</strong> o <strong className="text-white">"Instalar aplicación"</strong>.
                </p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                <div className="text-cyan-400 font-bold flex items-center gap-2 uppercase">
                  <Smartphone className="w-4 h-4" /> iPhone / iPad (Safari)
                </div>
                <p className="text-[11px] text-gray-400">
                  Toca el botón de <strong className="text-white">Compartir (⎋)</strong> en Safari y presiona <strong className="text-white">"Añadir a pantalla de inicio"</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full py-3 bg-cyan-400 text-black font-bold font-mono text-xs uppercase rounded-xl hover:bg-cyan-300 transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
