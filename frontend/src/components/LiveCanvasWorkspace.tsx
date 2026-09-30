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
  Terminal as TerminalIcon,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { playCyberClick, playCyberBeep } from '../sound';

export interface LiveCanvasWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language?: string;
  title?: string;
  accentColor?: string;
  isDocked?: boolean;
  onToggleDock?: () => void;
  onCodeChange?: (newCode: string) => void;
}

export const LiveCanvasWorkspace: React.FC<LiveCanvasWorkspaceProps> = ({
  isOpen,
  onClose,
  code: initialCode,
  language = 'html',
  title = 'LYAXIS Live Canvas Studio',
  accentColor = '#00d9ff',
  _isDocked = true,
  _onToggleDock,
  onCodeChange,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editableCode, setEditableCode] = useState(initialCode);
  const [consoleLogs, setConsoleLogs] = useState<{ type: 'log' | 'error' | 'warn'; msg: string; time: string }[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setEditableCode(initialCode);
    setConsoleLogs([]);
  }, [initialCode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === 'Escape' && !isFullscreen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  // Interceptar mensajes de la consola del iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.source === 'lyaxis-sandbox-console') {
        const now = new Date().toLocaleTimeString();
        setConsoleLogs((prev) => [
          ...prev.slice(-40),
          { type: event.data.type || 'log', msg: String(event.data.message || ''), time: now },
        ]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isOpen) return null;

  const cleanLang = (language || 'html').toLowerCase().replace(/^language-/, '').trim();

  // Generador de sandbox HTML seguro y enriquecido
  const generateSandboxHtml = (codeToRun: string, lang: string): string => {
    const consoleHookScript = `
      <script>
        (function() {
          const send = (type, msg) => {
            window.parent.postMessage({ source: 'lyaxis-sandbox-console', type: type, message: msg }, '*');
          };
          const origLog = console.log;
          const origErr = console.error;
          const origWarn = console.warn;
          console.log = function(...args) {
            origLog.apply(console, args);
            send('log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
          };
          console.error = function(...args) {
            origErr.apply(console, args);
            send('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
          };
          console.warn = function(...args) {
            origWarn.apply(console, args);
            send('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
          };
          window.onerror = function(msg, url, line) {
            send('error', msg + ' (Línea ' + line + ')');
          };
        })();
      </script>
    `;

    if (lang === 'svg' || codeToRun.trim().startsWith('<svg')) {
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
      font-family: system-ui, -apple-system, sans-serif;
    }
    svg {
      max-width: 100%;
      height: auto;
      filter: drop-shadow(0 10px 25px rgba(0,0,0,0.5));
    }
  </style>
  ${consoleHookScript}
</head>
<body>
  ${codeToRun}
</body>
</html>`;
    }

    const isFullHtml = codeToRun.toLowerCase().includes('<html') || codeToRun.toLowerCase().includes('<!doctype');
    if (isFullHtml) {
      if (codeToRun.includes('<head>')) {
        return codeToRun.replace('<head>', `<head>${consoleHookScript}`);
      }
      return `${consoleHookScript}${codeToRun}`;
    }

    if (lang === 'jsx' || lang === 'tsx' || codeToRun.includes('export default') || codeToRun.includes('import React')) {
      const cleanReactCode = codeToRun
        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
        .replace(/export\s+default\s+/g, 'const App = ')
        .replace(/export\s+/g, '');

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      background-color: #0d1117;
      color: #f0f6fc;
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
  ${consoleHookScript}
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${cleanReactCode}
    try {
      const rootElement = document.getElementById('root');
      if (typeof App !== 'undefined') {
        const root = ReactDOM.createRoot(rootElement);
        root.render(<App />);
      } else {
        rootElement.innerHTML = '<div style="color: #ef4444; padding: 20px;">⚠️ No se encontró el componente principal <code>App</code>.</div>';
      }
    } catch (err) {
      console.error(err);
      document.getElementById('root').innerHTML = '<div style="color: #ef4444; padding: 20px;"><b>Error de Renderizado:</b> ' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #0d1117;
      color: #f0f6fc;
      font-family: system-ui, -apple-system, sans-serif;
    }
  </style>
  ${consoleHookScript}
</head>
<body>
  ${codeToRun}
</body>
</html>`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableCode);
    setCopied(true);
    playCyberClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    playCyberClick();
    const ext = cleanLang === 'svg' ? 'svg' : cleanLang === 'jsx' || cleanLang === 'tsx' ? 'tsx' : 'html';
    const blob = new Blob([editableCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lyaxis-artifact-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getViewportWidth = () => {
    if (viewport === 'mobile') return '375px';
    if (viewport === 'tablet') return '768px';
    return '100%';
  };

  return (
    <div
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : 'auto',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : '100%',
        zIndex: isFullscreen ? 99999 : 50,
        backgroundColor: '#0a0d16',
        borderLeft: isFullscreen ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.65)',
        overflow: 'hidden',
      }}
    >
      {/* Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#07090e',
          flexShrink: 0,
          gap: '12px',
        }}
      >
        {/* Izquierda: Título y Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              backgroundColor: `${accentColor}22`,
              border: `1px solid ${accentColor}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={14} color={accentColor} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </span>
            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
              Motor Interactivo ({cleanLang.toUpperCase()})
            </span>
          </div>
        </div>

        {/* Centro: Tabs y Viewport */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tabs Preview vs Code */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => { setActiveTab('preview'); playCyberClick(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'preview' ? `${accentColor}25` : 'transparent',
                color: activeTab === 'preview' ? '#ffffff' : '#a1a1aa',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Play size={12} color={activeTab === 'preview' ? accentColor : '#a1a1aa'} />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('code'); playCyberClick(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'code' ? `${accentColor}25` : 'transparent',
                color: activeTab === 'code' ? '#ffffff' : '#a1a1aa',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Code size={12} color={activeTab === 'code' ? accentColor : '#a1a1aa'} />
              <span>Código</span>
            </button>
          </div>

          {/* Viewport controls (only in preview mode) */}
          {activeTab === 'preview' && (
            <div
              style={{
                display: 'none',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '2px',
              }}
              className="md:flex"
            >
              <button
                type="button"
                onClick={() => { setViewport('desktop'); playCyberClick(); }}
                title="Vista Monitor"
                style={{
                  padding: '4px 7px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: viewport === 'desktop' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: viewport === 'desktop' ? '#ffffff' : '#71717a',
                  cursor: 'pointer',
                }}
              >
                <Monitor size={13} />
              </button>
              <button
                type="button"
                onClick={() => { setViewport('tablet'); playCyberClick(); }}
                title="Vista Tablet"
                style={{
                  padding: '4px 7px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: viewport === 'tablet' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: viewport === 'tablet' ? '#ffffff' : '#71717a',
                  cursor: 'pointer',
                }}
              >
                <Tablet size={13} />
              </button>
              <button
                type="button"
                onClick={() => { setViewport('mobile'); playCyberClick(); }}
                title="Vista Smartphone"
                style={{
                  padding: '4px 7px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: viewport === 'mobile' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: viewport === 'mobile' ? '#ffffff' : '#71717a',
                  cursor: 'pointer',
                }}
              >
                <Smartphone size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Derecha: Acciones Rápidas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => { setRefreshKey((k) => k + 1); playCyberClick(); }}
            title="Reiniciar Ejecución"
            style={{
              padding: '6px',
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar Código"
            style={{
              padding: '6px',
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              color: copied ? '#10b981' : '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Descargar Archivo"
            style={{
              padding: '6px',
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Download size={13} />
          </button>
          <button
            type="button"
            onClick={() => { setIsFullscreen(!isFullscreen); playCyberClick(); }}
            title={isFullscreen ? 'Reducir' : 'Pantalla Completa'}
            style={{
              padding: '6px',
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            type="button"
            onClick={() => { playCyberClick(); onClose(); }}
            title="Cerrar Live Canvas"
            style={{
              padding: '6px',
              borderRadius: '7px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#06080d',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {activeTab === 'preview' ? (
          <div
            style={{
              width: getViewportWidth(),
              height: '100%',
              transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              backgroundColor: '#090d16',
              boxShadow: viewport !== 'desktop' ? '0 0 35px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.1)' : 'none',
              borderRadius: viewport !== 'desktop' ? '12px' : '0',
              overflow: 'hidden',
              margin: viewport !== 'desktop' ? '16px 0' : '0',
            }}
          >
            <iframe
              ref={iframeRef}
              key={refreshKey}
              srcDoc={generateSandboxHtml(editableCode, cleanLang)}
              title="LYAXIS Sandbox"
              sandbox="allow-scripts allow-modals allow-same-origin"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#090d16',
              }}
            />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', overflow: 'auto', padding: '16px' }}>
            <textarea
              value={editableCode}
              onChange={(e) => {
                setEditableCode(e.target.value);
                if (onCodeChange) onCodeChange(e.target.value);
              }}
              spellCheck={false}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#07090e',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '16px',
                color: '#e4e4e7',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '13px',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'none',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        )}
      </div>

      {/* Footer Consola Interactiva */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#05070b',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => { setIsConsoleOpen(!isConsoleOpen); playCyberClick(); }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 16px',
            background: 'transparent',
            border: 'none',
            color: consoleLogs.some((l) => l.type === 'error') ? '#ef4444' : '#a1a1aa',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TerminalIcon size={12} />
            <span>Consola de Ejecución ({consoleLogs.length} logs)</span>
            {consoleLogs.some((l) => l.type === 'error') && (
              <span
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  borderRadius: '4px',
                  padding: '1px 5px',
                  fontSize: '10px',
                }}
              >
                Error detectado
              </span>
            )}
          </div>
          {isConsoleOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>

        {isConsoleOpen && (
          <div
            style={{
              maxHeight: '120px',
              overflowY: 'auto',
              padding: '8px 16px 12px',
              fontFamily: 'monospace',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderTop: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            {consoleLogs.length === 0 ? (
              <span style={{ color: '#71717a' }}>No hay mensajes en consola.</span>
            ) : (
              consoleLogs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    color: log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : '#a1a1aa',
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: '#52525b' }}>[{log.time}]</span>
                  <span>{log.msg}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
