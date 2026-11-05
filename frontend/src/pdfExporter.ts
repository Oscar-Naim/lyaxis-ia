import type { Message } from './types';

async function loadHtml2Pdf() {
  const mod = await import('html2pdf.js');
  return mod.default || mod;
}

type KatexRenderer = (tex: string, displayMode: boolean) => string;

async function loadKatexRenderer(): Promise<KatexRenderer> {
  try {
    const mod: any = await import('katex');
    const katex = mod.default || mod;
    return (tex: string, displayMode: boolean) =>
      katex.renderToString(tex, {
        displayMode,
        throwOnError: false,
        strict: 'ignore',
        output: 'html',
      });
  } catch {
    return (tex: string) => escapeHtml(tex);
  }
}

function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripThoughtBlocks(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/<(thought|think)>[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/<(thought|think)>[\s\S]*$/gi, '');
  return cleaned.trim();
}

export function markdownToPdfHtml(markdownText: string, renderMath?: KatexRenderer): string {
  if (!markdownText) return '';
  let text = markdownText.replace(/\r\n/g, '\n');

  // Formatear núcleos estructurados de LYAXIS TRIAD™ en tarjetas editoriales dedicadas
  if (/(?:^|\n)\[TRIAD_CORE:(create|break|rebuild)\]/.test(text)) {
    const firstTagIdx = text.search(/\[TRIAD_CORE:(create|break|rebuild)\]/);
    const preamble = firstTagIdx > 0 ? stripThoughtBlocks(text.slice(0, firstTagIdx)) : '';
    const extractCore = (core: string) => {
      const openTag = `[TRIAD_CORE:${core}]`;
      const closeTag = `[/TRIAD_CORE:${core}]`;
      const s = text.indexOf(openTag);
      if (s === -1) return '';
      const after = s + openTag.length;
      const e = text.indexOf(closeTag, after);
      if (e !== -1) return text.slice(after, e).trim();
      const next = text.indexOf('[TRIAD_CORE:', after);
      return (next !== -1 ? text.slice(after, next) : text.slice(after)).trim();
    };
    const cores = [
      { title: '⚡ NÚCLEO I · CREATE — LYAXIS Speed', color: '#0284c7', bg: '#f0f9ff', body: stripThoughtBlocks(extractCore('create')) },
      { title: '🎯 NÚCLEO II · BREAK — LYAXIS Phantom', color: '#e11d48', bg: '#fff1f2', body: stripThoughtBlocks(extractCore('break')) },
      { title: '🧠 NÚCLEO III · REBUILD — LYAXIS Cortex', color: '#7c3aed', bg: '#f5f3ff', body: stripThoughtBlocks(extractCore('rebuild')) },
    ].filter((c) => c.body);

    if (cores.length > 0) {
      const preambleHtml = preamble ? markdownToPdfHtml(preamble, renderMath) : '';
      const coresHtml = cores
        .map(
          (c) => `
          <div style="margin:12px 0; border:1px solid ${c.color}55; border-left:4px solid ${c.color}; border-radius:8px; background-color:#ffffff; overflow:hidden;">
            <div style="padding:7px 12px; background-color:${c.bg}; border-bottom:1px solid ${c.color}33; font-size:11.5px; font-weight:800; color:${c.color}; letter-spacing:0.3px;">
              ${c.title}
            </div>
            <div style="padding:12px 14px;">
              ${markdownToPdfHtml(c.body, renderMath)}
            </div>
          </div>`
        )
        .join('\n');
      return preambleHtml + coresHtml;
    }
  }

  text = stripThoughtBlocks(text);

  const blockTokens: string[] = [];
  const inlineTokens: string[] = [];

  const pushBlock = (htmlFrag: string): string => {
    const id = blockTokens.length;
    blockTokens.push(htmlFrag);
    return `\n\n@@PDFBLOCK_${id}@@\n\n`;
  };

  const pushInline = (htmlFrag: string): string => {
    const id = inlineTokens.length;
    inlineTokens.push(htmlFrag);
    return `@@PDFINLINE_${id}@@`;
  };

  // 1. Aislar bloques de código cercados ANTES de cualquier regex o split de párrafos
  text = text.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_m, rawLang: string, rawCode: string) => {
    const cleanLang = (rawLang || '').trim() || 'code';
    const trimmedCode = String(rawCode || '').replace(/\n$/, '');
    const lineCount = trimmedCode.split('\n').length;
    const breakRule = lineCount <= 32 ? 'page-break-inside:avoid; break-inside:avoid;' : 'page-break-inside:auto; break-inside:auto;';
    const escaped = escapeHtml(trimmedCode);
    return pushBlock(
      `<div class="pdf-code-card" style="margin:12px 0; border-radius:8px; overflow:hidden; border:1px solid #1e293b; background-color:#0b1120; ${breakRule}">` +
        `<div style="background-color:#0f172a; padding:5px 12px; border-bottom:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center; font-family:'JetBrains Mono',Consolas,monospace; font-size:10px; color:#38bdf8; font-weight:700;">` +
          `<span>${escapeHtml(cleanLang)}</span>` +
          `<span style="color:#64748b; font-weight:500;">${lineCount} ${lineCount === 1 ? 'línea' : 'líneas'}</span>` +
        `</div>` +
        `<pre style="margin:0; padding:12px 14px; background-color:#0b1120; color:#e2e8f0; font-family:'JetBrains Mono',Consolas,monospace; font-size:11px; line-height:1.55; white-space:pre-wrap; word-break:break-word; overflow-x:auto;"><code style="color:#e2e8f0; background:transparent; font-family:inherit;">${escaped}</code></pre>` +
      `</div>`
    );
  });

  // 2. Aislar matemáticas en bloque ($$ ... $$)
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr: string) => {
    const rendered = renderMath ? renderMath(expr.trim(), true) : `<code>${escapeHtml(expr.trim())}</code>`;
    return pushBlock(
      `<div style="margin:10px 0; padding:10px 14px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; text-align:center; color:#0f172a; overflow-x:auto; page-break-inside:avoid; break-inside:avoid;">${rendered}</div>`
    );
  });

  // 3. Aislar código inline (`...`) para proteger *ptr, **kwargs, <T>, pipes |, etc.
  text = text.replace(/`([^`\n]+)`/g, (_m, code: string) =>
    pushInline(
      `<code style="background-color:#f1f5f9; color:#0f172a; padding:1.5px 5px; border-radius:4px; border:1px solid #cbd5e1; font-family:'JetBrains Mono',Consolas,monospace; font-size:11px; font-weight:600;">${escapeHtml(code)}</code>`
    )
  );

  // 4. Aislar matemáticas inline ($...$) evitando cantidades monetarias como "$100 y $200"
  text = text.replace(/(?<!\$)\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\$)/g, (full, expr: string) => {
    if (/^\d+([.,]\d+)?$/.test(expr.trim())) return full;
    const rendered = renderMath ? renderMath(expr.trim(), false) : `<em>${escapeHtml(expr.trim())}</em>`;
    return pushInline(`<span style="color:#0f172a;">${rendered}</span>`);
  });

  // Formateo inline seguro sobre texto ya escapado
  const formatInline = (rawLine: string): string => {
    let s = escapeHtml(rawLine);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a; font-weight:700;">$1</strong>');
    s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    s = s.replace(/~~(.+?)~~/g, '<del style="color:#64748b;">$1</del>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#0284c7; text-decoration:underline;">$1</a>');
    return s;
  };

  // 5. Procesar tablas GFM línea por línea
  const lines = text.split('\n');
  const stageLines: string[] = [];
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const isSeparatorRow = (l: string) => /^\|?\s*:?-{2,}:?(\s*\|\s*:?-{2,}:?)+\s*\|?$/.test(l.trim()) || (/^\|?[\s:|-]+\|?$/.test(l.trim()) && l.includes('--'));
    const hasSeparator = tableBuffer.some(isSeparatorRow);
    if (tableBuffer.length < 2 || !hasSeparator) {
      stageLines.push(...tableBuffer);
      tableBuffer = [];
      return;
    }

    let tableHtml =
      '<table class="pdf-table" style="width:100%; border-collapse:collapse; margin:14px 0; border:1px solid #cbd5e1; font-size:11.5px; background-color:#ffffff; page-break-inside:auto; break-inside:auto;">';
    let inHead = true;
    let bodyRowIdx = 0;

    for (let i = 0; i < tableBuffer.length; i++) {
      const line = tableBuffer[i].trim();
      if (isSeparatorRow(line)) {
        inHead = false;
        continue;
      }
      const rawCells = line.split('|');
      const cells = rawCells
        .map((c) => c.trim())
        .filter((c, idx) => !((idx === 0 || idx === rawCells.length - 1) && c === ''));
      if (cells.length === 0) continue;

      const bgColor = inHead ? '#0f172a' : bodyRowIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const textColor = inHead ? '#f8fafc' : '#1e293b';
      const weight = inHead ? '700' : '400';
      if (!inHead) bodyRowIdx++;

      tableHtml += `<tr style="background-color:${bgColor}; page-break-inside:avoid; break-inside:avoid;">`;
      cells.forEach((cell) => {
        const tag = inHead ? 'th' : 'td';
        tableHtml += `<${tag} style="border:1px solid #cbd5e1; padding:7px 10px; text-align:left; color:${textColor}; font-weight:${weight}; line-height:1.45; vertical-align:top;">${formatInline(cell)}</${tag}>`;
      });
      tableHtml += '</tr>';
    }
    tableHtml += '</table>';
    stageLines.push(pushBlock(tableHtml));
    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isTableLine = !trimmed.startsWith('@@PDFBLOCK_') && (trimmed.startsWith('|') || (trimmed.includes('|') && trimmed.endsWith('|')));
    if (isTableLine) {
      tableBuffer.push(line);
    } else {
      flushTable();
      stageLines.push(line);
    }
  }
  flushTable();

  // 6. Estructurar bloques (h1-h6, hr, blockquotes, listas ul/ol y párrafos)
  const finalBlocks: string[] = [];
  let paraBuf: string[] = [];
  let listBuf: { ordered: boolean; items: string[] } | null = null;
  let quoteBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length === 0) return;
    const content = paraBuf.map(formatInline).join('<br/>');
    finalBlocks.push(
      `<p style="margin:7px 0; line-height:1.62; color:#1e293b; page-break-inside:avoid; break-inside:avoid; orphans:3; widows:3;">${content}</p>`
    );
    paraBuf = [];
  };

  const flushList = () => {
    if (!listBuf || listBuf.items.length === 0) return;
    const tag = listBuf.ordered ? 'ol' : 'ul';
    const itemsHtml = listBuf.items
      .map(
        (it) =>
          `<li style="margin-bottom:5px; color:#1e293b; line-height:1.55; page-break-inside:avoid; break-inside:avoid;">${formatInline(it)}</li>`
      )
      .join('');
    finalBlocks.push(`<${tag} style="margin:8px 0 10px; padding-left:20px; color:#1e293b;">${itemsHtml}</${tag}>`);
    listBuf = null;
  };

  const flushQuote = () => {
    if (quoteBuf.length === 0) return;
    const cleaned = quoteBuf.map((q) => q.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, '')).filter(Boolean);
    finalBlocks.push(
      `<blockquote style="margin:10px 0; padding:8px 14px; border-left:3px solid #0284c7; background-color:#f8fafc; border-radius:0 6px 6px 0; color:#334155; page-break-inside:avoid; break-inside:avoid;">${cleaned.map(formatInline).join('<br/>')}</blockquote>`
    );
    quoteBuf = [];
  };

  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const rawLine of stageLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushAll();
      continue;
    }

    if (/^@@PDFBLOCK_\d+@@$/.test(trimmed)) {
      flushAll();
      finalBlocks.push(trimmed);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushAll();
      finalBlocks.push('<hr style="border:none; border-top:1px solid #cbd5e1; margin:14px 0;" />');
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length;
      const hText = formatInline(headingMatch[2]);
      const sizes: Record<number, string> = { 1: '18px', 2: '15.5px', 3: '14px', 4: '13px', 5: '12px', 6: '11.5px' };
      const border = level <= 2 ? 'border-bottom:1px solid #e2e8f0; padding-bottom:4px;' : '';
      finalBlocks.push(
        `<h${level} style="font-size:${sizes[level] || '13px'}; font-weight:800; color:#0f172a; margin:14px 0 6px; ${border} page-break-after:avoid; break-after:avoid; page-break-inside:avoid; break-inside:avoid;">${hText}</h${level}>`
      );
      continue;
    }

    if (trimmed.startsWith('>')) {
      flushPara();
      flushList();
      quoteBuf.push(trimmed.replace(/^>\s?/, ''));
      continue;
    }

    const ulMatch = /^\s*[-*+]\s+(.*)$/.exec(rawLine);
    const olMatch = /^\s*\d+[.)]\s+(.*)$/.exec(rawLine);
    if (ulMatch || olMatch) {
      flushPara();
      flushQuote();
      const ordered = Boolean(olMatch);
      const itemText = (ulMatch ? ulMatch[1] : olMatch![1]).trim();
      if (!listBuf || listBuf.ordered !== ordered) {
        flushList();
        listBuf = { ordered, items: [] };
      }
      listBuf.items.push(itemText);
      continue;
    }

    flushList();
    flushQuote();
    paraBuf.push(trimmed);
  }
  flushAll();

  // 7. Re-hidratar primero placeholders de bloque y después inline
  let html = finalBlocks.join('\n');
  html = html.replace(/@@PDFBLOCK_(\d+)@@/g, (_m, idxStr: string) => blockTokens[Number(idxStr)] ?? '');
  html = html.replace(/@@PDFINLINE_(\d+)@@/g, (_m, idxStr: string) => inlineTokens[Number(idxStr)] ?? '');
  return html;
}

export const exportChatToPDF = async (
  title: string,
  modelLabel: string,
  modelColor: string,
  messages: Message[]
) => {
  if (!messages || messages.length === 0) return;

  const renderMath = await loadKatexRenderer();

  const container = document.createElement('div');
  container.style.padding = '20px 24px';
  container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.color = '#0f172a';
  container.style.backgroundColor = '#ffffff';

  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Reglas de paginación editorial sin romper bloques de código largos
  let htmlContent = `
    <style>
      @page {
        margin: 15mm;
      }
      p, tr, h1, h2, h3, h4, h5, h6, li, blockquote, .pdf-avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      table {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
    </style>

    <!-- Header Banner -->
    <div style="border-bottom: 2px solid ${modelColor}; padding-bottom: 14px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; page-break-after: avoid; break-after: avoid;">
      <div>
        <div style="font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">LYAXIS labs™</div>
        <div style="font-size: 13px; font-weight: 700; color: ${modelColor}; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Motor: LYAXIS ${escapeHtml(modelLabel)}</div>
        <div style="font-size: 15px; font-weight: 700; color: #334155; margin-top: 6px;">${escapeHtml(title || 'Conversación')}</div>
      </div>
      <div style="text-align: right; font-size: 11px; color: #64748b;">
        <div><strong>Fecha:</strong> ${dateStr}</div>
        <div style="margin-top: 2px; font-style: italic;">Create. Break. Rebuild.</div>
      </div>
    </div>
  `;

  // Messages
  messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const roleTitle = isUser ? 'Usuario' : `LYAXIS ${escapeHtml(modelLabel)}`;
    const roleBorder = isUser ? '#cbd5e1' : modelColor;
    const roleBg = isUser ? '#f8fafc' : '#ffffff';
    const titleColor = isUser ? '#475569' : modelColor;

    const parsedContent = markdownToPdfHtml(msg.content, renderMath);
    const usageSeal =
      !isUser && msg.usage && msg.usage.totalTokens > 0
        ? `✓ ${msg.usage.totalTokens.toLocaleString('es-MX')} tokens (${msg.usage.promptTokens.toLocaleString('es-MX')} in · ${msg.usage.completionTokens.toLocaleString('es-MX')} out) • LYAXIS IA`
        : 'LYAXIS IA';

    htmlContent += `
      <div class="pdf-msg-card" style="margin-bottom: 18px; border: 1px solid ${roleBorder}; border-radius: 8px; overflow: hidden; background-color: ${roleBg}; page-break-inside: auto; break-inside: auto;">
        <div style="background-color: ${isUser ? '#f1f5f9' : '#f8fafc'}; padding: 8px 14px; border-bottom: 1px solid ${roleBorder}; font-size: 12px; font-weight: 800; color: ${titleColor}; display: flex; justify-content: space-between; align-items: center; page-break-after: avoid; break-after: avoid;">
          <span>${roleTitle}</span>
          <span style="font-size: 10px; font-weight: 600; color: #64748b; font-family: 'JetBrains Mono', Consolas, monospace;">${usageSeal}</span>
        </div>
        <div style="padding: 14px; font-size: 12.5px; line-height: 1.62; color: #1e293b;">
          ${parsedContent}
        </div>
      </div>
    `;
  });

  // Footer
  htmlContent += `
    <div style="margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 10.5px; color: #94a3b8; page-break-inside: avoid; break-inside: avoid;">
      Documento generado oficialmente por <strong>LYAXIS IA</strong> • Creado por Oscar Naim Ambrocio Aguirre • LYAXIS labs™
    </div>
  `;

  container.innerHTML = htmlContent;

  const opt = {
    margin: [15, 15, 15, 15] as [number, number, number, number],
    filename: `LYAXIS_${modelLabel.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: ['tr', '.pdf-avoid-break', 'p', 'h1', 'h2', 'h3', 'h4', 'li', 'blockquote']
    }
  };

  try {
    const html2pdf = await loadHtml2Pdf();
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error("Error al exportar PDF:", err);
  }
};

