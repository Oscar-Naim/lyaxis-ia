import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { 
  Copy, Check, FileDown, ChevronDown, ChevronRight, Sparkles, BookOpen, 
  Zap, Crosshair, Brain, Compass, MessageCircle, Waypoints, Hammer, 
  GraduationCap, Terminal, User as UserIcon, ShieldAlert, Cpu
} from 'lucide-react';
import type { Message, ModelType } from '../types';
import { CodeBlock } from '../CodeBlock';
import { SlideDeckViewer } from '../SlideDeckViewer';
import { MODEL_META } from '../config';

export const MODEL_ROLE_DETAILS: Record<ModelType, {
  roleTag: string;
  badgeText: string;
  badgeBg: string;
  badgeBorder: string;
}> = {
  speed: {
    roleTag: '// MOTOR DE RESPUESTAS ÁGILES · STREAMING INMEDIATO',
    badgeText: 'FAST ~14ms',
    badgeBg: 'rgba(37, 99, 255, 0.14)',
    badgeBorder: 'rgba(37, 99, 255, 0.4)',
  },
  cortex: {
    roleTag: '// NÚCLEO DE RAZONAMIENTO PROFUNDO & ARQUITECTURA',
    badgeText: 'DEEP THINKING',
    badgeBg: 'rgba(124, 58, 237, 0.14)',
    badgeBorder: 'rgba(124, 58, 237, 0.4)',
  },
  phantom: {
    roleTag: '// AUDITOR IMPLACABLE DE VULNERABILIDADES & RIESGOS',
    badgeText: 'SECURITY AUDIT',
    badgeBg: 'rgba(239, 68, 68, 0.14)',
    badgeBorder: 'rgba(239, 68, 68, 0.4)',
  },
  architect: {
    roleTag: '// INGENIERO DE SYSTEM PROMPTS & MENTOR TÉCNICO',
    badgeText: 'PROMPT ARCHITECT',
    badgeBg: 'rgba(16, 185, 129, 0.14)',
    badgeBorder: 'rgba(16, 185, 129, 0.4)',
  },
  classic: {
    roleTag: '// ASISTENTE CONVERSACIONAL Y DE USO COTIDIANO',
    badgeText: 'DAILY ASSISTANT',
    badgeBg: 'rgba(245, 158, 11, 0.14)',
    badgeBorder: 'rgba(245, 158, 11, 0.4)',
  },
  nexus: {
    roleTag: '// SINTETIZADOR CREATIVO, ANALOGÍAS & MULTIMODAL',
    badgeText: 'MULTIMODAL SYNTHESIS',
    badgeBg: 'rgba(236, 72, 153, 0.14)',
    badgeBorder: 'rgba(236, 72, 153, 0.4)',
  },
  forge: {
    roleTag: '// CONSTRUCTOR PRÁCTICO · ATERRIZAJE DE MVPs & NEGOCIOS',
    badgeText: 'MVP BUILDER',
    badgeBg: 'rgba(249, 115, 22, 0.14)',
    badgeBorder: 'rgba(249, 115, 22, 0.4)',
  },
  magister: {
    roleTag: '// ASESOR PEDAGÓGICO SENIOR & PLANEACIONES SEP',
    badgeText: 'SEP PEDAGOGY',
    badgeBg: 'rgba(6, 182, 212, 0.14)',
    badgeBorder: 'rgba(6, 182, 212, 0.4)',
  },
  root: {
    roleTag: '// EJECUCIÓN BARE-METAL · CÓDIGO PURO 100% REAL',
    badgeText: 'CODE COMPILER',
    badgeBg: 'rgba(0, 255, 102, 0.14)',
    badgeBorder: 'rgba(0, 255, 102, 0.4)',
  },
};

export const getModelIconNode = (model: ModelType, size = 16) => {
  switch (model) {
    case 'speed': return <Zap size={size} />;
    case 'cortex': return <Brain size={size} />;
    case 'architect': return <Compass size={size} />;
    case 'classic': return <MessageCircle size={size} />;
    case 'phantom': return <Crosshair size={size} />;
    case 'nexus': return <Waypoints size={size} />;
    case 'forge': return <Hammer size={size} />;
    case 'magister': return <GraduationCap size={size} />;
    case 'root': return <Terminal size={size} />;
    default: return <Sparkles size={size} />;
  }
};

