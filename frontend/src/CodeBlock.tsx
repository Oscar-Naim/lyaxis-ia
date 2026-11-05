import React, { useState, useEffect, useRef, useMemo } from 'react';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/atom-one-dark.css';
import mermaid from 'mermaid';
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
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { LiveCanvasWorkspace } from './components/LiveCanvasWorkspace';
import { playCyberClick, playCyberSuccess } from './sound';

export interface CodeBlockProps {
  language?: any;
  codeString?: string;
  value?: string;
}

let isMermaidInitialized = false;

function initMermaidOnce(): void {
  if (isMermaidInitialized || typeof window === 'undefined') return;
  mermaid.initialize({
    startOnLoad: false,
    suppressErrorRendering: true,
    securityLevel: 'loose',
    theme: 'dark',
    darkMode: true,
    fontFamily: 'var(--lx-font-mono, "JetBrains Mono", monospace)',
    themeVariables: {
      primaryColor: '#0f172a',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#38bdf8',
      lineColor: '#38bdf8',
      secondaryColor: '#1e1b4b',
      tertiaryColor: '#090d16',
      mainBkg: '#090d16',
      nodeBorder: '#38bdf8',
      clusterBkg: 'rgba(15, 23, 42, 0.65)',
      clusterBorder: 'rgba(56, 189, 248, 0.4)',
      titleColor: '#38bdf8',
      edgeLabelBackground: '#090d16',
      actorBorder: '#38bdf8',
      actorBkg: '#0f172a',
      actorTextColor: '#f8fafc',
      signalColor: '#38bdf8',
      signalTextColor: '#f8fafc',
    },
  });
  isMermaidInitialized = true;
}

const MERMAID_DIAGRAM_TYPES = [
  'graph', 'flowchart', 'sequencediagram', 'classdiagram',
  'statediagram', 'erdiagram', 'gantt', 'pie', 'gitgraph',
  'journey', 'mindmap', 'timeline', 'quadrantchart', 'c4context', 'zenuml', 'block-beta',
  'sankey-beta', 'packet-beta', 'kanban', 'architecture-beta',
];

export function isLikelyValidMermaidSyntax(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return false;
  const firstLine = trimmed.split('\n')[0].replace(/%%.*$/, '').trim().toLowerCase();
  const isValidStart = MERMAID_DIAGRAM_TYPES.some((t) => firstLine.startsWith(t));
  if (!isValidStart) return false;

  const isEr = firstLine.startsWith('erdiagram');

  let square = 0;
  let paren = 0;
  let curly = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '[') square++;
    else if (char === ']') square--;
    else if (char === '(') paren++;
    else if (char === ')') paren--;
    else if (!isEr && char === '{') curly++;
    else if (!isEr && char === '}') curly--;
    if (square < 0 || paren < 0 || (!isEr && curly < 0)) return false;
  }
  return square === 0 && paren === 0 && (isEr || curly === 0);
}

