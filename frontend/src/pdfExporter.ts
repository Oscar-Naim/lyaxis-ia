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

export const exportSlidesToPDF = async (
  title: string,
  accentColor: string,
  slides: Array<{ id: number; title: string; content: string; speakerNotes?: string }>
) => {
  if (!slides || slides.length === 0) return;

  const container = document.createElement('div');
  container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  let htmlContent = '';

  slides.forEach((slide, idx) => {
    const parsedBody = markdownToPdfHtml(slide.content);

    htmlContent += `
      <div style="width: 297mm; height: 195mm; padding: 25mm 30mm; box-sizing: border-box; background: #09090e; color: #ffffff; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
        <!-- Slide Header -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${accentColor}; padding-bottom: 10px; margin-bottom: 16px;">
            <span style="font-size: 11px; font-weight: 800; color: ${accentColor}; letter-spacing: 1px;">LYAXIS CANVAS • SLIDE 0${idx + 1} DE 0${slides.length}</span>
            <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">${title}</span>
          </div>
          <h1 style="font-size: 24px; font-weight: 900; color: #ffffff; margin: 0 0 16px; line-height: 1.2;">${slide.title}</h1>
        </div>

        <!-- Slide Body Container -->
        <div style="flex: 1; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 20px 24px; font-size: 13px; line-height: 1.6; color: #e2e8f0; overflow: hidden;">
          ${parsedBody}
        </div>

        <!-- Speaker Notes if present -->
        ${slide.speakerNotes ? `
          <div style="margin-top: 10px; padding: 8px 12px; background: rgba(168, 85, 247, 0.15); border: 1px solid ${accentColor}; border-radius: 6px; font-size: 10px; color: #e2e8f0;">
            <strong style="color: ${accentColor};">Nota del Orador:</strong> ${slide.speakerNotes}
          </div>
        ` : ''}

        <!-- Slide Footer -->
        <div style="margin-top: 12px; display: flex; justify-content: space-between; font-size: 9px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 8px;">
          <span>LYAXIS IA • Presentación Oficial</span>
          <span>Create. Break. Rebuild. • Oscar Naim Ambrocio Aguirre</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = htmlContent;

  const opt = {
    margin: 0,
    filename: `LYAXIS_Canvas_${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error("Error exportando diapositivas en PDF:", err);
  }
};