export interface MessageBubbleProps {
  message: Message;
  activeModel?: ModelType;
  isMobile?: boolean;
  onExportPDF?: (title: string, label: string, color: string, msgs: Message[]) => void;
  onOpenInNotebook?: (content: string, model: ModelType) => void;
  renderPresentation?: (content: string) => React.ReactNode;
}

export interface ParsedTriad {
  isTriad: boolean;
  create: string;
  breakText: string;
  rebuild: string;
}

export function parseTriadContent(content: string): ParsedTriad {
  if (!content || !content.includes('[TRIAD_CORE:')) {
    return { isTriad: false, create: '', breakText: '', rebuild: '' };
  }

  const extractBlock = (core: string) => {
    const openTag = `[TRIAD_CORE:${core}]`;
    const closeTag = `[/TRIAD_CORE:${core}]`;
    const start = content.indexOf(openTag);
    if (start === -1) return '';
    const afterOpen = start + openTag.length;
    const end = content.indexOf(closeTag, afterOpen);
    if (end !== -1) {
      return content.slice(afterOpen, end).trim();
    }
    const nextTag = content.indexOf('[TRIAD_CORE:', afterOpen);
    if (nextTag !== -1) {
      return content.slice(afterOpen, nextTag).trim();
    }
    return content.slice(afterOpen).trim();
  };

  return {
    isTriad: true,
    create: extractBlock('create'),
    breakText: extractBlock('break'),
    rebuild: extractBlock('rebuild'),
  };
}

