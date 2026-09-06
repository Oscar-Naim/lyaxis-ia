import React, { useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { Copy, Check } from 'lucide-react';

export interface CodeBlockProps {
  language?: any;
  codeString?: string;
  value?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, codeString, value }) => {
  const [copied, setCopied] = useState(false);

  // Normalize code content from either codeString or value prop
  const rawCode = (codeString !== undefined ? codeString : value !== undefined ? value : '').replace(/\r\n/g, '\n');

  // Normalize language name to clean lowercase string
  let langStr = 'plaintext';
  if (typeof language === 'string' && language.trim()) {
    langStr = language.trim().replace(/^language-/, '').split(',')[0].trim().toLowerCase();
  } else if (Array.isArray(language) && language.length > 0 && language[0]) {
    langStr = String(language[0]).replace(/^language-/, '').split(',')[0].trim().toLowerCase();
  }

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
      // Fallback
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

  // Compute lines for discrete line numbering
  const codeLines = rawCode.split('\n');
  // Trim trailing empty line from editor end
  const displayLines = codeLines.length > 1 && codeLines[codeLines.length - 1] === ''
    ? codeLines.slice(0, -1)
    : codeLines;

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
      {/* Sleek Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          backgroundColor: '#07070c',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Window dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
          </div>

          {/* Language tag in lowercase */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
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
          </div>
        </div>

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
          onMouseEnter={(e) => {
            if (!copied) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.color = '#a1a1aa';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
          }}
        >
          {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
          <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
        </button>
      </div>

      {/* Code Body with Line Numbers & Custom Scrollbar */}
      <div style={{ display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Discrete Line Numbers Gutter */}
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

        {/* Code Content — Deep OLED Black with zero grey boxes */}
        <pre
          className="lyaxis-code-pre"
          style={{
            margin: 0,
            padding: '14px 16px',
            overflowX: 'auto',
            flex: 1,
            fontSize: '13px',
            lineHeight: '1.6',
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            backgroundColor: '#030306',
            color: '#f8fafc',
            whiteSpace: 'pre',
            wordWrap: 'normal',
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
            }}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;