import React, { useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { Code2, Copy, Check } from 'lucide-react';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', backgroundColor: '#0b0b10', borderBottom: '1px solid #16161e', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00D9FF', fontWeight: 600 }}>
          <Code2 size={14} />
          <span>{langStr}</span>
        </div>
        <button
          onClick={handleCopy}
          style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '4px 8px', borderRadius: '4px' }}
        >
          {copied ? <Check size={13} color="#00D9FF" /> : <Copy size={13} />}
          <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
        </button>
      </div>
      <pre style={{ margin: 0, padding: '16px', overflowX: 'auto', fontSize: '13.5px', lineHeight: '1.6', fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}>
        <code className={`hljs language-${langStr}`} dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
};