function slideMarkdownToPdfHtml(markdownText: string, accentColor: string): string {
  if (!markdownText) return '';
  let text = markdownText;
  text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

  const lines = text.split('\n');
  const resultLines: string[] = [];
  let cardCount = 1;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('### ')) {
      const h3Text = trimmed.replace(/^###\s*/, '');
      resultLines.push(`<h3 style="font-size: 15px; font-weight: 800; color: ${accentColor}; margin: 10px 0 8px; letter-spacing: -0.2px;">${h3Text}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      const h2Text = trimmed.replace(/^##\s*/, '');
      resultLines.push(`<h2 style="font-size: 18px; font-weight: 900; color: #ffffff; margin: 12px 0 8px; border-bottom: 1px solid ${accentColor}44; padding-bottom: 4px;">${h2Text}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      const h1Text = trimmed.replace(/^#\s*/, '');
      resultLines.push(`<h1 style="font-size: 20px; font-weight: 900; color: #ffffff; margin: 14px 0 10px;">${h1Text}</h1>`);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.replace(/^[-*]\s*/, '');
      const boldMatch = /^\*\*(.*?)\*\*:\s*(.*)$/.exec(bulletText) || /^\*\*(.*?)\*\*\s*(.*)$/.exec(bulletText);

      if (boldMatch) {
        resultLines.push(`
          <div style="padding: 10px 14px; border-radius: 10px; background-color: rgba(255, 255, 255, 0.035); border: 1px solid ${accentColor}44; margin-bottom: 8px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 9.5px; font-weight: 900; color: ${accentColor}; background: ${accentColor}22; border: 1px solid ${accentColor}55; padding: 2px 7px; border-radius: 8px; font-family: monospace;">0${cardCount++}</span>
              <strong style="color: #ffffff; font-size: 13px; font-weight: 800;">${boldMatch[1]}</strong>
            </div>
            <div style="font-size: 12px; color: #cbd5e1; line-height: 1.45; padding-left: 2px;">${boldMatch[2]}</div>
          </div>
        `);
      } else {
        const formattedBullet = bulletText
          .replace(/\*\*(.*?)\*\*/g, `<strong style="color: #ffffff; font-weight: 800;">$1</strong>`)
          .replace(/\*(.*?)\*/g, `<em>$1</em>`);

        resultLines.push(`
          <div style="padding: 10px 14px; border-radius: 10px; background-color: rgba(255, 255, 255, 0.035); border: 1px solid ${accentColor}44; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: ${accentColor}; font-weight: 900; font-size: 12px; line-height: 1.4;">✦</span>
            <div style="font-size: 12px; color: #cbd5e1; line-height: 1.45;">${formattedBullet}</div>
          </div>
        `);
      }
    } else {
      const formattedText = trimmed
        .replace(/\*\*(.*?)\*\*/g, `<strong style="color: #ffffff; font-weight: 800;">$1</strong>`)
        .replace(/\*(.*?)\*/g, `<em>$1</em>`);
      resultLines.push(`<p style="font-size: 12.5px; line-height: 1.5; color: #cbd5e1; margin: 4px 0;">${formattedText}</p>`);
    }
  }

  return resultLines.join('\n');
}

export const exportSlidesToPDF = async (
  title: string,
  accentColor: string,
  slides: Array<{ id: number; title: string; content: string; speakerNotes?: string }>,
  presenterName?: string
) => {
  if (!slides || slides.length === 0) return;

  const container = document.createElement('div');
  container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.backgroundColor = '#07070e';

  let htmlContent = '';

  slides.forEach((slide, idx) => {
    const parsedBody = slideMarkdownToPdfHtml(slide.content, accentColor);

    htmlContent += `
      <div style="width: 297mm; height: 167.06mm; padding: 14mm 20mm; box-sizing: border-box; background: linear-gradient(135deg, #07070e 0%, #120a1f 100%); color: #ffffff; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
        <!-- Blueprint Grid Pattern -->
        <div style="position: absolute; inset: 0; background-image: radial-gradient(circle, ${accentColor}18 1.2px, transparent 1.2px), linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px); background-size: 45px 45px; opacity: 0.6; pointer-events: none;"></div>

        <!-- Slide Header -->
        <div style="position: relative; z-index: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${accentColor}55; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: ${accentColor}22; border: 1px solid ${accentColor}66; color: ${accentColor}; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 800; letter-spacing: 0.8px;">
                LÁMINA 0${idx + 1} DE 0${slides.length}
              </span>
              <span style="font-size: 10px; color: ${accentColor}; font-weight: 700; letter-spacing: 1px;">PRESENTACIÓN OFICIAL</span>
            </div>
            
            <!-- Status Pill Badge -->
            <div style="padding: 3px 10px; border-radius: 14px; background-color: rgba(0, 217, 255, 0.08); border: 1px solid rgba(0, 217, 255, 0.35); color: #00D9FF; font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 5px; font-family: monospace;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #00D9FF;"></span>
              <span>Documento Listo</span>
            </div>
          </div>
          <h1 style="font-size: 20px; font-weight: 900; color: #ffffff; margin: 0 0 10px; line-height: 1.25; letter-spacing: -0.4px;">${slide.title}</h1>
        </div>

        <!-- Slide Body Container -->
        <div style="flex: 1; background: rgba(255, 255, 255, 0.03); border: 1px solid ${accentColor}33; border-radius: 10px; padding: 14px 18px; font-size: 12px; line-height: 1.5; color: #e2e8f0; overflow: hidden; margin: 4px 0; position: relative; z-index: 1;">
          ${parsedBody}
        </div>

        <!-- Speaker Notes if present -->
        ${slide.speakerNotes ? `
          <div style="margin-top: 4px; padding: 6px 12px; background: rgba(0, 0, 0, 0.8); border: 1px solid ${accentColor}; border-radius: 6px; font-size: 9.5px; color: #e2e8f0; position: relative; z-index: 1;">
            <strong style="color: ${accentColor};">🗣️ Nota del Orador:</strong> ${slide.speakerNotes}
          </div>
        ` : ''}

        <!-- Slide Footer -->
        <div style="margin-top: 6px; display: flex; justify-content: space-between; font-size: 9.5px; color: #a1a1aa; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 6px; position: relative; z-index: 1; font-family: monospace;">
          <span>${presenterName && presenterName.trim() ? presenterName : (title || 'Presentación Ejecutiva')}</span>
          <span style="color: ${accentColor}; font-weight: 700;">Edición 2026 • Documento Oficial</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = htmlContent;

  const opt = {
    margin: 0,
    filename: `LYAXIS_Canvas_${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#07070e' },
    jsPDF: { unit: 'mm', format: [297, 167.06] as [number, number], orientation: 'landscape' as const }
  };

  try {
    const html2pdf = await loadHtml2Pdf();
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error("Error exportando diapositivas en PDF:", err);
  }
};
