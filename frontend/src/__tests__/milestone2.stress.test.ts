import { describe, it, expect } from 'vitest';
import { normalizeStreamingMarkdown } from '../components/MessageBubble';
import {
  isLikelyValidMermaidSyntax,
  namespaceMermaidSvg,
  splitHighlightedHtml,
} from '../CodeBlock';
import * as fs from 'fs';
import * as path from 'path';

/* =====================================================================
   SUITE 1: normalizeStreamingMarkdown Stress & Frontier Normalization
===================================================================== */
describe('normalizeStreamingMarkdown — Frontier Safety & Boundary Normalization', () => {
  it('returns raw text unchanged when isStreaming is falsy or text is empty', () => {
    expect(normalizeStreamingMarkdown('')).toBe('');
    expect(normalizeStreamingMarkdown('```ts\nconst x = 1;', false)).toBe('```ts\nconst x = 1;');
    expect(normalizeStreamingMarkdown('$$\nE = mc^2', undefined)).toBe('$$\nE = mc^2');
  });

  it('closes unclosed backtick code fences deterministically', () => {
    const raw = 'Hello\n```ts\nconst x = 1;';
    const result = normalizeStreamingMarkdown(raw, true);
    expect(result).toBe('Hello\n```ts\nconst x = 1;\n```');
  });

  it('closes unclosed tilde code fences deterministically', () => {
    const raw = 'Tilde fence:\n~~~python\nprint(42)';
    const result = normalizeStreamingMarkdown(raw, true);
    expect(result).toBe('Tilde fence:\n~~~python\nprint(42)\n~~~');
  });

  it('handles indented code fences', () => {
    const raw = 'Indented fence:\n   ```cpp\nint a = 0;';
    const result = normalizeStreamingMarkdown(raw, true);
    expect(result).toBe('Indented fence:\n   ```cpp\nint a = 0;\n```');
  });

  it('does not touch closed code fences containing $$ or backticks inside', () => {
    const raw = '```bash\necho "$$"\n```\nNormal text';
    const result = normalizeStreamingMarkdown(raw, true);
    expect(result).toBe(raw);
  });

  it('closes unclosed KaTeX display math ($$)', () => {
    const raw = 'Math open: $$\nE = mc^2';
    const result = normalizeStreamingMarkdown(raw, true);
    expect(result).toBe('Math open: $$\nE = mc^2 $$');
  });

  it('closes unclosed inline backtick', () => {
    const raw = 'Inline open: Use `fetchData for requests';
    const result = normalizeStreamingMarkdown(raw, true);
    expect(result).toBe('Inline open: Use `fetchData for requests`');
  });

  it('handles already closed backticks and math', () => {
    const raw = 'Already closed: `code` and $$math$$';
    const result = normalizeStreamingMarkdown(raw, true);
    expect(result).toBe(raw);
  });

  it('handles escaped backticks and escaped dollar signs without false positive', () => {
    const rawBacktick = 'Escaped backtick: `path\\`to\\`file';
    expect(normalizeStreamingMarkdown(rawBacktick, true)).toBe('Escaped backtick: `path\\`to\\`file`');

    const rawMath = 'Escaped math: \\$\\$ not math';
    expect(normalizeStreamingMarkdown(rawMath, true)).toBe(rawMath);
  });

  it('handles sequential code blocks where first is closed and second is open', () => {
    const raw = 'Closed first, second open:\n```js\na=1;\n```\nand\n```css\nbody {';
    const expected = 'Closed first, second open:\n```js\na=1;\n```\nand\n```css\nbody {\n```';
    expect(normalizeStreamingMarkdown(raw, true)).toBe(expected);
  });
});

