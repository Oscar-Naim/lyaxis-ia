import React, { useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language?: any;
  codeString: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, codeString }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let langStr = 'plaintext';
  if (typeof language === 'string' && language.trim()) {
    langStr = language.trim().replace(/^language-/, '').split(',')[0].trim();
  } else if (Array.isArray(language) && language.length > 1 && language) {
    langStr = String(language).replace(/^language-/, '').split(',')[0].trim();
  } else if (Array.isArray(language) && language.length > 0 && language[0]) {
    langStr = String(language[0]).replace(/^language-/, '').split(',')[0].trim();
  }

  const highlightedCode = hljs.getLanguage(langStr)
    ? hljs.highlight(codeString, { language: langStr }).value
    : hljs.highlightAuto(codeString).value;

  return (
    <div style={{ margin: '16px 0', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1c1c24', backgroundColor: '#050508', boxShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', backgroundColor: '#0b0b10', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Controles estilo Mac */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontWeight: 600, paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
            <span>{langStr}</span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '4px 10px', borderRadius: '6px', transition: 'all 0.2s' }}
        >
          {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
          <span style={{ color: copied ? '#10b981' : '#a1a1aa' }}>{copied ? '¡Copiado!' : 'Copiar código'}</span>
        </button>
      </div>
      <pre style={{ margin: 0, padding: '16px', overflowX: 'auto', fontSize: '13.5px', lineHeight: '1.6', fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}>
        <code className={`hljs language-${langStr}`} dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
};