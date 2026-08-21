import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Presentation,
  Download,
  Sparkles,
  MessageSquare,
  Palette,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Edit3,
  RefreshCw,
  Plus,
  Send,
  Zap,
  BookOpen,
  UserCheck,
  Calendar,
  CheckCircle2,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { exportSlidesToPDF } from './pdfExporter';

export interface SlideData {
  id: number;
  title: string;
  subtitle?: string;
  content: string;
  speakerNotes?: string;
  layout?: string;
}

interface CanvasStudioProps {
  slides: SlideData[];
  presentationTitle: string;
  isLoading: boolean;
  onSendPrompt: (promptText: string) => void;
  onUpdateSlide?: (updatedSlide: SlideData) => void;
  onRegenerateSlide?: (slideIndex: number) => void;
}

export const CanvasStudio: React.FC<CanvasStudioProps> = ({
  slides,
  presentationTitle,
  isLoading,
  onSendPrompt,
  onUpdateSlide,
  onRegenerateSlide,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [theme, setTheme] = useState<'cyber' | 'neon' | 'obsidian' | 'emerald' | 'rose'>('cyber');
  const [promptInput, setPromptInput] = useState('');
  
  // Edit modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const currentSlide = slides[currentIndex] || {
    id: 1,
    title: presentationTitle || 'Experiencia Visual LYAXIS Canvas',
    content: '### Bienvenido a LYAXIS Canvas\n\nEscribe cualquier tema abajo (ej. *"Explícame la Revolución Francesa"*) para transformarlo al instante en una experiencia visual navegable por diapositivas.',
    speakerNotes: 'Canvas convierte conocimiento complejo en láminas interactivas navegables.',
    layout: 'title'
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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

  const handleOpenEdit = () => {
    setEditTitle(currentSlide.title);
    setEditContent(currentSlide.content);
    setEditNotes(currentSlide.speakerNotes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onUpdateSlide) {
      onUpdateSlide({
        ...currentSlide,
        title: editTitle,
        content: editContent,
        speakerNotes: editNotes
      });
    }
    setIsEditing(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isLoading) return;
    onSendPrompt(promptInput.trim());
    setPromptInput('');
  };

  const themes = {
    cyber: {
      bg: 'linear-gradient(135deg, #09090e 0%, #150a24 100%)',
      border: 'rgba(168, 85, 247, 0.4)',
      accent: '#A855F7',
      titleColor: '#ffffff',
      boxBg: 'rgba(255, 255, 255, 0.03)',
      shadow: '0 0 35px rgba(168, 85, 247, 0.22)',
    },
    neon: {
      bg: 'linear-gradient(135deg, #040d1a 0%, #0a1c33 100%)',
      border: 'rgba(0, 217, 255, 0.45)',
      accent: '#00D9FF',
      titleColor: '#ffffff',
      boxBg: 'rgba(0, 217, 255, 0.04)',
      shadow: '0 0 35px rgba(0, 217, 255, 0.25)',
    },
    obsidian: {
      bg: 'linear-gradient(135deg, #050508 0%, #0d0d12 100%)',
      border: 'rgba(255, 255, 255, 0.18)',
      accent: '#e2e8f0',
      titleColor: '#ffffff',
      boxBg: 'rgba(255, 255, 255, 0.04)',
      shadow: '0 0 35px rgba(0, 0, 0, 0.8)',
    },
    emerald: {
      bg: 'linear-gradient(135deg, #03140e 0%, #0a291d 100%)',
      border: 'rgba(16, 185, 129, 0.45)',
      accent: '#10B981',
      titleColor: '#ffffff',
      boxBg: 'rgba(16, 185, 129, 0.04)',
      shadow: '0 0 35px rgba(16, 185, 129, 0.22)',
    },
    rose: {
      bg: 'linear-gradient(135deg, #18050e 0%, #2b0b1a 100%)',
      border: 'rgba(244, 63, 94, 0.45)',
      accent: '#F43F5E',
      titleColor: '#ffffff',
      boxBg: 'rgba(244, 63, 94, 0.04)',
      shadow: '0 0 35px rgba(244, 63, 94, 0.22)',
    }
  };

  const activeTheme = themes[theme];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#030306', color: '#ffffff', position: 'relative', overflow: 'hidden' }}>
      
      {/* Studio Header Toolbar */}
      <div
        style={{
          padding: '12px 24px',
          backgroundColor: 'rgba(5, 5, 8, 0.95)',
          borderBottom: '1px solid #14141d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              backgroundColor: `${activeTheme.accent}22`,
              border: `1px solid ${activeTheme.accent}66`,
              color: activeTheme.accent,
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: `0 0 16px ${activeTheme.accent}22`,
            }}
          >
            <Presentation size={15} />
            <span>LYAXIS CANVAS STUDIO</span>
          </div>

          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f5', maxWidth: '350px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {presentationTitle || 'Experiencia Visual'}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Theme Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#09090e', border: '1px solid #1c1c28', borderRadius: '8px', padding: '3px' }}>
            {(['cyber', 'neon', 'emerald', 'rose', 'obsidian'] as const).map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => setTheme(th)}
                title={`Tema ${th.toUpperCase()}`}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: theme === th ? themes[th].accent : 'transparent',
                  color: theme === th ? '#000000' : '#a1a1aa',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease',
                }}
              >
                {th}
              </button>
            ))}
          </div>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={() => exportSlidesToPDF(presentationTitle, activeTheme.accent, slides)}
            disabled={slides.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 217, 255, 0.12)',
              border: '1px solid rgba(0, 217, 255, 0.35)',
              color: '#00D9FF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: slides.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Download size={14} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Main Studio Center Stage */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          overflowY: 'auto',
          position: isFullscreen ? 'fixed' : 'relative',
          inset: isFullscreen ? 0 : 'auto',
          zIndex: isFullscreen ? 99999 : 1,
          backgroundColor: isFullscreen ? '#000000' : 'transparent',
        }}
      >
        {/* 16:9 Presentation Stage Card */}
        <div
          style={{
            width: '100%',
            maxWidth: isFullscreen ? '100vw' : '960px',
            height: isFullscreen ? '100vh' : 'auto',
            minHeight: isFullscreen ? '100vh' : '480px',
            borderRadius: isFullscreen ? '0px' : '20px',
            overflow: 'hidden',
            border: `1px solid ${activeTheme.border}`,
            boxShadow: activeTheme.shadow,
            background: activeTheme.bg,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: isFullscreen ? '60px 90px' : '36px 42px',
            boxSizing: 'border-box',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
          }}
        >
          {/* Top Slide Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${activeTheme.border}`, paddingBottom: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: activeTheme.accent, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                LYAXIS CANVAS • SLIDE 0{currentIndex + 1} DE 0{Math.max(slides.length, 1)}
              </span>
              {currentSlide.layout && (
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', backgroundColor: `${activeTheme.accent}22`, border: `1px solid ${activeTheme.accent}44`, color: activeTheme.accent, fontWeight: 700, textTransform: 'uppercase' }}>
                  {currentSlide.layout}
                </span>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
              {presentationTitle}
            </div>
          </div>

          {/* Slide Title Header */}
          <div>
            <h1 style={{ fontSize: isFullscreen ? '36px' : '26px', fontWeight: 900, color: activeTheme.titleColor, margin: '0 0 16px', letterSpacing: '-0.5px', lineHeight: '1.25' }}>
              {currentSlide.title}
            </h1>
          </div>

          {/* Slide Main Body Content */}
          <div
            style={{
              flex: 1,
              backgroundColor: activeTheme.boxBg,
              border: `1px solid ${activeTheme.border}`,
              borderRadius: '14px',
              padding: isFullscreen ? '32px 38px' : '24px 28px',
              margin: '8px 0 16px',
              fontSize: isFullscreen ? '17px' : '14.5px',
              lineHeight: '1.7',
              color: '#e4e4e7',
              overflowY: 'auto',
            }}
          >
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
              {currentSlide.content}
            </ReactMarkdown>
          </div>

          {/* Speaker Notes Overlay */}
          {showNotes && currentSlide.speakerNotes && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 18px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: `1px solid ${activeTheme.accent}`,
                fontSize: '12px',
                color: '#e2e8f0',
                boxShadow: `0 4px 20px rgba(0,0,0,0.8)`,
              }}
            >
              <strong style={{ color: activeTheme.accent, display: 'block', marginBottom: '4px' }}>🗣️ Nota del Orador:</strong>
              {currentSlide.speakerNotes}
            </div>
          )}

          {/* Bottom Stage Footer Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${activeTheme.border}`, paddingTop: '14px' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
              LYAXIS IA • Experiencia Visual Interactiva
            </span>
            <span style={{ fontSize: '10px', color: activeTheme.accent, fontWeight: 700, letterSpacing: '0.5px' }}>
              Create. Break. Rebuild.
            </span>
          </div>
        </div>

        {/* Stage Interactive Control Bar (Directly below 16:9 Stage) */}
        {!isFullscreen && (
          <div
            style={{
              width: '100%',
              maxWidth: '960px',
              marginTop: '16px',
              padding: '10px 18px',
              borderRadius: '14px',
              backgroundColor: '#07070b',
              border: `1px solid ${activeTheme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
            }}
          >
            {/* Left Nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                disabled={currentIndex === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: currentIndex === 0 ? 'rgba(255,255,255,0.03)' : `${activeTheme.accent}22`,
                  border: `1px solid ${currentIndex === 0 ? 'rgba(255,255,255,0.08)' : activeTheme.accent}`,
                  color: currentIndex === 0 ? '#52525b' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>

              <span style={{ fontSize: '12px', fontWeight: 700, color: '#e4e4e7', padding: '0 8px' }}>
                {currentIndex + 1} / {Math.max(slides.length, 1)}
              </span>

              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1))}
                disabled={currentIndex === slides.length - 1 || slides.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: currentIndex === slides.length - 1 || slides.length === 0 ? 'rgba(255,255,255,0.03)' : `${activeTheme.accent}22`,
                  border: `1px solid ${currentIndex === slides.length - 1 || slides.length === 0 ? 'rgba(255,255,255,0.08)' : activeTheme.accent}`,
                  color: currentIndex === slides.length - 1 || slides.length === 0 ? '#52525b' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentIndex === slides.length - 1 || slides.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Right Action Tools */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Edit Slide Button */}
              <button
                type="button"
                onClick={handleOpenEdit}
                title="Editar Texto de la Diapositiva"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Edit3 size={14} color={activeTheme.accent} />
                <span>Editar</span>
              </button>

              {/* Speaker notes */}
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                title="Ver Notas del Orador"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', backgroundColor: showNotes ? `${activeTheme.accent}33` : 'rgba(255, 255, 255, 0.05)', border: `1px solid ${showNotes ? activeTheme.accent : 'rgba(255, 255, 255, 0.15)'}`, color: showNotes ? activeTheme.accent : '#a1a1aa', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                <MessageSquare size={14} />
                <span>Notas</span>
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title="Pantalla Completa"
                style={{ padding: '7px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Command Prompt Bar */}
      <div
        style={{
          padding: '16px 24px',
          backgroundColor: '#050509',
          borderTop: '1px solid #14141d',
          flexShrink: 0,
        }}
      >
        {/* Quick Suggestion Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 700, flexShrink: 0 }}>SUGERENCIAS:</span>
          {[
            'Explícame la Revolución Francesa en 6 láminas',
            'Diseña un Slide Deck estilo Pitch Deck para una Startup',
            'Presentación interactiva sobre Inteligencia Artificial',
            'Exposición sobre la Revolución Industrial y sus causas',
          ].map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSendPrompt(sug)}
              style={{
                padding: '4px 10px',
                borderRadius: '14px',
                backgroundColor: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                color: '#c084fc',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Introduce cualquier tema o instrucción (ej. 'Explícame la fotosíntesis' o 'Añade una lámina sobre personajes')..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              backgroundColor: '#09090e',
              border: `1px solid ${activeTheme.border}`,
              color: '#ffffff',
              fontSize: '13.5px',
              outline: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          />
          <button
            type="submit"
            disabled={!promptInput.trim() || isLoading}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              backgroundColor: !promptInput.trim() || isLoading ? 'rgba(255,255,255,0.05)' : activeTheme.accent,
              border: 'none',
              color: !promptInput.trim() || isLoading ? '#52525b' : '#000000',
              fontWeight: 800,
              fontSize: '13px',
              cursor: !promptInput.trim() || isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: !promptInput.trim() || isLoading ? 'none' : `0 0 20px ${activeTheme.accent}55`,
              transition: 'all 0.2s ease',
            }}
          >
            <Sparkles size={16} />
            <span>{isLoading ? 'Generando...' : 'Crear Experiencia Visual'}</span>
          </button>
        </form>
      </div>

      {/* Edit Slide Modal Overlay */}
      {isEditing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '560px', backgroundColor: '#09090e', border: `1px solid ${activeTheme.accent}`, borderRadius: '18px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                <Edit3 size={18} color={activeTheme.accent} />
                <span>Editar Diapositiva #{currentIndex + 1}</span>
              </div>
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>TÍTULO DE LA DIAPOSITIVA</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#030306', border: '1px solid #1c1c28', color: '#ffffff', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>CONTENIDO (MARKDOWN)</label>
                <textarea
                  rows={6}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#030306', border: '1px solid #1c1c28', color: '#ffffff', fontSize: '13px', fontFamily: 'monospace', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>NOTAS DEL ORADOR</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#030306', border: '1px solid #1c1c28', color: '#ffffff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #27272a', color: '#a1a1aa', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button type="button" onClick={handleSaveEdit} style={{ padding: '8px 20px', borderRadius: '8px', backgroundColor: activeTheme.accent, border: 'none', color: '#000000', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
