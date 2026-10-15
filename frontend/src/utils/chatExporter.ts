import type { Message, ModelType } from '../types';
import { MODEL_META } from '../config';

/**
 * Generates formatted Markdown string of a conversation
 */
export function generateChatMarkdown(
  title: string,
  model: ModelType,
  messages: Message[]
): string {
  const meta = MODEL_META[model] || MODEL_META.speed;
  const dateStr = new Date().toLocaleString();

  let md = `# 🌌 LYAXIS IA - ${title || 'Transcripción de Sesión'}\n\n`;
  md += `> **Modelo Principal:** ${meta.label} (${model.toUpperCase()})  \n`;
  md += `> **Fecha de Exportación:** ${dateStr}  \n`;
  md += `> **Identidad:** Cyber-Premium Multi-Layer Neural System  \n\n`;
  md += `---\n\n`;

  messages.forEach((msg, idx) => {
    const isUser = msg.role === 'user';
    const roleTitle = isUser ? '👤 Usuario' : `⚡ LYAXIS [${meta.label}]`;
    const time = msg.timestamp || msg.created_at || '';
    const timeFormatted = time ? ` *(${new Date(time).toLocaleTimeString()})*` : '';

    md += `### ${roleTitle}${timeFormatted}\n\n`;

    if (msg.image) {
      md += `![Imagen adjunta](${msg.image})\n\n`;
    }

    md += `${msg.content}\n\n`;
    md += `---\n\n`;
  });

  md += `\n*Generado automáticamente por [LYAXIS IA](https://lyaxis-ia.vercel.app/) — Create. Break. Rebuild.*`;
  return md;
}

/**
 * Downloads a string content as a file with specified MIME type
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export conversation to Markdown file
 */
export function exportChatToMarkdown(
  title: string,
  model: ModelType,
  messages: Message[]
) {
  const md = generateChatMarkdown(title, model, messages);
  const cleanTitle = (title || 'sesion-lyaxis')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .substring(0, 40);
  const filename = `${cleanTitle}_${Date.now()}.md`;
  downloadFile(md, filename, 'text/markdown;charset=utf-8');
}

/**
 * Export conversation to JSON file
 */
export function exportChatToJSON(
  title: string,
  model: ModelType,
  messages: Message[]
) {
  const exportPayload = {
    platform: 'LYAXIS IA',
    version: '2.0.0-cyber',
    exportedAt: new Date().toISOString(),
    session: {
      title: title || 'Nueva conversación',
      model,
      messageCount: messages.length,
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      image: m.image ? '[BASE64_IMAGE_DATA]' : undefined,
      timestamp: m.timestamp || m.created_at || new Date().toISOString(),
    })),
  };

  const cleanTitle = (title || 'sesion-lyaxis')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .substring(0, 40);
  const filename = `${cleanTitle}_${Date.now()}.json`;
  downloadFile(JSON.stringify(exportPayload, null, 2), filename, 'application/json');
}
