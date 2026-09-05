import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { Copy, Check, FileDown, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import type { Message, ModelType } from '../types';
import { CodeBlock } from '../CodeBlock';
import { SlideDeckViewer } from '../SlideDeckViewer';
import { MODEL_META } from '../config';

export interface MessageBubbleProps {
  message: Message;
  activeModel?: ModelType;
  isMobile?: boolean;
  onExportPDF?: (title: string, label: string, color: string, msgs: Message[]) => void;
  renderPresentation?: (content: string) => React.ReactNode;
}

const ThinkingAccordion: React.FC<{ thoughtText: string }> = ({ thoughtText }) => {
  const [isOpen, setIsOpen] = useState(true);
  if (!thoughtText || !thoughtText.trim()) return null;

  return (
    <div
      style={{
        marginBottom: '14px',
        borderRadius: '10px',
        border: '1px solid rgba(0, 217, 255, 0.3)',
        backgroundColor: 'rgba(0, 217, 255, 0.03)',
        boxShadow: '0 0 20px rgba(0, 217, 255, 0.06)',
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
          padding: '9px 14px',
          background: 'none',
          border: 'none',
          color: '#00D9FF',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.4px',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#00D9FF',
              boxShadow: '0 0 8px #00D9FF',
            }}
          />
          PROCESO DE RAZONAMIENTO NEURAL
        </span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {isOpen && (
        <div
          style={{
            padding: '10px 14px 14px 14px',
            fontSize: '12.5px',
            color: '#94a3b8',
            lineHeight: '1.6',
            borderTop: '1px solid rgba(0, 217, 255, 0.12)',
            whiteSpace: 'pre-wrap',
            maxHeight: '280px',
            overflowY: 'auto',
            fontFamily: 'inherit',
          }}
        >
          {thoughtText}
        </div>
      )}
    </div>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  activeModel = 'speed',
  isMobile = false,
  onExportPDF,
  renderPresentation,
}) => {
  const [copied, setCopied] = useState(false);

  const msgModel = (message.model || activeModel) as ModelType;
  const meta = MODEL_META[msgModel] || MODEL_META.speed;
  const modelColor = meta.color || '#2563FF';
  const modelLabel = meta.label || 'Speed';

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

  const renderContent = (content: string) => {
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
            // Inline code
            return (
              <code
                style={{
                  backgroundColor: '#111118',
                  color: '#00D9FF',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  fontSize: '12.5px',
                  border: '1px solid rgba(0, 217, 255, 0.18)',
                  fontFamily: "'JetBrains Mono', Consolas, monospace",
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

  const isUser = message.role === 'user';

  return (
    <div
      className="lyaxis-msg-bubble"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'flex-start',
        maxWidth: '100%',
        width: '100%',
        backgroundColor: isUser ? '#0d0d14' : 'rgba(7, 7, 12, 0.88)',
        backdropFilter: 'blur(10px)',
        border: isUser ? '1px solid #22222e' : `1px solid ${modelColor}33`,
        borderRadius: '14px',
        padding: isMobile ? '12px 14px' : '16px 20px',
        fontSize: isMobile ? '13.5px' : '14.5px',
        lineHeight: '1.6',
        boxShadow: isUser ? '0 4px 18px rgba(0,0,0,0.5)' : `0 4px 24px rgba(0,0,0,0.65), 0 0 16px ${modelColor}11`,
        overflowWrap: 'break-word',
        animation: 'fadeIn 0.25s ease-out',
        position: 'relative',
      }}
    >
      {/* Message Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '11px',
          color: '#71717a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isUser ? '#94a3b8' : modelColor,
              boxShadow: isUser ? 'none' : `0 0 8px ${modelColor}`,
              display: 'inline-block',
            }}
          />
          <span style={{ fontWeight: 700, color: isUser ? '#cbd5e1' : modelColor, letterSpacing: '0.3px' }}>
            {isUser ? 'Tú' : `LYAXIS ${modelLabel}`}
          </span>
        </div>

        {!isUser && message.content && !message.isStreaming && (
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

      {/* Markdown / LaTeX Math Content */}
      <div
        className="markdown-content"
        style={{
          color: '#f1f5f9',
          opacity: !isUser && message.isStreaming ? 0.85 : 1,
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
            {message.isStreaming && <span className="lyaxis-cursor" />}
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
