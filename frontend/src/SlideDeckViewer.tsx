import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Presentation, Download, Sparkles, MessageSquare, Palette, RefreshCw } from 'lucide-react';
import { exportSlidesToPDF } from './pdfExporter';
import { VisualSlideRenderer } from './VisualSlideRenderer';

export interface SlideData {
  id: number;
  title: string;
  subtitle?: string;
  content: string;
  speakerNotes?: string;
  layout?: string;
}

interface SlideDeckViewerProps {
  rawContent: string;
  presentationTitle?: string;
}

const cleanSlideText = (text: string): string => {
  if (!text) return '';
  let cleaned = text;
  
  // Strip code block markers ```html or ```
  cleaned = cleaned.replace(/```(?:html|css|javascript|js)?/gi, '').replace(/```/g, '');
  
  // Strip DOCTYPE and document head/style tags
  cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
  cleaned = cleaned.replace(/<html[^>]*>|<\/html>/gi, '');
  cleaned = cleaned.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<body[^>]*>|<\/body>/gi, '');

  return cleaned.trim();
};

export const parseSlides = (rawText: string): SlideData[] => {
  if (!rawText || !rawText.trim()) return [];

  const slides: SlideData[] = [];
  const slideRegex = /<slide(?:\s+title=["']([^"']*)["'])?(?:\s+layout=["']([^"']*)["'])?>([\s\S]*?)<\/slide>/gi;
  
  let match;
  let idCounter = 1;

  while ((match = slideRegex.exec(rawText)) !== null) {
    let title = match[1] || `Diapositiva ${idCounter}`;
    const layout = match[2] || 'bullets';
    let body = cleanSlideText(match[3] || '');
    
    let speakerNotes = '';
    // Extract speaker notes if any
    const noteMatch = />\s*\*\*Nota del Orador:\*\*\s*([\s\S]*?)(?=$|\n\n)/i.exec(body);
    if (noteMatch) {
      speakerNotes = noteMatch[1].trim();
      body = body.replace(noteMatch[0], '').trim();
    }

    // Extract real title if body has a header and title was generic
    if ((title.startsWith('Diapositiva') || !title) && body) {
      const headerMatch = /^#+\s*(.*)$/m.exec(body);
      if (headerMatch && headerMatch[1]) {
        title = headerMatch[1].trim();
        body = body.replace(headerMatch[0], '').trim();
      }
    }

    slides.push({
      id: idCounter++,
      title: title.trim(),
      content: body.trim(),
      speakerNotes: speakerNotes,
      layout: layout
    });
  }

  // Fallback: If no <slide> tags were found, attempt to split by Markdown section headers or horizonal rules
  if (slides.length === 0) {
    const sanitizedText = cleanSlideText(rawText);
    const rawSections = sanitizedText.split(/(?=\n# |\n## |\n--- slide ---|\n---)/i);
    let counter = 1;

    for (let sec of rawSections) {
      const trimmed = sec.replace(/^---\s*slide\s*---|^---/i, '').trim();
      if (!trimmed) continue;

      const lines = trimmed.split('\n');
      let title = `Diapositiva ${counter}`;
      let bodyLines = lines;

      if (lines[0].startsWith('# ') || lines[0].startsWith('## ')) {
        title = lines[0].replace(/^#+\s*/, '').trim();
        bodyLines = lines.slice(1);
      }

      slides.push({
        id: counter++,
        title: title,
        content: bodyLines.join('\n').trim(),
        layout: 'bullets'
      });
    }
  }

  return slides;
};

export const SlideDeckViewer: React.FC<SlideDeckViewerProps> = ({ rawContent, presentationTitle = 'Presentación LYAXIS Canvas' }) => {
  const slides = parseSlides(rawContent);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [theme, setTheme] = useState<'cyber' | 'clean' | 'neon'>('cyber');
  const slideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isFullscreen]);

  if (!slides || slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];

  const themeStyles = {
    cyber: {
      bg: 'linear-gradient(135deg, #09090e 0%, #120d1d 100%)',
      border: 'rgba(168, 85, 247, 0.35)',
      accent: '#A855F7',
      titleColor: '#ffffff',
      boxBg: 'rgba(255, 255, 255, 0.03)',
      shadow: '0 0 30px rgba(168, 85, 247, 0.18)',
    },
    clean: {
      bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      border: 'rgba(56, 189, 248, 0.35)',
      accent: '#38bdf8',
      titleColor: '#ffffff',
      boxBg: 'rgba(255, 255, 255, 0.04)',
      shadow: '0 0 30px rgba(56, 189, 248, 0.15)',
    },
    neon: {
      bg: 'linear-gradient(135deg, #050b14 0%, #0d1b2a 100%)',
      border: 'rgba(0, 217, 255, 0.4)',
      accent: '#00D9FF',
      titleColor: '#ffffff',
      boxBg: 'rgba(0, 217, 255, 0.04)',
      shadow: '0 0 30px rgba(0, 217, 255, 0.2)',
    }
  }[theme];

  const handleExportPdf = () => {
    exportSlidesToPDF(presentationTitle, themeStyles.accent, slides);
  };

  return (
    <div
      ref={slideRef}
      style={{
        width: '100%',
        margin: '16px 0',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${themeStyles.border}`,
        boxShadow: themeStyles.shadow,
        backgroundColor: '#050508',
        display: 'flex',
        flexDirection: 'column',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 99999 : 10,
        height: isFullscreen ? '100vh' : 'auto',
      }}
    >
      {/* Slide Controls Top Header */}
      <div
        style={{
          padding: '12px 18px',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          borderBottom: `1px solid ${themeStyles.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: `${themeStyles.accent}22`,
              border: `1px solid ${themeStyles.accent}55`,
              color: themeStyles.accent,
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.5px',
            }}
          >
            <Presentation size={13} />
            <span>DIAPOSITIVA {currentIndex + 1} DE {slides.length}</span>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }}>
            {presentationTitle}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Theme switcher */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'cyber' ? 'neon' : theme === 'neon' ? 'clean' : 'cyber')}
            title="Cambiar Tema Visual"
            style={{ background: 'none', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#a1a1aa', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
          >
            <Palette size={13} color={themeStyles.accent} />
            <span style={{ textTransform: 'capitalize' }}>{theme}</span>
          </button>

          {/* Speaker notes toggle */}
          {currentSlide.speakerNotes && (
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              title="Ver Notas del Orador"
              style={{ background: showNotes ? `${themeStyles.accent}33` : 'none', border: `1px solid ${showNotes ? themeStyles.accent : 'rgba(255, 255, 255, 0.12)'}`, borderRadius: '8px', color: showNotes ? themeStyles.accent : '#a1a1aa', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
            >
              <MessageSquare size={13} />
              <span>Notas</span>
            </button>
          )}

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            title="Descargar Diapositivas en PDF"
            style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', color: '#ffffff', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600 }}
          >
            <Download size={13} color="#00D9FF" />
            <span>PDF</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Salir de Pantalla Completa" : "Modo Presentación Pantalla Completa"}
            style={{ background: 'none', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', color: '#a1a1aa', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* 16:9 Slide Canvas Body */}
      <div
        style={{
          flex: 1,
          background: themeStyles.bg,
          padding: isFullscreen ? '60px 80px' : '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isFullscreen ? 'calc(100vh - 120px)' : '320px',
          boxSizing: 'border-box',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        {/* Slide Top Accent Header */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: themeStyles.accent, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>
            LÁMINA 0{currentIndex + 1} DE 0{slides.length}
          </div>
          <h2 style={{ fontSize: isFullscreen ? '32px' : '22px', fontWeight: 900, color: themeStyles.titleColor, margin: '0 0 16px', letterSpacing: '-0.5px', lineHeight: '1.25' }}>
            {currentSlide.title}
          </h2>
        </div>

        {/* Slide Main Content */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            borderRadius: '12px',
            padding: isFullscreen ? '12px 16px' : '6px 2px',
            margin: '8px 0',
            fontSize: isFullscreen ? '16px' : '14px',
            lineHeight: '1.65',
            color: '#e4e4e7',
            overflowY: 'auto',
          }}
        >
          <VisualSlideRenderer
            content={currentSlide.content}
            layout={currentSlide.layout}
            accentColor={themeStyles.accent}
            boxBg={themeStyles.boxBg}
            borderColor={themeStyles.border}
          />
        </div>

        {/* Optional Speaker Notes Overlay */}
        {showNotes && currentSlide.speakerNotes && (
          <div
            style={{
              marginTop: '10px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              border: `1px solid ${themeStyles.accent}`,
              fontSize: '12px',
              color: '#cbd5e1',
            }}
          >
            <strong style={{ color: themeStyles.accent, display: 'block', marginBottom: '4px' }}>🗣️ Nota del Orador:</strong>
            {currentSlide.speakerNotes}
          </div>
        )}
      </div>

      {/* Slide Navigation Footer Bar */}
      <div
        style={{
          padding: '12px 18px',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          borderTop: `1px solid ${themeStyles.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
          disabled={currentIndex === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 16px',
            borderRadius: '8px',
            backgroundColor: currentIndex === 0 ? 'rgba(255,255,255,0.03)' : `${themeStyles.accent}22`,
            border: `1px solid ${currentIndex === 0 ? 'rgba(255,255,255,0.08)' : themeStyles.accent}`,
            color: currentIndex === 0 ? '#52525b' : '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        {/* Slide Indicators Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {slides.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setCurrentIndex(idx)}
              title={`Ir a Diapositiva ${idx + 1}`}
              style={{
                width: currentIndex === idx ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: currentIndex === idx ? themeStyles.accent : 'rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1))}
          disabled={currentIndex === slides.length - 1}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 16px',
            borderRadius: '8px',
            backgroundColor: currentIndex === slides.length - 1 ? 'rgba(255,255,255,0.03)' : `${themeStyles.accent}22`,
            border: `1px solid ${currentIndex === slides.length - 1 ? 'rgba(255,255,255,0.08)' : themeStyles.accent}`,
            color: currentIndex === slides.length - 1 ? '#52525b' : '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: currentIndex === slides.length - 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <span>Siguiente</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