/* =====================================================================
   SUITE 2: isLikelyValidMermaidSyntax Syntax Gate
===================================================================== */
describe('isLikelyValidMermaidSyntax — Early Filter Gate', () => {
  it('identifies standard Mermaid diagram starting keywords as valid', () => {
    expect(isLikelyValidMermaidSyntax('graph TD\n  A --> B')).toBe(true);
    expect(isLikelyValidMermaidSyntax('flowchart LR\n  A[Start] --> B[End]')).toBe(true);
    expect(isLikelyValidMermaidSyntax('sequenceDiagram\n  Alice->>Bob: Hello')).toBe(true);
    expect(isLikelyValidMermaidSyntax('classDiagram\n  class Animal')).toBe(true);
    expect(isLikelyValidMermaidSyntax('stateDiagram-v2\n  [*] --> State1')).toBe(true);
    expect(isLikelyValidMermaidSyntax('erDiagram\n  CUSTOMER ||--o{ ORDER : places')).toBe(true);
    expect(isLikelyValidMermaidSyntax('gantt\n  title A Gantt Diagram')).toBe(true);
    expect(isLikelyValidMermaidSyntax('pie title Pets\n  "Dogs" : 386')).toBe(true);
    expect(isLikelyValidMermaidSyntax('gitGraph\n  commit')).toBe(true);
  });

  it('rejects empty, non-diagram or invalid starting keywords', () => {
    expect(isLikelyValidMermaidSyntax('')).toBe(false);
    expect(isLikelyValidMermaidSyntax('   \n  ')).toBe(false);
    expect(isLikelyValidMermaidSyntax('const a = 1;')).toBe(false);
    expect(isLikelyValidMermaidSyntax('SELECT * FROM users;')).toBe(false);
    expect(isLikelyValidMermaidSyntax('Hello world flowchart')).toBe(false);
  });

  it('detects unbalanced delimiters in streaming text', () => {
    // Unclosed square bracket
    expect(isLikelyValidMermaidSyntax('flowchart TD\n  A[Incomplete')).toBe(false);
    // Unclosed parenthesis
    expect(isLikelyValidMermaidSyntax('flowchart TD\n  A(Round')).toBe(false);
    // Unclosed curly brace
    expect(isLikelyValidMermaidSyntax('flowchart TD\n  A{Decision')).toBe(false);
    // Negative balance (closing bracket before opening)
    expect(isLikelyValidMermaidSyntax('flowchart TD\n  ]A[')).toBe(false);
  });
});

/* =====================================================================
   SUITE 3: namespaceMermaidSvg ID Collision Guard
===================================================================== */
describe('namespaceMermaidSvg — SVG ID Isolation', () => {
  it('returns empty string on empty input', () => {
    expect(namespaceMermaidSvg('', 'pfx')).toBe('');
  });

  it('prefixes svg element IDs and rewrites references across attributes', () => {
    const rawSvg = `
      <svg>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7">
            <path d="M 0 0 L 10 3.5 L 0 7 z" />
          </marker>
          <filter id="drop-shadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          </filter>
        </defs>
        <path d="M 10 10 L 50 50" marker-end="url(#arrowhead)" filter="url(#drop-shadow)" />
        <a href="#arrowhead">Link</a>
        <g aria-labelledby="arrowhead title1"></g>
      </svg>
    `;

    const prefix = 'lx_m_test1';
    const namespaced = namespaceMermaidSvg(rawSvg, prefix);

    expect(namespaced).toContain('id="lx_m_test1_arrowhead"');
    expect(namespaced).toContain('id="lx_m_test1_drop-shadow"');
    expect(namespaced).toContain('url(#lx_m_test1_arrowhead)');
    expect(namespaced).toContain('url(#lx_m_test1_drop-shadow)');
    expect(namespaced).toContain('href="#lx_m_test1_arrowhead"');
    expect(namespaced).toContain('aria-labelledby="lx_m_test1_arrowhead title1"');
  });

  it('is idempotent when prefix is already attached', () => {
    const svgWithPrefix = '<svg><marker id="lx_m_unique_arrow"></marker></svg>';
    const result = namespaceMermaidSvg(svgWithPrefix, 'lx_m_unique');
    expect(result).toBe(svgWithPrefix);
  });
});