export function namespaceMermaidSvg(svg: string, uniquePrefix: string): string {
  if (!svg) return svg;

  const idRegex = /\bid=["']([^"']+)["']/g;
  const idMap = new Map<string, string>();
  let match: RegExpExecArray | null;

  while ((match = idRegex.exec(svg)) !== null) {
    const originalId = match[1];
    if (!originalId.startsWith(`${uniquePrefix}_`)) {
      idMap.set(originalId, `${uniquePrefix}_${originalId}`);
    }
  }

  if (idMap.size === 0) return svg;

  let namespaced = svg;

  namespaced = namespaced.replace(/\bid=(["'])([^"']+)\1/g, (fullMatch, quote, id) => {
    const newId = idMap.get(id);
    return newId ? `id=${quote}${newId}${quote}` : fullMatch;
  });

  namespaced = namespaced.replace(/\b(href|xlink:href)=(["'])#([^"']+)\2/g, (fullMatch, attr, quote, id) => {
    const newId = idMap.get(id);
    return newId ? `${attr}=${quote}#${newId}${quote}` : fullMatch;
  });

  namespaced = namespaced.replace(/url\((["']?)#([^"')]+)\1\)/g, (fullMatch, quote, id) => {
    const newId = idMap.get(id);
    return newId ? `url(${quote}#${newId}${quote})` : fullMatch;
  });

  namespaced = namespaced.replace(/\b(aria-labelledby|aria-describedby)=(["'])([^"']+)\2/g, (_fullMatch, attr, quote, ids) => {
    const newIds = ids.split(/\s+/).map((id: string) => idMap.get(id) || id).join(' ');
    return `${attr}=${quote}${newIds}${quote}`;
  });

  return namespaced;
}

export function splitHighlightedHtml(html: string): string[] {
  const rawLines = html.split('\n');
  const openTags: Array<{ name: string; full: string }> = [];
  const output: string[] = [];

  for (const line of rawLines) {
    let lineOut = openTags.map((t) => t.full).join('') + line;

    const tagRegex = /<\/?([a-zA-Z0-9-]+)(?:\s+[^>]*)?>/g;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(line)) !== null) {
      const full = match[0];
      const name = match[1];
      if (full.startsWith('</')) {
        const idx = openTags.map((t) => t.name).lastIndexOf(name);
        if (idx !== -1) {
          openTags.splice(idx, 1);
        }
      } else if (!full.endsWith('/>')) {
        openTags.push({ name, full });
      }
    }

    for (let i = openTags.length - 1; i >= 0; i--) {
      lineOut += `</${openTags[i].name}>`;
    }
    output.push(lineOut || '&nbsp;');
  }
  return output;
}

interface MermaidErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface MermaidErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
  prevChildren?: React.ReactNode;
}

export class MermaidErrorBoundary extends React.Component<
  MermaidErrorBoundaryProps,
  MermaidErrorBoundaryState
> {
  constructor(props: MermaidErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null, prevChildren: props.children };
  }

  static getDerivedStateFromError(error: Error): Partial<MermaidErrorBoundaryState> {
    return { hasError: true, errorMessage: error?.message || 'Error al renderizar diagrama Mermaid' };
  }

  static getDerivedStateFromProps(
    props: MermaidErrorBoundaryProps,
    state: MermaidErrorBoundaryState
  ): Partial<MermaidErrorBoundaryState> | null {
    if (props.children !== state.prevChildren) {
      return {
        hasError: false,
        errorMessage: null,
        prevChildren: props.children,
      };
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Mermaid rendering caught by MermaidErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '12px',
            fontFamily: 'var(--lx-font-mono, monospace)',
            margin: '8px 0',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            ⚠ Error al renderizar diagrama arquitectónico Mermaid
          </div>
          <div style={{ opacity: 0.85, fontSize: '11px' }}>
            {this.state.errorMessage}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
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
  'c++': 'cpp',
  csharp: 'cs',
  'c#': 'cs',
  rust: 'rs',
  go: 'go',
  svg: 'svg',
  markdown: 'md',
  md: 'md',
  mermaid: 'mmd',
};

const HLJS_ALIAS: Record<string, string> = {
  'c++': 'cpp',
  'c#': 'csharp',
  'f#': 'fsharp',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  ps1: 'powershell',
  jsx: 'javascript',
  tsx: 'typescript',
};

function getLanguageAccent(lang: string): string {
  if (['ts', 'tsx', 'typescript', 'py', 'python'].includes(lang)) return '#38bdf8';
  if (['js', 'jsx', 'javascript', 'json', 'yaml', 'yml'].includes(lang)) return '#fbbf24';
  if (['html', 'xml', 'svg', 'vue', 'css', 'scss'].includes(lang)) return '#34d399';
  if (['sql', 'graphql', 'prisma'].includes(lang)) return '#f472b6';
  if (['rust', 'rs', 'go', 'c', 'cpp', 'c++', 'csharp', 'c#', 'java'].includes(lang)) return '#fb923c';
  if (lang === 'mermaid') return '#c084fc';
  if (['bash', 'sh', 'shell', 'zsh', 'powershell'].includes(lang)) return '#4ade80';
  return '#94a3b8';
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, codeString, value }) => {
  const [copied, setCopied] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mermaidSvg, setMermaidSvg] = useState<string | null>(null);
  const [mermaidLoading, setMermaidLoading] = useState(false);
  const [mermaidError, setMermaidError] = useState<string | null>(null);
  const [showMermaidSource, setShowMermaidSource] = useState(false);
  const [mermaidZoom, setMermaidZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Normalize code content from either codeString or value prop
  const rawCode = useMemo(() => {
    return (codeString !== undefined ? codeString : value !== undefined ? value : '').replace(/\r\n/g, '\n');
  }, [codeString, value]);

  // Normalize language name to clean lowercase string
  const langStr = useMemo(() => {
    if (typeof language === 'string' && language.trim()) {
      return language.trim().replace(/^language-/, '').split(',')[0].trim().toLowerCase();
    } else if (Array.isArray(language) && language.length > 0 && language[0]) {
      return String(language[0]).replace(/^language-/, '').split(',')[0].trim().toLowerCase();
    }
    return 'plaintext';
  }, [language]);

  const langAccent = useMemo(() => getLanguageAccent(langStr), [langStr]);

  // Check if code is runnable in live canvas sandbox
  const isRunnable = useMemo(() => {
    return (
      ['html', 'xml', 'svg', 'react', 'jsx', 'tsx', 'javascript', 'js', 'css', 'vue'].includes(langStr) ||
      rawCode.trim().startsWith('<!DOCTYPE') ||
      rawCode.trim().startsWith('<html') ||
      rawCode.trim().startsWith('<svg')
    );
  }, [langStr, rawCode]);

  // Handle pointer drag for panning
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: panStartRef.current.x + (e.clientX - dragStartRef.current.x),
      y: panStartRef.current.y + (e.clientY - dragStartRef.current.y),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
  };

  const handleResetTransform = () => {
    setMermaidZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Render Mermaid diagrams dynamically (Zero-Glitch Engine: debounced + isLikelyValidMermaidSyntax + namespaceMermaidSvg)
  useEffect(() => {
    if (langStr !== 'mermaid') return;
    const trimmedCode = rawCode.trim();
    if (!trimmedCode) {
      setMermaidSvg(null);
      setMermaidLoading(false);
      setMermaidError(null);
      return;
    }

    if (!isLikelyValidMermaidSyntax(trimmedCode)) {
      setMermaidLoading(false);
      setMermaidError('Vista de código activa (diagrama en transmisión o sintaxis incompleta)');
      return;
    }

    let isMounted = true;
    setMermaidLoading(true);
    setMermaidError(null);

    const timer = setTimeout(async () => {
      const uniqueSuffix = Math.random().toString(36).substring(2, 9);
      const id = `mermaid-${uniqueSuffix}`;
      const prefix = `lx_m_${uniqueSuffix}`;
      try {
        initMermaidOnce();
        const isValid = await mermaid.parse(trimmedCode, { suppressErrors: true });
        if (isValid === false) {
          if (isMounted) {
            setMermaidLoading(false);
            setMermaidError('Vista de código activa (diagrama en transmisión o sintaxis extendida)');
          }
          return;
        }

        const { svg } = await mermaid.render(id, trimmedCode);
        const namespacedSvg = namespaceMermaidSvg(svg, prefix);
        if (isMounted) {
          setMermaidSvg(namespacedSvg);
          setMermaidError(null);
          setMermaidLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setMermaidLoading(false);
          setMermaidError(err?.message || 'Vista de código activa (sintaxis Mermaid no renderizable)');
        }
      } finally {
        if (typeof document !== 'undefined') {
          try {
            const stray = document.getElementById(`d${id}`) || document.getElementById(id);
            if (stray && stray.parentElement === document.body) {
              stray.remove();
            }
          } catch {
            // Silently ignore
          }
        }
      }
    }, 220);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [langStr, rawCode]);

  // Memoized syntax highlighting
  const highlightedCode = useMemo(() => {
    const hljsLang = HLJS_ALIAS[langStr] || langStr;
    try {
      if (hljsLang !== 'plaintext' && hljs.getLanguage(hljsLang)) {
        return hljs.highlight(rawCode, { language: hljsLang, ignoreIllegals: true }).value;
      } else if (hljsLang === 'plaintext') {
        return rawCode
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      } else {
        return hljs.highlightAuto(rawCode).value;
      }
    } catch {
      return rawCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }, [rawCode, langStr]);

  const highlightedLines = useMemo(() => {
    return splitHighlightedHtml(highlightedCode);
  }, [highlightedCode]);

  // Tactile copy with Web Audio and haptic vibration
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = rawCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    playCyberSuccess();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignore
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
  const codeLines = useMemo(() => rawCode.split('\n'), [rawCode]);
  const displayLines = useMemo(() => {
    return codeLines.length > 1 && codeLines[codeLines.length - 1] === ''
      ? codeLines.slice(0, -1)
      : codeLines;
  }, [codeLines]);
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontFamily: 'var(--lx-font-mono)',
                fontWeight: 700,
                color: langAccent,
                textTransform: 'lowercase',
                letterSpacing: '0.3px',
                backgroundColor: `${langAccent}14`,
                padding: '2px 9px',
                borderRadius: '6px',
                border: `1px solid ${langAccent}38`,
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: langAccent,
                  boxShadow: `0 0 8px ${langAccent}`,
                }}
              />
              {langStr}
            </span>
            <span
              className="lx-tabular"
              style={{
                fontSize: '10.5px',
                color: '#64748b',
                fontFamily: 'var(--lx-font-mono)',
              }}
            >
              {displayLines.length} {displayLines.length === 1 ? 'línea' : 'líneas'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="lyaxis-code-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                    onClick={() => setMermaidZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
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
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#cbd5e1', padding: '0 4px', minWidth: '38px', textAlign: 'center' }}>
                    {Math.round(mermaidZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setMermaidZoom((z) => Math.min(4.0, +(z + 0.25).toFixed(2)))}
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
                    onClick={handleResetTransform}
                    title="Restablecer vista (1:1)"
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
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(true)}
                    title="Pantalla Completa"
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
                    <Maximize2 size={11} />
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

          {/* Copy Button with tactile emerald feedback */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar código al portapapeles"
            style={{
              background: copied ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.04)',
              border: copied ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: copied ? '#10b981' : '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '6px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: copied ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
            }}
          >
            {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Mermaid Diagram Render View (Zero-Glitch Engine) */}
      <MermaidErrorBoundary
        fallback={
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '12px',
              fontFamily: 'var(--lx-font-mono, monospace)',
              margin: '8px',
            }}
          >
            ⚠ Error inesperado al renderizar diagrama Mermaid. Mostrando código fuente.
          </div>
        }
      >
        {langStr === 'mermaid' && mermaidLoading && !mermaidSvg && !showMermaidSource ? (
          <div style={{ padding: '18px 16px', backgroundColor: '#040711' }}>
            <div className="lyaxis-mermaid-skeleton" />
            <div
              style={{
                marginTop: '10px',
                fontSize: '11px',
                fontFamily: 'var(--lx-font-mono)',
                color: '#a78bfa',
                textAlign: 'center',
              }}
            >
              Sincronizando diagrama arquitectónico...
            </div>
          </div>
        ) : mermaidSvg && !showMermaidSource ? (
          <div
            className="lyaxis-mermaid-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              position: 'relative',
              padding: '24px 16px',
              backgroundColor: '#040711',
              backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.12) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
              height: '420px',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            <div
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${mermaidZoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                maxWidth: '100%',
                pointerEvents: 'none',
              }}
              dangerouslySetInnerHTML={{ __html: mermaidSvg }}
            />
          </div>
        ) : (
          /* Code Body with CSS Grid Line Numbers & Collapse Overlay */
          <>
            {langStr === 'mermaid' && mermaidError && !mermaidSvg && (
              <div
                style={{
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontFamily: 'var(--lx-font-mono)',
                  color: '#c084fc',
                  backgroundColor: 'rgba(168, 85, 247, 0.08)',
                  borderBottom: '1px solid rgba(168, 85, 247, 0.18)',
                }}
              >
                ◇ {mermaidError}
              </div>
            )}
            <div
              className="lyaxis-code-grid-wrapper"
              style={{
                position: 'relative',
                overflowX: wordWrap ? 'hidden' : 'auto',
                overflowY: 'hidden',
                maxHeight: isCollapsed ? '210px' : 'none',
                backgroundColor: '#030306',
              }}
            >
              <div
                className="lyaxis-code-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  width: '100%',
                  minWidth: '100%',
                  fontFamily: 'var(--lx-font-mono, monospace)',
                  fontSize: '13px',
                  lineHeight: '1.65',
                  backgroundColor: '#030306',
                }}
              >
                {displayLines.map((_, i) => (
                  <div key={i} className="lyaxis-code-line-row" style={{ display: 'contents' }}>
                    <div
                      className="lyaxis-code-gutter-cell lx-tabular"
                      style={{
                        gridColumn: 1,
                        userSelect: 'none',
                        textAlign: 'right',
                        padding: '0 12px 0 14px',
                        color: 'rgba(255, 255, 255, 0.28)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                        backgroundColor: '#030306',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        alignSelf: 'start',
                        whiteSpace: 'nowrap',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div
                      className="lyaxis-code-content-cell"
                      style={{
                        gridColumn: 2,
                        padding: '0 16px',
                        color: '#f8fafc',
                        whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                        wordBreak: wordWrap ? 'break-word' : 'normal',
                        overflowWrap: wordWrap ? 'break-word' : 'normal',
                        minWidth: 0,
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                      }}
                      dangerouslySetInnerHTML={{ __html: highlightedLines[i] || '&nbsp;' }}
                    />
                  </div>
                ))}
              </div>

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
                    zIndex: 10,
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
          </>
        )}
      </MermaidErrorBoundary>

      {/* Fullscreen Interactive Diagram Modal */}
      {isFullscreen && mermaidSvg && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.96)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: '#070b14',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                Diagrama Arquitectónico Mermaid
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                {Math.round(mermaidZoom * 100)}%
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setMermaidZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                title="Alejar"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={() => setMermaidZoom((z) => Math.min(4.0, +(z + 0.25).toFixed(2)))}
                title="Acercar"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={handleResetTransform}
                title="Restablecer vista"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                title="Salir de pantalla completa (Esc)"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#f87171',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                }}
              >
                <Minimize2 size={14} />
                <span>Cerrar</span>
              </button>
            </div>
          </div>
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.12) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <div
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${mermaidZoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                pointerEvents: 'none',
              }}
              dangerouslySetInnerHTML={{ __html: mermaidSvg }}
            />
          </div>
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