const ThinkingAccordion: React.FC<{ thoughtText: string }> = ({ thoughtText }) => {
  const [isOpen, setIsOpen] = useState(true);
  if (!thoughtText || !thoughtText.trim()) return null;

  return (
    <div
      style={{
        marginBottom: '12px',
        borderRadius: '10px',
        border: '1px solid rgba(168, 85, 247, 0.28)',
        backgroundColor: '#000000',
        boxShadow: '0 0 20px rgba(168, 85, 247, 0.08)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'rgba(168, 85, 247, 0.08)',
          border: 'none',
          borderBottom: isOpen ? '1px solid rgba(168, 85, 247, 0.18)' : 'none',
          color: '#c084fc',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'monospace',
          letterSpacing: '0.4px',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={14} color="#c084fc" />
          RAZONAMIENTO ARQUITECTÓNICO
        </span>
        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>

      {isOpen && (
        <div
          style={{
            padding: '10px 14px',
            fontSize: '12px',
            color: '#cbd5e1',
            lineHeight: '1.6',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              p({ children }: any) {
                return <p style={{ margin: '4px 0' }}>{children}</p>;
              },
              strong({ children }: any) {
                return <strong style={{ color: '#d8b4fe', fontWeight: 700 }}>{children}</strong>;
              },
              code({ children }: any) {
                return (
                  <code
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      color: '#c084fc',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {thoughtText}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

const AiEnrichedImage: React.FC<{ src?: string; alt?: string; title?: string }> = ({ src, alt, title }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src) return null;

  return (
    <figure
      style={{
        margin: '18px 0',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        backgroundColor: '#07070b',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
        position: 'relative',
      }}
    >
      {!loaded && !error && (
        <div
          style={{
            width: '100%',
            height: '220px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: 'rgba(0, 217, 255, 0.03)',
            border: '1px dashed rgba(0, 217, 255, 0.25)',
            color: '#94a3b8',
            fontSize: '12px',
          }}
        >
          <Sparkles size={18} color="#00D9FF" className="animate-spin" />
          <span style={{ fontFamily: 'monospace', letterSpacing: '0.4px' }}>
            GENERANDO ILUSTRACIÓN IA...
          </span>
        </div>
      )}

      {error ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#ef4444', fontSize: '11.5px' }}>
          <span>No se pudo cargar la imagen</span>
          {alt && <p style={{ margin: '4px 0 0', color: '#71717a' }}>{alt}</p>}
        </div>
      ) : (
        <img
          src={src}
          alt={alt || 'Ilustración técnica'}
          title={title || alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            display: loaded ? 'block' : 'none',
            width: '100%',
            maxHeight: '420px',
            objectFit: 'cover',
            borderRadius: alt ? '14px 14px 0 0' : '14px',
            transition: 'opacity 0.25s ease',
          }}
        />
      )}

      {alt && (
        <figcaption
          style={{
            padding: '8px 14px',
            fontSize: '11.5px',
            color: '#cbd5e1',
            fontStyle: 'italic',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(10, 10, 16, 0.92)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={11} color="#00D9FF" style={{ flexShrink: 0 }} />
          <span>{alt}</span>
        </figcaption>
      )}
    </figure>
  );
};



export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  activeModel = 'speed',
  isMobile = false,
  onExportPDF,
  onOpenInNotebook,
  renderPresentation,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedVerdict, setCopiedVerdict] = useState(false);

  const parsedTriad = parseTriadContent(message.content || '');
  const isTriad = parsedTriad.isTriad;

  const msgModel = (message.model || activeModel) as ModelType;
  const meta = MODEL_META[msgModel] || MODEL_META.speed;
  const modelColor = isTriad ? '#7C3AED' : (meta.color || '#2563FF');
  const modelLabel = isTriad ? 'TRIAD™' : (meta.label || 'Speed');

  const isUser = message.role === 'user';

  const handleCopyText = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = message.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyVerdict = async () => {
    const verdictText = `=== LYAXIS TRIAD™ VEREDICTO ===\n\n` +
      `[NÚCLEO I · CREATE (Speed)]\n${parsedTriad.create}\n\n` +
      `[NÚCLEO II · BREAK (Phantom)]\n${parsedTriad.breakText}\n\n` +
      `[NÚCLEO III · REBUILD (Cortex Pro)]\n${parsedTriad.rebuild.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim()}`;

    try {
      await navigator.clipboard.writeText(verdictText);
      setCopiedVerdict(true);
      setTimeout(() => setCopiedVerdict(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = verdictText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedVerdict(true);
      setTimeout(() => setCopiedVerdict(false), 2000);
    }
  };

  const renderConnector = () => (
    <div style={{ padding: '3px 0', display: 'flex', justifyContent: 'center' }}>
      <div className="lyaxis-triad-connector-line">
        <div className="lyaxis-triad-connector-pulse" />
      </div>
    </div>
  );

  const renderTriadCard = (
    coreNum: string,
    title: string,
    modelTag: string,
    color: string,
    accentGlow: string,
    iconEmoji: string,
    body: string,
    isStreamingActive: boolean
  ) => {
    const hasContent = Boolean(body && body.trim());
    const isThisCoreWriting = isStreamingActive && hasContent;

    return (
      <div
        className="lyaxis-triad-card"
        style={{
          backgroundColor: '#000000',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: `2px solid ${color}`,
          borderRadius: '14px',
          padding: isMobile ? '13px' : '15px 17px',
          boxShadow: `0 8px 30px rgba(0, 0, 0, 0.95), 0 0 20px ${accentGlow}`,
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            paddingBottom: '9px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '15px' }}>{iconEmoji}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: isMobile ? '12px' : '12.5px', color: color, letterSpacing: '0.4px' }}>
                {title}
              </span>
              <span style={{ fontSize: '10px', color: '#71717a', fontFamily: 'monospace', fontWeight: 600 }}>
                {modelTag}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isThisCoreWriting && (
              <span
                style={{
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: `${color}25`,
                  border: `1px solid ${color}`,
                  color: '#ffffff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                EN VIVO
              </span>
            )}
            <span
              style={{
                fontSize: '9.5px',
                fontFamily: 'monospace',
                padding: '2px 7px',
                borderRadius: '6px',
                backgroundColor: `${color}15`,
                border: `1px solid ${color}45`,
                color: color,
                fontWeight: 800,
                letterSpacing: '0.3px',
              }}
            >
              {coreNum === '1' ? 'CREATE' : (coreNum === '2' ? 'BREAK' : 'REBUILD')}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ flex: 1, overflowWrap: 'break-word', fontSize: isMobile ? '13px' : '13.5px', lineHeight: 1.6, color: '#f1f5f9' }}>
          {hasContent ? (
            <div>
              {title.includes('REBUILD') && body.includes('<thought>') ? (
                (() => {
                  const parts = body.split('</thought>');
                  const thoughtPart = parts[0].replace('<thought>', '').trim();
                  const finalRebuild = parts.length > 1 ? parts.slice(1).join('</thought>').trim() : '';
                  return (
                    <>
                      <ThinkingAccordion thoughtText={thoughtPart} />
                      {finalRebuild ? renderMarkdown(finalRebuild) : (
                        <div style={{ fontSize: '12px', color: '#c084fc', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0' }}>
                          <Sparkles size={14} className="animate-spin" /> Sintetizando solución final...
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                renderMarkdown(body)
              )}
              {isStreamingActive && <span className="lyaxis-cursor" />}
            </div>
          ) : isStreamingActive ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0', color: color, fontSize: '12px', fontStyle: 'italic' }}>
              <Sparkles size={14} className="animate-spin" /> Procesando en vivo a la par...
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#52525b', fontStyle: 'italic', padding: '8px 0' }}>
              Sincronizando núcleo...
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTriadView = (triad: ParsedTriad) => {
    const isStreaming = Boolean(message.isStreaming);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {/* Live Multi-Core Telemetry Strip — Full OLED Black */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderRadius: '12px',
            backgroundColor: '#000000',
            border: '1px solid rgba(124, 58, 237, 0.35)',
            boxShadow: '0 0 24px rgba(124, 58, 237, 0.12)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(124, 58, 237, 0.15)',
                border: '1px solid #7C3AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(124, 58, 237, 0.4)',
              }}
            >
              <Zap size={15} color="#00D9FF" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: 800, color: '#ffffff', letterSpacing: '0.4px' }}>
                LYAXIS TRIAD™ // TRANSMISIÓN SIMULTÁNEA EN PARALELO
              </span>
              <span style={{ fontSize: '10px', color: '#a78bfa', fontFamily: 'monospace' }}>
                3 NÚCLEOS EJECUTANDO A LA PAR · LATENCIA REDUCIDA
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '10.5px', fontFamily: 'monospace' }}>
            <span style={{ color: '#00D9FF', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00D9FF', boxShadow: '0 0 8px #00D9FF' }} />
              I: SPEED
            </span>
            <span style={{ color: '#FF3366', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FF3366', boxShadow: '0 0 8px #FF3366' }} />
              II: PHANTOM
            </span>
            <span style={{ color: '#C084FC', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#C084FC', boxShadow: '0 0 8px #C084FC' }} />
              III: CORTEX
            </span>
          </div>
        </div>

        {/* 3-Column Side-by-Side Parallel Dashboard Grid — Hugs Content (No Empty Dead Boxes) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
            gap: '12px',
            width: '100%',
            alignItems: 'start',
          }}
        >
          {/* Panel 1: CREATE (Speed) */}
          {renderTriadCard(
            '1',
            'NÚCLEO I · CREATE',
            'LYAXIS SPEED',
            '#00D9FF',
            'rgba(0, 217, 255, 0.15)',
            '⚡',
            triad.create,
            isStreaming
          )}

          {/* Panel 2: BREAK (Phantom) */}
          {renderTriadCard(
            '2',
            'NÚCLEO II · BREAK',
            'LYAXIS PHANTOM',
            '#FF3366',
            'rgba(255, 51, 102, 0.15)',
            '🎯',
            triad.breakText,
            isStreaming
          )}

          {/* Panel 3: REBUILD (Cortex Pro) */}
          {renderTriadCard(
            '3',
            'NÚCLEO III · REBUILD',
            'LYAXIS CORTEX',
            '#C084FC',
            'rgba(192, 132, 252, 0.15)',
            '🧠',
            triad.rebuild,
            isStreaming
          )}
        </div>
      </div>
    );
  };

  const renderContent = (content: string) => {
    if (parsedTriad.isTriad) {
      return renderTriadView(parsedTriad);
    }

    // Canvas Slide Deck Presentation
    if (content.includes('<slide')) {
      if (renderPresentation) return renderPresentation(content);
      return (
        <SlideDeckViewer
          rawContent={content}
          presentationTitle={`Presentación LYAXIS ${modelLabel}`}
        />
      );
    }

    // Reasoning Thought Process
    if (content.includes('<thought>')) {
      const parts = content.split('</thought>');
      const thoughtPart = parts[0].replace('<thought>', '').trim();
      const finalContent = parts.length > 1 ? parts.slice(1).join('</thought>').trim() : '';

      return (
        <>
          <ThinkingAccordion thoughtText={thoughtPart} />
          {finalContent ? (
            finalContent.includes('<slide') ? (
              renderPresentation ? renderPresentation(finalContent) : (
                <SlideDeckViewer rawContent={finalContent} presentationTitle={`Presentación LYAXIS ${modelLabel}`} />
              )
            ) : (
              renderMarkdown(finalContent)
            )
          ) : message.isStreaming ? (
            <div style={{ fontSize: '13px', color: '#c084fc', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0' }}>
              <Sparkles size={14} className="animate-spin" /> Sintetizando solución final...
            </div>
          ) : null}
        </>
      );
    }

    return renderMarkdown(content);
  };

  const renderMarkdown = (text: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img({ src, alt, title }: any) {
            return <AiEnrichedImage src={src} alt={alt} title={title} />;
          },
          table({ children, ...props }: any) {
            return (
              <div className="lyaxis-markdown-table-wrapper" style={{
                overflowX: 'auto',
                margin: '14px 0',
                borderRadius: '10px',
                border: '1px solid #2A2A3E',
                backgroundColor: 'rgba(8, 8, 14, 0.85)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} {...props}>
                  {children}
                </table>
              </div>
            );
          },
          thead({ children, ...props }: any) {
            return (
              <thead style={{ backgroundColor: 'rgba(42, 42, 62, 0.45)', borderBottom: '2px solid #2A2A3E' }} {...props}>
                {children}
              </thead>
            );
          },
          th({ children, ...props }: any) {
            return (
              <th
                style={{
                  padding: '10px 14px',
                  fontWeight: 700,
                  color: '#00D9FF',
                  textAlign: 'left',
                  borderRight: '1px solid #2A2A3E',
                  letterSpacing: '0.3px',
                }}
                {...props}
              >
                {children}
              </th>
            );
          },
          td({ children, ...props }: any) {
            return (
              <td
                style={{
                  padding: '9px 14px',
                  borderBottom: '1px solid rgba(42, 42, 62, 0.7)',
                  borderRight: '1px solid rgba(42, 42, 62, 0.4)',
                  color: '#e4e4e7',
                }}
                {...props}
              >
                {children}
              </td>
            );
          },
          tr({ children, ...props }: any) {
            return (
              <tr style={{ transition: 'background-color 0.15s ease' }} {...props}>
                {children}
              </tr>
            );
          },
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children || '').replace(/\n$/, '');

            if (match) {
              return <CodeBlock language={match[1]} codeString={codeString} />;
            }
            // Inline code — High contrast OLED styling
            return (
              <code
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  fontFamily: "'JetBrains Mono', Consolas, monospace",
                  fontWeight: 600,
                  letterSpacing: '0.2px',
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          blockquote({ children, ...props }: any) {
            return (
              <blockquote
                style={{
                  borderLeft: `3px solid ${modelColor}`,
                  margin: '12px 0',
                  padding: '8px 16px',
                  backgroundColor: `${modelColor}0d`,
                  borderRadius: '0 8px 8px 0',
                  color: '#cbd5e1',
                  fontStyle: 'italic',
                }}
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          a({ href, children, ...props }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#00D9FF',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(0, 217, 255, 0.4)',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = '#00D9FF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'rgba(0, 217, 255, 0.4)'; }}
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  return (
    <div
      className={`lyaxis-msg-bubble ${isTriad ? 'lyaxis-triad-bubble' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'flex-start',
        maxWidth: '100%',
        width: '100%',
        backgroundColor: isTriad ? 'transparent' : (isUser ? '#07070a' : '#000000'),
        backdropFilter: isTriad ? 'none' : 'blur(16px)',
        WebkitBackdropFilter: isTriad ? 'none' : 'blur(16px)',
        border: isTriad 
          ? 'none' 
          : (isUser ? '1px solid #1a1a24' : '1px solid rgba(255, 255, 255, 0.08)'),
        borderLeft: isTriad
          ? 'none'
          : (isUser ? '1px solid #1a1a24' : `3px solid ${modelColor}`),
        borderRadius: '14px',
        padding: isTriad ? 0 : (isMobile ? '12px 14px' : '16px 20px'),
        fontSize: isMobile ? '13.5px' : '14.5px',
        lineHeight: '1.6',
        boxShadow: isTriad 
          ? 'none' 
          : (isUser 
              ? '0 4px 18px rgba(0,0,0,0.5)' 
              : `0 8px 30px rgba(0,0,0,0.8), 0 0 20px ${modelColor}14`),
        overflowWrap: 'break-word',
        animation: 'fadeIn 0.25s ease-out',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Message Header — Core Identity & Actions */}
      {!isTriad && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          paddingBottom: '10px',
          borderBottom: isUser ? '1px solid rgba(255, 255, 255, 0.05)' : (isTriad ? '1px solid rgba(124, 58, 237, 0.25)' : `1px solid ${modelColor}20`),
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        {isUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                flexShrink: 0,
              }}
            >
              <UserIcon size={15} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff', letterSpacing: '0.3px' }}>Tú</span>
              <span style={{ fontSize: '10px', color: '#71717a', fontFamily: 'monospace' }}>// PROMPT ENVIADO</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: isMobile ? '32px' : '36px',
                height: isMobile ? '32px' : '36px',
                borderRadius: '10px',
                backgroundColor: isTriad ? 'rgba(124, 58, 237, 0.16)' : `${modelColor}16`,
                border: `1px solid ${isTriad ? '#7C3AED' : modelColor}66`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isTriad ? '#00D9FF' : modelColor,
                boxShadow: `0 0 16px ${isTriad ? '#7C3AED' : modelColor}35`,
                flexShrink: 0,
              }}
            >
              {isTriad ? <Zap size={18} color="#00D9FF" /> : getModelIconNode(msgModel, 18)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: isMobile ? '13px' : '14px',
                    color: '#ffffff',
                    letterSpacing: '0.4px',
                    lineHeight: 1.25,
                  }}
                >
                  {isTriad ? 'LYAXIS TRIAD™' : `LYAXIS ${modelLabel.toUpperCase()}`}
                </span>

                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: isTriad ? 'rgba(124, 58, 237, 0.22)' : (MODEL_ROLE_DETAILS[msgModel]?.badgeBg || 'rgba(37,99,255,0.12)'),
                    border: `1px solid ${isTriad ? 'rgba(124, 58, 237, 0.55)' : (MODEL_ROLE_DETAILS[msgModel]?.badgeBorder || 'rgba(37,99,255,0.35)')}`,
                    color: isTriad ? '#d8b4fe' : modelColor,
                    letterSpacing: '0.4px',
                    boxShadow: isTriad ? '0 0 8px rgba(124, 58, 237, 0.3)' : `0 0 8px ${modelColor}22`,
                  }}
                >
                  {isTriad ? '3 CORES SYNCED' : (MODEL_ROLE_DETAILS[msgModel]?.badgeText || 'AI CORE')}
                </span>
              </div>

              <span
                style={{
                  fontSize: '10.5px',
                  fontFamily: 'monospace',
                  color: isTriad ? '#c084fc' : '#94a3b8',
                  letterSpacing: '0.2px',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {isTriad ? '// ORQUESTACIÓN TRIÁDICA: CREATE ➔ BREAK ➔ REBUILD' : (MODEL_ROLE_DETAILS[msgModel]?.roleTag || '// MOTOR INTELIGENTE DE LYAXIS LABS')}
              </span>
            </div>
          </div>
        )}

        {!isUser && message.content && !message.isStreaming && !isTriad && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              title="Copiar texto"
              onClick={handleCopyText}
              style={{
                background: copied ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: copied ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '3px 8px',
                color: copied ? '#10b981' : '#a1a1aa',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            {onOpenInNotebook && (
              <button
                type="button"
                title="Abrir en LYAXIS Notebook"
                onClick={() => onOpenInNotebook(message.content, msgModel)}
                style={{
                  background: 'rgba(0, 217, 255, 0.06)',
                  border: '1px solid rgba(0, 217, 255, 0.22)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  color: '#00D9FF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 217, 255, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 217, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.22)';
                }}
              >
                <BookOpen size={12} color="#00D9FF" />
                <span>Notebook</span>
              </button>
            )}

            {onExportPDF && (
              <button
                type="button"
                title="Exportar a PDF"
                onClick={() => onExportPDF('Respuesta LYAXIS', modelLabel, modelColor, [message])}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  color: '#00D9FF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  transition: 'all 0.15s ease',
                }}
              >
                <FileDown size={12} />
                <span>PDF</span>
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {/* Multimodal Attached Image */}
      {message.image && (
        <div style={{ marginBottom: '12px' }}>
          <img
            src={message.image}
            alt="Imagen adjunta por el usuario"
            style={{
              maxWidth: '100%',
              maxHeight: '340px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              objectFit: 'contain',
              backgroundColor: '#000000',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Markdown / LaTeX Math / Triad Content */}
      <div
        className="markdown-content"
        style={{
          color: '#f1f5f9',
          opacity: !isUser && message.isStreaming ? 0.92 : 1,
        }}
      >
        {!message.content && message.isStreaming ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 2px' }}>
            <span className="lyaxis-loading-dot" />
            <span className="lyaxis-loading-dot" />
            <span className="lyaxis-loading-dot" />
          </div>
        ) : !message.content && !message.isStreaming ? (
          <span style={{ color: '#71717a', fontStyle: 'italic' }}>⚠️ Conectando con la IA...</span>
        ) : (
          <>
            {renderContent(message.content)}
            {message.isStreaming && !isTriad && <span className="lyaxis-cursor" />}
          </>
        )}
      </div>

      {/* Footer bar for Triad assistant message */}
      {!isUser && isTriad && !message.isStreaming && (
        <div
          style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(124, 58, 237, 0.25)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyVerdict}
              title="Copiar veredicto completo de los 3 núcleos"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: copiedVerdict ? 'rgba(16, 185, 129, 0.15)' : 'rgba(124, 58, 237, 0.14)',
                border: copiedVerdict ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(124, 58, 237, 0.4)',
                color: copiedVerdict ? '#10b981' : '#c084fc',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              {copiedVerdict ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
              <span>{copiedVerdict ? '¡Veredicto copiado!' : 'Copiar Veredicto Completo'}</span>
            </button>

            {onExportPDF && (
              <button
                type="button"
                onClick={() => onExportPDF('Veredicto LYAXIS TRIAD', 'LYAXIS TRIAD™', '#7C3AED', [message])}
                title="Descargar veredicto en PDF"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 217, 255, 0.08)',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  color: '#00D9FF',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                <FileDown size={13} />
                <span>Descargar PDF</span>
              </button>
            )}
          </div>

          <span style={{ fontSize: '10.5px', color: '#7C3AED', fontFamily: 'monospace', fontWeight: 600 }}>
            LYAXIS TRIAD™ // SYNTHESIS VERIFIED
          </span>
        </div>
      )}

      {/* Footer bar for standard assistant message: "Copiar respuesta completa" */}
      {!isUser && !isTriad && message.content && !message.isStreaming && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#71717a',
          }}
        >
          <button
            type="button"
            onClick={handleCopyText}
            title="Copiar respuesta completa"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 11px',
              borderRadius: '6px',
              backgroundColor: copied ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: copied ? '#10b981' : '#a1a1aa',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
            <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar respuesta completa'}</span>
          </button>

          <span style={{ fontSize: '10.5px', color: '#52525b', fontFamily: 'monospace' }}>
            LYAXIS labs™ // DETERMINISTIC
          </span>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