/* =====================================================================
   SUITE 4: splitHighlightedHtml Tag Balance Algorithm
===================================================================== */
describe('splitHighlightedHtml — Tag-Balanced Line Splitting', () => {
  it('splits single-line html without modification', () => {
    const html = '<span class="hljs-keyword">const</span> x = 1;';
    const lines = splitHighlightedHtml(html);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(html);
  });

  it('closes tags before newline and reopens them on next line', () => {
    const html = '<span class="hljs-string">line 1\nline 2</span>';
    const lines = splitHighlightedHtml(html);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('<span class="hljs-string">line 1</span>');
    expect(lines[1]).toBe('<span class="hljs-string">line 2</span>');
  });

  it('handles multi-nested tags across multiple lines', () => {
    const html = '<div class="c1"><span class="c2">a\nb\nc</span></div>';
    const lines = splitHighlightedHtml(html);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('<div class="c1"><span class="c2">a</span></div>');
    expect(lines[1]).toBe('<div class="c1"><span class="c2">b</span></div>');
    expect(lines[2]).toBe('<div class="c1"><span class="c2">c</span></div>');
  });

  it('inserts &nbsp; for empty lines to maintain visual grid row height', () => {
    const html = 'line 1\n\nline 3';
    const lines = splitHighlightedHtml(html);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('line 1');
    expect(lines[1]).toBe('&nbsp;');
    expect(lines[2]).toBe('line 3');
  });
});

/* =====================================================================
   SUITE 5: Static Architectural Compliance & 60 FPS Guarantees
===================================================================== */
describe('Static Architecture & 60 FPS Composite Audit', () => {
  it('MessageBubble.tsx contains ZERO occurrences of backdropFilter blur', () => {
    const mbPath = path.resolve(__dirname, '../components/MessageBubble.tsx');
    const content = fs.readFileSync(mbPath, 'utf8');

    expect(content.includes("backdropFilter: 'blur(")).toBe(false);
    expect(content.includes('backdropFilter: "blur(')).toBe(false);
    expect(content.includes('WebkitBackdropFilter')).toBe(false);
  });

  it('MessageBubble.tsx contains normalizeStreamingMarkdown and uses single AST container', () => {
    const mbPath = path.resolve(__dirname, '../components/MessageBubble.tsx');
    const content = fs.readFileSync(mbPath, 'utf8');

    expect(content.includes('export function normalizeStreamingMarkdown')).toBe(true);
    expect(content.includes('splitStreamingMarkdownBlocks')).toBe(false);
    expect(content.includes('className="lyaxis-markdown-root"')).toBe(true);
  });

  it('CodeBlock.tsx imports local mermaid and contains ZERO external CDN references', () => {
    const cbPath = path.resolve(__dirname, '../CodeBlock.tsx');
    const content = fs.readFileSync(cbPath, 'utf8');

    expect(content.includes("import mermaid from 'mermaid'")).toBe(true);
    expect(content.includes('cdn.jsdelivr.net')).toBe(false);
    expect(content.includes('@vite-ignore')).toBe(false);
  });

  it('CodeBlock.tsx uses CSS Grid for line numbers gutter (display: contents)', () => {
    const cbPath = path.resolve(__dirname, '../CodeBlock.tsx');
    const content = fs.readFileSync(cbPath, 'utf8');

    expect(content.includes("gridTemplateColumns: 'auto 1fr'")).toBe(true);
    expect(content.includes("display: 'contents'")).toBe(true);
    expect(content.includes('lyaxis-code-gutter-cell')).toBe(true);
    expect(content.includes('lyaxis-code-content-cell')).toBe(true);
  });

  it('CodeBlock.tsx implements GPU translate3d zoom/pan and pointer capture', () => {
    const cbPath = path.resolve(__dirname, '../CodeBlock.tsx');
    const content = fs.readFileSync(cbPath, 'utf8');

    expect(content.includes('translate3d(${pan.x}px, ${pan.y}px, 0)')).toBe(true);
    expect(content.includes('setPointerCapture')).toBe(true);
    expect(content.includes('releasePointerCapture')).toBe(true);
    expect(content.includes('MermaidErrorBoundary')).toBe(true);
  });
});
