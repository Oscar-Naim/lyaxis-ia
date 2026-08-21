import html2pdf from 'html2pdf.js';
import type { Message } from './types';

function markdownToPdfHtml(markdownText: string): string {
  if (!markdownText) return '';
  let text = markdownText;
  
  // Remove <thought> process tags for clean output
  if (text.includes('<thought>')) {
    const parts = text.split('</thought>');
    text = parts.length > 1 ? parts.slice(1).join('').trim() : text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
  }

  const lines = text.split('\n');
  const resultLines: string[] = [];
  let inTable = false;
  let tableBuffer: string[] = [];

  const processTableBuffer = (buffer: string[]) => {
    if (buffer.length < 2) return buffer.join('\n');

    let tableHtml = '<table style="width:100%; border-collapse:collapse; margin:14px 0; border:1px solid #cbd5e1; font-size:12px; background-color:#ffffff;">';
    let isHeader = true;

    for (let i = 0; i < buffer.length; i++) {
      const line = buffer[i].trim();
      // Skip markdown divider lines like | :--- | :--- |
      if (/^\|?[\s:-|]+\|?$/.test(line) && line.includes('---')) {
        isHeader = false;
        continue;
      }

      const rawCells = line.split('|');
      const cells = rawCells.map(c => c.trim()).filter((c, idx) => {
        if ((idx === 0 || idx === rawCells.length - 1) && c === '') return false;
        return true;
      });

      if (cells.length === 0) continue;

      const bgColor = isHeader ? '#f1f5f9' : (i % 2 === 0 ? '#ffffff' : '#f8fafc');
      const textColor = isHeader ? '#0f172a' : '#334155';
      const fontWeight = isHeader ? 'bold' : 'normal';

      tableHtml += `<tr style="background-color:${bgColor};">`;
      cells.forEach(cell => {
        const tag = isHeader ? 'th' : 'td';
        // Parse inline formatting inside cell
        let formattedCell = cell
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');

        tableHtml += `<${tag} style="border:1px solid #cbd5e1; padding:8px 10px; text-align:left; color:${textColor}; font-weight:${fontWeight}; line-height:1.4;">${formattedCell}</${tag}>`;
      });
      tableHtml += '</tr>';

      if (isHeader) isHeader = false;
    }

    tableHtml += '</table>';
    return tableHtml;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();
    const isTableLine = trimmed.startsWith('|') || (trimmed.includes('|') && trimmed.endsWith('|'));

    if (isTableLine) {
      inTable = true;
      tableBuffer.push(line);
    } else {
      if (inTable) {
        resultLines.push(processTableBuffer(tableBuffer));
        tableBuffer = [];
        inTable = false;
      }
      resultLines.push(line);
    }
  }

  if (inTable) {
    resultLines.push(processTableBuffer(tableBuffer));
  }

  let html = resultLines.join('\n');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size:14px; font-weight:700; color:#1e293b; margin:14px 0 6px;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size:16px; font-weight:800; color:#0f172a; margin:16px 0 8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size:18px; font-weight:800; color:#0f172a; margin:18px 0 10px;">$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Bullet points
  html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li style="margin-bottom:4px; color:#334155;">$1</li>');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background-color:#0f172a; color:#38bdf8; padding:12px; border-radius:6px; font-family:monospace; font-size:11px; overflow-x:auto; margin:10px 0;"><code>$2</code></pre>');

  // Paragraph breaks
  html = html.replace(/\n\n/g, '<br/><br/>');

  return html;
}

