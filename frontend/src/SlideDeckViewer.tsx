import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, ChevronRight, Download, Presentation, Layers, MessageSquare } from 'lucide-react';
import { exportSlidesToPDF } from './pdfExporter';

interface Slide {
  id: number;
  title: string;
  content: string;
  speakerNotes?: string;
}

interface SlideDeckViewerProps {
  rawContent: string;
  presentationTitle?: string;
  accentColor?: string;
}

export const SlideDeckViewer: React.FC<SlideDeckViewerProps> = ({
  rawContent,
  presentationTitle = 'Presentación LYAXIS Canvas',
  accentColor = '#2563FF',
}) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'deck' | 'grid'>('deck');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    const parseSlides = (text: string): Slide[] => {
      const parsed: Slide[] = [];
      // Clean thoughts
      const cleanText = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

      // Matches <slide title="...">content</slide> or <slide title="...">content
      const slideRegex = /<slide\s+title=["']([^"']+)["'](?:\s+notes=["']([^"']+)["'])?>([\s\S]*?)(?:<\/slide>|$)/gi;
      let match;
      let idCounter = 1;

      while ((match = slideRegex.exec(cleanText)) !== null) {
        const title = match[1] || `Diapositiva ${idCounter}`;
        let speakerNotes = match[2] || '';
        let content = match[3] || '';

        // Extract <notes> inside content if present
        const notesMatch = /<notes>([\s\S]*?)<\/notes>/i.exec(content);
        if (notesMatch) {
          speakerNotes = notesMatch[1].trim();
          content = content.replace(/<notes>[\s\S]*?<\/notes>/gi, '').trim();
        }

        parsed.push({
          id: idCounter++,
          title: title.trim(),
          content: content.trim(),
          speakerNotes: speakerNotes.trim() || undefined,
        });
      }

      if (parsed.length === 0 && cleanText.includes('<slide')) {
        // Fallback simple split if regex misses
        const rawBlocks = cleanText.split(/<slide\s*/i).filter(Boolean);
        rawBlocks.forEach((block, idx) => {
          const titleMatch = /title=["']([^"']+)["']/i.exec(block);
          const title = titleMatch ? titleMatch[1] : `Diapositiva ${idx + 1}`;
          const cleanBlock = block.replace(/title=["'][^"']+["']\s*>/i, '').replace(/<\/slide>/gi, '').trim();
          parsed.push({
            id: idx + 1,
            title,
            content: cleanBlock,
          });
        });
      }

      return parsed;
    };

    const parsed = parseSlides(rawContent);
    setSlides(parsed);
  }, [rawContent]);

  const currentSlide = slides[currentSlideIndex];

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleExportPDF = async () => {
    if (!slides.length) return;
    setIsExporting(true);
    try {
      await exportSlidesToPDF(presentationTitle, accentColor, slides, 'LYAXIS OS');
    } catch (err) {
      console.error('Error al exportar láminas a PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!slides.length) {
    return null;
  }

  return (
    <div
      style={{
        margin: '16px 0',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        backgroundColor: '#07070d',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(37, 99, 255, 0.1)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#0d0e17',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: `${accentColor}22`,
              border: `1px solid ${accentColor}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
            }}
          >
            <Presentation size={18} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
              {presentationTitle}
            </span>
            <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>
              {slides.length} {slides.length === 1 ? 'lámina' : 'láminas'} • Presentación Interactiva LYAXIS Canvas
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode(prev => (prev === 'deck' ? 'grid' : 'deck'))}
            style={{
              background: 'none',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Layers size={14} />
            {viewMode === 'deck' ? 'Vista Rejilla' : 'Modo Diapositivas'}
          </button>

          {currentSlide?.speakerNotes && viewMode === 'deck' && (
            <button
              type="button"
              onClick={() => setShowNotes(prev => !prev)}
              style={{
                background: showNotes ? `${accentColor}22` : 'none',
                border: `1px solid ${showNotes ? accentColor : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: showNotes ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MessageSquare size={14} />
              Notas
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            style={{
              backgroundColor: accentColor,
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isExporting ? 0.7 : 1,
            }}
          >
            <Download size={14} />
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Main Slide Deck Container */}
      {viewMode === 'deck' ? (
        <div style={{ padding: '24px' }}>
          {currentSlide && (
            <div
              style={{
                backgroundColor: '#11121d',
                borderRadius: '12px',
                border: `1px solid ${accentColor}33`,
                padding: '24px',
                minHeight: '280px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                boxShadow: `0 8px 30px rgba(0, 0, 0, 0.5), inset 0 1px 1px ${accentColor}22`,
              }}
            >
              {/* Slide Badge & Title */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      color: accentColor,
                      backgroundColor: `${accentColor}18`,
                      border: `1px solid ${accentColor}44`,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    LÁMINA 0{currentSlideIndex + 1} DE 0{slides.length}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Diapositiva {currentSlideIndex + 1}/{slides.length}
                  </span>
                </div>

                <h2
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: '#ffffff',
                    marginTop: 0,
                    marginBottom: '16px',
                    lineHeight: 1.25,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: '12px',
                  }}
                >
                  {currentSlide.title}
                </h2>

                {/* Markdown content */}
                <div className="lyaxis-markdown-body" style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentSlide.content}</ReactMarkdown>
                </div>
              </div>

              {/* Speaker Notes if enabled */}
              {showNotes && currentSlide.speakerNotes && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderLeft: `3px solid ${accentColor}`,
                    fontSize: '12px',
                    color: '#cbd5e1',
                  }}
                >
                  <strong style={{ color: accentColor, marginRight: '6px' }}>🗣️ Nota del Orador:</strong>
                  {currentSlide.speakerNotes}
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls Bar */}
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              style={{
                backgroundColor: currentSlideIndex === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: currentSlideIndex === 0 ? '#475569' : '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ChevronLeft size={16} /> Anterior
            </button>

            {/* Pagination dots */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlideIndex(idx)}
                  style={{
                    width: idx === currentSlideIndex ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: idx === currentSlideIndex ? accentColor : 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentSlideIndex === slides.length - 1}
              style={{
                backgroundColor: currentSlideIndex === slides.length - 1 ? 'transparent' : accentColor,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: currentSlideIndex === slides.length - 1 ? '#475569' : '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: currentSlideIndex === slides.length - 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Grid Overview Mode */
        <div
          style={{
            padding: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => {
                setCurrentSlideIndex(idx);
                setViewMode('deck');
              }}
              style={{
                backgroundColor: '#11121d',
                borderRadius: '10px',
                border: `1px solid ${idx === currentSlideIndex ? accentColor : 'rgba(255, 255, 255, 0.08)'}`,
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: accentColor }}>LÁMINA 0{idx + 1}</span>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>{slide.title}</h4>
              <p
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  margin: 0,
                }}
              >
                {slide.content.replace(/[#*`-]/g, '')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
