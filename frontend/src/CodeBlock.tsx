import React, { useState, useEffect } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import {
  Copy,
  Check,
  Play,
  Workflow,
  WrapText,
  Download,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Columns,
} from 'lucide-react';
import { LiveCanvasWorkspace } from './components/LiveCanvasWorkspace';
import { playCyberClick } from './sound';

export interface CodeBlockProps {
  language?: any;
  codeString?: string;
  value?: string;
}

const EXT_MAP: Record<string, string> = {
  python: 'py',
  py: 'py',
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  javascript: 'js',
  js: 'js',
  jsx: 'jsx',
  html: 'html',
  css: 'css',
  json: 'json',
  sql: 'sql',
  bash: 'sh',
  sh: 'sh',
  shell: 'sh',
  c: 'c',
  cpp: 'cpp',
  rust: 'rs',
  go: 'go',
  svg: 'svg',
  markdown: 'md',
  md: 'md',
  mermaid: 'mmd',
};

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, codeString, value }) => {
  const [copied, setCopied] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mermaidSvg, setMermaidSvg] = useState<string | null>(null);
  const [showMermaidSource, setShowMermaidSource] = useState(false);
  const [mermaidZoom, setMermaidZoom] = useState<number>(1);

  // Normalize code content from either codeString or value prop
  const rawCode = (codeString !== undefined ? codeString : value !== undefined ? value : '').replace(/\r\n/g, '\n');

  // Normalize language name to clean lowercase string
  let langStr = 'plaintext';
  if (typeof language === 'string' && language.trim()) {
    langStr = language.trim().replace(/^language-/, '').split(',')[0].trim().toLowerCase();
  } else if (Array.isArray(language) && language.length > 0 && language[0]) {
    langStr = String(language[0]).replace(/^language-/, '').split(',')[0].trim().toLowerCase();
  }

  // Check if code is runnable in live canvas sandbox
  const isRunnable =
    ['html', 'xml', 'svg', 'react', 'jsx', 'tsx', 'javascript', 'js', 'css', 'vue'].includes(langStr) ||
    rawCode.trim().startsWith('<!DOCTYPE') ||
    rawCode.trim().startsWith('<html') ||
    rawCode.trim().startsWith('<svg');

  // Render Mermaid diagrams dynamically
  useEffect(() => {
    if (langStr === 'mermaid') {
      let isMounted = true;
      (async () => {
        try {
          const mermaidModule = await import(
            /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
          );
          const mermaid = mermaidModule.default;
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            darkMode: true,
            themeVariables: {
              primaryColor: '#00d9ff',
              primaryTextColor: '#ffffff',
              lineColor: '#3b82f6',
              mainBkg: '#070b14',
            },
          });
          const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
          const { svg } = await mermaid.render(id, rawCode);
          if (isMounted) setMermaidSvg(svg);
        } catch (err) {
          console.warn('Aviso renderizando Mermaid:', err);
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [langStr, rawCode]);

  // Highlight code
  let highlightedCode = '';
  try {
    if (hljs.getLanguage(langStr)) {
      highlightedCode = hljs.highlight(rawCode, { language: langStr, ignoreIllegals: true }).value;
    } else {
      highlightedCode = hljs.highlightAuto(rawCode).value;
    }
  } catch {
    highlightedCode = rawCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = rawCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCode = () => {
    playCyberClick();
    if (mermaidSvg && !showMermaidSource) {
      const blob = new Blob([mermaidSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lyaxis-diagram-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    const ext = EXT_MAP[langStr] || 'txt';
    const blob = new Blob([rawCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lyaxis-snippet-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenSplitView = () => {
    playCyberClick();
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      window.dispatchEvent(
        new CustomEvent('lyaxis_open_split_canvas', {
          detail: {
            code: rawCode,
            language: langStr,
            title: `LYAXIS Live Canvas · ${langStr.toUpperCase()}`,
          },
        })
      );
    } else {
      setIsCanvasOpen((prev) => !prev);
    }
  };

  // Compute lines for discrete line numbering
  const codeLines = rawCode.split('\n');
  const displayLines =
    codeLines.length > 1 && codeLines[codeLines.length - 1] === ''
      ? codeLines.slice(0, -1)
      : codeLines;
  const isLongCode = displayLines.length > 35;

  return (
    <div
      className="lyaxis-codeblock-container"
      style={{
        margin: '16px 0',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#030306',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.85), 0 0 1px rgba(255, 255, 255, 0.1)',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Sleek MacOS Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          backgroundColor: '#07070c',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Window dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
          </div>

          {/* Language tag + Line count */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingLeft: '10px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                fontWeight: 600,
                color: '#00D9FF',
                textTransform: 'lowercase',
                letterSpacing: '0.4px',
                backgroundColor: 'rgba(0, 217, 255, 0.08)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(0, 217, 255, 0.2)',
              }}
            >
              {langStr}
            </span>
            <span
              style={{
                fontSize: '10.5px',
                color: '#64748b',
                fontFamily: 'monospace',
              }}
            >
              {displayLines.length} {displayLines.length === 1 ? 'línea' : 'líneas'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {isRunnable && (
            <>
              <button
                type="button"
                onClick={handleOpenSplitView}
                title="Abrir en Panel Split-View Lateral (Escritorio) o Visor"
                style={{
                  background: 'rgba(0, 217, 255, 0.12)',
                  border: '1px solid rgba(0, 217, 255, 0.4)',
                  color: '#00d9ff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 10px rgba(0, 217, 255, 0.15)',
                }}
              >
                <Columns size={12} />
                <span>Split Canvas</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCanvasOpen((prev) => !prev);
                  playCyberClick();
                }}
                title="Previsualizar y ejecutar código aquí mismo"
                style={{
                  background: isCanvasOpen ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: isCanvasOpen ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isCanvasOpen ? '#10b981' : '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Play size={11} />
                <span>{isCanvasOpen ? 'Ocultar' : 'Inline'}</span>
              </button>
            </>
          )}

          {mermaidSvg && (
            <>
              {!showMermaidSource && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMermaidZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(1)))}
                    title="Alejar diagrama"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px 5px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ZoomOut size={12} />
                  </button>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#cbd5e1', padding: '0 4px' }}>
                    {Math.round(mermaidZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setMermaidZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(1)))}
                    title="Acercar diagrama"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px 5px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ZoomIn size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMermaidZoom(1)}
                    title="Restablecer zoom"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px 5px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowMermaidSource(!showMermaidSource);
                  playCyberClick();
                }}
                title="Alternar entre diagrama y código fuente"
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                <Workflow size={12} />
                <span>{showMermaidSource ? 'Ver Diagrama' : 'Ver Código'}</span>
              </button>
            </>
          )}

          {(!mermaidSvg || showMermaidSource) && (
            <button
              type="button"
              onClick={() => setWordWrap((w) => !w)}
              title={wordWrap ? 'Desactivar ajuste de línea' : 'Activar ajuste de línea (Word Wrap)'}
              style={{
                background: wordWrap ? 'rgba(0, 217, 255, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                border: wordWrap ? '1px solid rgba(0, 217, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: wordWrap ? '#00D9FF' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <WrapText size={12} />
            </button>
          )}

          {isLongCode && (!mermaidSvg || showMermaidSource) && (
            <button
              type="button"
              onClick={() => setIsCollapsed((c) => !c)}
              title={isCollapsed ? 'Expandir bloque de código' : 'Colapsar bloque de código'}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              <span>{isCollapsed ? 'Expandir' : 'Colapsar'}</span>
            </button>
          )}

          {/* Download Snippet / SVG */}
          <button
            type="button"
            onClick={handleDownloadCode}
            title={mermaidSvg && !showMermaidSource ? 'Descargar diagrama SVG' : 'Descargar archivo de código'}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <Download size={12} />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar código al portapapeles"
            style={{
              background: copied ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: copied ? '#10b981' : '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '6px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: copied ? '0 0 10px rgba(16, 185, 129, 0.25)' : 'none',
            }}
          >
            {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Mermaid Diagram Render View */}
      {mermaidSvg && !showMermaidSource ? (
        <div
          style={{
            padding: '24px 16px',
            backgroundColor: '#040711',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'auto',
            maxHeight: '540px',
          }}
        >
          <div
            style={{
              transform: `scale(${mermaidZoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
            }}
            dangerouslySetInnerHTML={{ __html: mermaidSvg }}
          />
        </div>
      ) : (
        /* Code Body with Line Numbers & Collapse Overlay */
        <div
          style={{
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
            maxHeight: isCollapsed ? '210px' : 'none',
          }}
        >
          {/* Discrete Line Numbers Gutter */}
          {!wordWrap && (
            <div
              style={{
                userSelect: 'none',
                textAlign: 'right',
                padding: '14px 12px 14px 14px',
                color: 'rgba(255, 255, 255, 0.22)',
                fontSize: '12px',
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineHeight: '1.6',
                borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                backgroundColor: '#030306',
                flexShrink: 0,
                minWidth: '38px',
              }}
            >
              {displayLines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          )}

          {/* Code Content — Deep OLED Black with zero grey boxes */}
          <pre
            className="lyaxis-code-pre"
            style={{
              margin: 0,
              padding: '14px 16px',
              overflowX: wordWrap ? 'hidden' : 'auto',
              flex: 1,
              fontSize: '13px',
              lineHeight: '1.6',
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              backgroundColor: '#030306',
              color: '#f8fafc',
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              wordBreak: wordWrap ? 'break-word' : 'normal',
            }}
          >
            <code
              className={`hljs language-${langStr}`}
              style={{
                background: 'transparent !important',
                backgroundColor: 'transparent !important',
                padding: 0,
                fontFamily: 'inherit',
                fontSize: 'inherit',
                whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              }}
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>

          {/* Bottom Gradient Expand Bar when Collapsed */}
          {isCollapsed && (
            <div
              onClick={() => setIsCollapsed(false)}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '64px',
                background: 'linear-gradient(to bottom, transparent, rgba(3, 3, 6, 0.96) 70%)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '10px',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#00D9FF',
                  backgroundColor: 'rgba(0, 217, 255, 0.12)',
                  border: '1px solid rgba(0, 217, 255, 0.35)',
                  padding: '4px 12px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ChevronDown size={13} />
                Mostrar las {displayLines.length} líneas completas
              </span>
            </div>
          )}
        </div>
      )}

      {/* Inline Artifacts Live Canvas Studio */}
      {isRunnable && isCanvasOpen && (
        <div style={{ height: '480px', borderTop: '1px solid rgba(0, 217, 255, 0.25)' }}>
          <LiveCanvasWorkspace
            isOpen={isCanvasOpen}
            onClose={() => setIsCanvasOpen(false)}
            code={rawCode}
            language={langStr}
            title={`LYAXIS Live Canvas · ${langStr.toUpperCase()}`}
            accentColor="#00d9ff"
          />
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
