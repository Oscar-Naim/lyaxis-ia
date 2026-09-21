import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Code,
  Smartphone,
  Tablet,
  Monitor,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { playCyberClick } from '../sound';

export interface ArtifactsCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode: string;
  language?: string;
  title?: string;
  accentColor?: string;
}

export const ArtifactsCanvasModal: React.FC<ArtifactsCanvasModalProps> = ({
  isOpen,
  onClose,
  initialCode,
  language = 'html',
  title = 'LYAXIS Live Canvas',
  accentColor = '#00d9ff',
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanLang = (language || 'html').toLowerCase().replace(/^language-/, '').trim();

  // Prepare iframe HTML bundle with modern CSS, Babel/React CDN if JSX, or SVG wrapper
  const generateSandboxHtml = (code: string, lang: string): string => {
    if (lang === 'svg' || code.trim().startsWith('<svg')) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      background: #090d16;
      color: #f8fafc;
      font-family: system-ui, sans-serif;
    }
    svg {
      max-width: 100%;
      height: auto;
      filter: drop-shadow(0 10px 25px rgba(0,0,0,0.5));
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
    }

    const isFullHtml = code.toLowerCase().includes('<html') || code.toLowerCase().includes('<!doctype');
    if (isFullHtml) {
      return code;
    }

    if (lang === 'jsx' || lang === 'tsx' || code.includes('export default') || code.includes('import React')) {
      const cleanReactCode = code
        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
        .replace(/export\s+default\s+/g, 'const App = ')
        .replace(/export\s+/g, '');

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      margin: 0;
      background: #090d16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${cleanReactCode}
    if (typeof App !== 'undefined') {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
    }
  </script>
</body>
</html>`;
    }

    // Default HTML/CSS/JS snippet wrapper with Tailwind & modern reset
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 16px;
      background: #090d16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(initialCode);
      setCopied(true);
      playCyberClick();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    playCyberClick();
    const ext = cleanLang === 'svg' ? 'svg' : cleanLang === 'javascript' ? 'js' : cleanLang === 'css' ? 'css' : 'html';
    const blob = new Blob([initialCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lyaxis-canvas-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const viewportWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 5, 10, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '16px',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: isFullscreen ? '100vw' : '96vw',
          maxWidth: isFullscreen ? '100vw' : '1280px',
          height: isFullscreen ? '100vh' : '92vh',
          backgroundColor: '#07090f',
          borderRadius: isFullscreen ? '0' : '16px',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          boxShadow: '0 0 50px rgba(0, 217, 255, 0.15), 0 25px 60px rgba(0, 0, 0, 0.95)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#0a0d16',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Title & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 217, 255, 0.12)',
                border: '1px solid rgba(0, 217, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} color={accentColor} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{title}</span>
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(0, 217, 255, 0.15)', color: accentColor, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                  {cleanLang}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                // LYAXIS ARTIFACTS · ISOLATED SANDBOX
              </div>
            </div>
          </div>

          {/* View Mode & Viewport Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Tab Selector */}
            <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('preview'); playCyberClick(); }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: activeTab === 'preview' ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
                  color: activeTab === 'preview' ? '#00d9ff' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                <Play size={12} />
                <span>Previsualización</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('code'); playCyberClick(); }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: activeTab === 'code' ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
                  color: activeTab === 'code' ? '#00d9ff' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                <Code size={12} />
                <span>Código Fuente</span>
              </button>
            </div>

            {/* Viewport Widths (Only in preview mode) */}
            {activeTab === 'preview' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  title="Vista Desktop (100%)"
                  onClick={() => { setViewport('desktop'); playCyberClick(); }}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: viewport === 'desktop' ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
                    color: viewport === 'desktop' ? '#00d9ff' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Monitor size={14} />
                </button>
                <button
                  type="button"
                  title="Vista Tablet (768px)"
                  onClick={() => { setViewport('tablet'); playCyberClick(); }}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: viewport === 'tablet' ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
                    color: viewport === 'tablet' ? '#00d9ff' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Tablet size={14} />
                </button>
                <button
                  type="button"
                  title="Vista Móvil (375px)"
                  onClick={() => { setViewport('mobile'); playCyberClick(); }}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: viewport === 'mobile' ? 'rgba(0, 217, 255, 0.2)' : 'transparent',
                    color: viewport === 'mobile' ? '#00d9ff' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Smartphone size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              title="Recargar Sandbox"
              onClick={() => { setRefreshKey((k) => k + 1); playCyberClick(); }}
              style={{
                padding: '6px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              title="Copiar Código"
              onClick={handleCopy}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                color: copied ? '#10b981' : '#94a3b8',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              type="button"
              title="Descargar Archivo"
              onClick={handleDownload}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
                color: '#00d9ff',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Download size={13} />
              <span>Descargar</span>
            </button>
            <button
              type="button"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              onClick={() => { setIsFullscreen((f) => !f); playCyberClick(); }}
              style={{
                padding: '6px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              type="button"
              title="Cerrar Canvas"
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                marginLeft: '4px',
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#05070c', display: 'flex', justifyContent: 'center' }}>
          {activeTab === 'preview' ? (
            <div
              style={{
                width: viewportWidths[viewport],
                maxWidth: '100%',
                height: '100%',
                transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                backgroundColor: '#ffffff',
                boxShadow: viewport !== 'desktop' ? '0 0 40px rgba(0, 0, 0, 0.8)' : 'none',
                position: 'relative',
              }}
            >
              <iframe
                key={refreshKey}
                ref={iframeRef}
                title="LYAXIS Sandbox"
                srcDoc={generateSandboxHtml(initialCode, cleanLang)}
                sandbox="allow-scripts allow-modals allow-forms"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', overflow: 'auto', padding: '20px', boxSizing: 'border-box' }}>
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: '#090d16',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '12.5px',
                  lineHeight: '1.6',
                  color: '#cbd5e1',
                  overflowX: 'auto',
                }}
              >
                <code>{initialCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