export const exportChatToPDF = async (
  title: string,
  modelLabel: string,
  modelColor: string,
  messages: Message[]
) => {
  if (!messages || messages.length === 0) return;

  const container = document.createElement('div');
  container.style.padding = '24px 30px';
  container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.color = '#0f172a';
  container.style.backgroundColor = '#ffffff';

  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Header Banner
  let htmlContent = `
    <div style="border-bottom: 2px solid ${modelColor}; padding-bottom: 14px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">LYAXIS labs™</div>
        <div style="font-size: 13px; font-weight: 700; color: ${modelColor}; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Motor: LYAXIS ${modelLabel}</div>
        <div style="font-size: 15px; font-weight: 700; color: #334155; margin-top: 6px;">${title || 'Conversación'}</div>
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
    const roleTitle = isUser ? 'Usuario' : `LYAXIS ${modelLabel}`;
    const roleBorder = isUser ? '#cbd5e1' : modelColor;
    const roleBg = isUser ? '#f8fafc' : '#ffffff';
    const titleColor = isUser ? '#475569' : modelColor;

    const parsedContent = markdownToPdfHtml(msg.content);

    htmlContent += `
      <div style="margin-bottom: 18px; border: 1px solid ${roleBorder}; border-radius: 8px; overflow: hidden; background-color: ${roleBg};">
        <div style="background-color: ${isUser ? '#f1f5f9' : '#f8fafc'}; padding: 8px 14px; border-bottom: 1px solid ${roleBorder}; font-size: 12px; font-weight: 800; color: ${titleColor}; display: flex; justify-content: space-between;">
          <span>${roleTitle}</span>
          <span style="font-size: 10px; font-weight: normal; color: #94a3b8;">LYAXIS IA</span>
        </div>
        <div style="padding: 14px; font-size: 12.5px; line-height: 1.6; color: #1e293b;">
          ${parsedContent}
        </div>
      </div>
    `;
  });

  // Footer
  htmlContent += `
    <div style="margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 10.5px; color: #94a3b8;">
      Documento generado oficialmente por <strong>LYAXIS IA</strong> • Creado por Oscar Naim Ambrocio Aguirre • LYAXIS labs™
    </div>
  `;

  container.innerHTML = htmlContent;

  const opt = {
    margin: [10, 10, 10, 10],
    filename: `LYAXIS_${modelLabel.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
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

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('### ')) {
      const h3Text = trimmed.replace(/^###\s*/, '');
      resultLines.push(`<h3 style="font-size: 15px; font-weight: 800; color: ${accentColor}; margin: 10px 0 6px; letter-spacing: -0.2px;">${h3Text}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      const h2Text = trimmed.replace(/^##\s*/, '');
      resultLines.push(`<h2 style="font-size: 18px; font-weight: 900; color: #ffffff; margin: 12px 0 8px; border-bottom: 1px solid ${accentColor}44; padding-bottom: 4px;">${h2Text}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      const h1Text = trimmed.replace(/^#\s*/, '');
      resultLines.push(`<h1 style="font-size: 20px; font-weight: 900; color: #ffffff; margin: 14px 0 10px;">${h1Text}</h1>`);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.replace(/^[-*]\s*/, '');
      const formattedBullet = bulletText
        .replace(/\*\*(.*?)\*\*/g, `<strong style="color: #ffffff; font-weight: 800;">$1</strong>`)
        .replace(/\*(.*?)\*/g, `<em>$1</em>`);

      resultLines.push(`
        <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; font-size: 12.5px; line-height: 1.5; color: #e2e8f0;">
          <span style="color: ${accentColor}; font-weight: 900; font-size: 12px; line-height: 1.4;">✦</span>
          <div>${formattedBullet}</div>
        </div>
      `);
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
  slides: Array<{ id: number; title: string; content: string; speakerNotes?: string }>
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
                DIAPOSITIVA 0${idx + 1} DE 0${slides.length}
              </span>
              <span style="font-size: 10px; color: ${accentColor}; font-weight: 700; letter-spacing: 1px;">LYAXIS CANVAS</span>
            </div>
            
            <!-- Status Pill Badge -->
            <div style="padding: 3px 10px; border-radius: 14px; background-color: rgba(0, 217, 255, 0.08); border: 1px solid rgba(0, 217, 255, 0.35); color: #00D9FF; font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 5px; font-family: monospace;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #00D9FF;"></span>
              <span>System Online</span>
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
        <div style="margin-top: 6px; display: flex; justify-content: space-between; font-size: 9.5px; color: #71717a; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 6px; position: relative; z-index: 1; font-family: monospace;">
          <span>Oscar Naim Ambrocio Aguirre | LYAXIS labs™ | Edición 2026</span>
          <span style="color: ${accentColor}; font-weight: 700;">Create. Break. Rebuild.</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = htmlContent;

  const opt = {
    margin: 0,
    filename: `LYAXIS_Canvas_${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#07070e' },
    jsPDF: { unit: 'mm', format: [297, 167.06], orientation: 'landscape' }
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error("Error exportando diapositivas en PDF:", err);
  }
};
