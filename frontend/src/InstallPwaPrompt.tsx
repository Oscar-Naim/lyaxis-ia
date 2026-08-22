import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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
      {/* Floating Cyber-HUD Install Prompt Bar */}
      <div className="fixed bottom-6 left-6 z-50 max-w-sm w-[calc(100vw-3rem)] sm:w-auto p-4 rounded-2xl border border-cyan-500/30 bg-black/90 shadow-[0_0_30px_rgba(0,240,255,0.2)] backdrop-blur-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Download className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h4 className="font-sans text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Instalar App PWA <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            </h4>
            <p className="text-[10px] text-gray-400 font-mono">Descarga LYAXIS IA en tu dispositivo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-600 text-black font-bold font-mono text-[10px] tracking-wider rounded-xl uppercase transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer flex items-center gap-1.5 hover:scale-105"
          >
            <span>Instalar</span> ⤓
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-gray-500 hover:text-white transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
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
