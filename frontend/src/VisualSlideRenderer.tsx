import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Calendar, UserCheck, CheckCircle2, ArrowRight, Zap, Shield, BookOpen, Layers, Activity } from 'lucide-react';

interface VisualSlideRendererProps {
  content: string;
  layout?: string;
  accentColor: string;
  boxBg: string;
  borderColor: string;
}

export const parseMarkdownBulletPoints = (rawText: string) => {
  const lines = rawText.split('\n');
  const items: { title: string; desc: string; raw: string }[] = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('- ') && !trimmed.startsWith('* ')) continue;

    const body = trimmed.replace(/^[-*]\s*/, '');
    const boldMatch = /^\*\*(.*?)\*\*:\s*(.*)$/.exec(body) || /^\*\*(.*?)\*\*\s*(.*)$/.exec(body);

    if (boldMatch) {
      items.push({
        title: boldMatch[1].trim(),
        desc: boldMatch[2].trim(),
        raw: body
      });
    } else {
      items.push({
        title: '',
        desc: body.trim(),
        raw: body
      });
    }
  }

  return items;
};

export const VisualSlideRenderer: React.FC<VisualSlideRendererProps> = ({
  content,
  layout = 'bullets',
  accentColor,
  boxBg,
  borderColor,
}) => {
  if (!content) return null;

  // 1. TIMELINE LAYOUT
  if (layout === 'timeline' || content.toLowerCase().includes('línea del tiempo') || content.toLowerCase().includes('cronología')) {
    const bulletItems = parseMarkdownBulletPoints(content);

    if (bulletItems.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', height: '100%', justifyContent: 'center' }}>
          {bulletItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: '14px 18px',
                borderRadius: '12px',
                backgroundColor: boxBg,
                border: `1px solid ${borderColor}`,
                boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Glowing Left Border Bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: accentColor }} />

              {/* Node Badge */}
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  backgroundColor: `${accentColor}22`,
                  border: `1px solid ${accentColor}66`,
                  color: accentColor,
                  fontSize: '11px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Calendar size={12} />
                <span>{item.title || `HITO 0${idx + 1}`}</span>
              </div>

              {/* Node Description */}
              <div style={{ fontSize: '13.5px', color: '#e4e4e7', lineHeight: '1.5', flex: 1 }}>
                {item.desc || item.raw}
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  // 2. CHARACTERS / PEOPLE / ENTITIES LAYOUT
  if (layout === 'characters' || content.toLowerCase().includes('personajes') || content.toLowerCase().includes('líderes')) {
    const bulletItems = parseMarkdownBulletPoints(content);

    if (bulletItems.length > 0) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: bulletItems.length > 3 ? '1fr 1fr' : '1fr', gap: '14px', width: '100%' }}>
          {bulletItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px 20px',
                borderRadius: '14px',
                backgroundColor: boxBg,
                border: `1px solid ${borderColor}`,
                boxShadow: `0 6px 24px rgba(0,0,0,0.5)`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
              }}
            >
              {/* Avatar Initial Circle */}
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: `${accentColor}22`,
                  border: `1px solid ${accentColor}66`,
                  color: accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '16px',
                  flexShrink: 0,
                  boxShadow: `0 0 16px ${accentColor}33`
                }}
              >
                {item.title ? item.title.charAt(0).toUpperCase() : <UserCheck size={18} />}
              </div>

              <div>
                {item.title && (
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.2px' }}>
                    {item.title}
                  </h4>
                )}
                <div style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: '1.5' }}>
                  {item.desc || item.raw}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  // 3. CAUSES VS CONSEQUENCES / 2-COLUMN SPLIT LAYOUT
  if (layout === 'causes-effects' || (content.includes('### Causas') && content.includes('### Consecuencias')) || content.toLowerCase().includes('causa:') || content.toLowerCase().includes('efecto:')) {
    let causesText = '';
    let effectsText = '';

    const parts = content.split(/(?=###\s*Consecuencias|###\s*Efectos)/i);
    if (parts.length > 1 && parts[1].trim()) {
      causesText = parts[0] || '';
      effectsText = parts[1] || '';
    } else {
      const bullets = parseMarkdownBulletPoints(content);
      const causeBullets = bullets.filter(b => b.raw.toLowerCase().includes('causa:') || !b.raw.toLowerCase().includes('efecto:'));
      const effectBullets = bullets.filter(b => b.raw.toLowerCase().includes('efecto:') || b.raw.toLowerCase().includes('impacto'));

      if (effectBullets.length > 0) {
        causesText = causeBullets.map(b => `- ${b.raw}`).join('\n');
        effectsText = effectBullets.map(b => `- ${b.raw}`).join('\n');
      } else {
        const mid = Math.ceil(bullets.length / 2);
        causesText = bullets.slice(0, mid).map(b => `- ${b.raw}`).join('\n');
        effectsText = bullets.slice(mid).map(b => `- ${b.raw}`).join('\n');
      }
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', height: '100%' }}>
        {/* Causes Left Card */}
        <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.35)', boxShadow: '0 6px 24px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#ef4444', fontWeight: 900, fontSize: '14px', letterSpacing: '0.5px' }}>
            <Zap size={16} color="#ef4444" />
            <span>ORIGENES Y CAUSAS</span>
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#e4e4e7', flex: 1, overflowY: 'auto' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{causesText.replace(/^###\s*Causas/i, '').trim()}</ReactMarkdown>
          </div>
        </div>

        {/* Effects Right Card */}
        <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: `${accentColor}11`, border: `1px solid ${accentColor}44`, boxShadow: '0 6px 24px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: accentColor, fontWeight: 900, fontSize: '14px', letterSpacing: '0.5px' }}>
            <CheckCircle2 size={16} color={accentColor} />
            <span>CONSECUENCIAS E IMPACTO</span>
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#e4e4e7', flex: 1, overflowY: 'auto' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{effectsText.replace(/^###\s*(Consecuencias|Efectos)/i, '').trim()}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // 4. SUMMARY / CARDS GRID LAYOUT (Standard Bullet Cards with Metric Numbers)
  const bulletItems = parseMarkdownBulletPoints(content);

  if (bulletItems.length > 0) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: bulletItems.length > 2 ? '1fr 1fr' : '1fr', gap: '14px', width: '100%' }}>
        {bulletItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              backgroundColor: boxBg,
              border: `1px solid ${borderColor}`,
              boxShadow: `0 6px 24px rgba(0,0,0,0.45)`,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: accentColor, backgroundColor: `${accentColor}22`, border: `1px solid ${accentColor}44`, padding: '2px 8px', borderRadius: '10px', fontFamily: 'monospace' }}>
                  0{idx + 1}
                </span>
                {item.title && (
                  <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.2px' }}>
                    {item.title}
                  </h4>
                )}
              </div>
              <Sparkles size={13} color={accentColor} style={{ opacity: 0.7 }} />
            </div>

            <div style={{ fontSize: '13px', color: '#d4d4d8', lineHeight: '1.55' }}>
              {item.desc || item.raw}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback to standard Markdown rendering
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table({ children, ...props }) {
          return (
            <div className="lyaxis-markdown-table-wrapper">
              <table {...props}>{children}</table>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
