import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import html2pdf from 'html2pdf.js';
import {
  BookOpen,
  Save,
  Check,
  FileDown,
  X,
  Sparkles,
  Edit3,
  Eye,
  Columns,
  Trash2,
  Plus,
  Folder,
  Calendar,
  Clock,
  Share2,
  Copy,
} from 'lucide-react';
import type { ModelType } from '../types';
import { CodeBlock } from '../CodeBlock';
import { MODEL_META } from '../config';
import { playCyberClick } from '../sound';

export interface NotebookNote {
  id: string;
  title: string;
  content: string;
  model: ModelType;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: string;
  initialTitle?: string;
  activeModel?: ModelType;
  isMobile?: boolean;
  onSaveNote?: (note: NotebookNote) => void;
}

const STORAGE_KEY = 'lyaxis_notebook_notes';

// Enhanced AI-generated image with skeleton placeholder and caption
const AiEnrichedImage: React.FC<{ src?: string; alt?: string; title?: string }> = ({ src, alt, title }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src) return null;

  return (
    <figure
      style={{
        margin: '22px 0',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        backgroundColor: '#07070b',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
        position: 'relative',
      }}
    >
      {!loaded && !error && (
        <div
          style={{
            width: '100%',
            height: '240px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            backgroundColor: 'rgba(0, 217, 255, 0.03)',
            border: '1px dashed rgba(0, 217, 255, 0.25)',
            color: '#94a3b8',
            fontSize: '12px',
          }}
        >
          <Sparkles size={20} color="#00D9FF" className="animate-spin" />
          <span style={{ fontFamily: 'monospace', letterSpacing: '0.4px' }}>
            GENERANDO ILUSTRACIÓN TÉCNICA IA...
          </span>
        </div>
      )}

      {error ? (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            color: '#ef4444',
            fontSize: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
          }}
        >
          <span style={{ fontWeight: 600 }}>No se pudo renderizar la ilustración visual</span>
          {alt && <p style={{ margin: '4px 0 0', color: '#71717a' }}>{alt}</p>}
        </div>
      ) : (
        <img
          src={src}
          alt={alt || 'Ilustración técnica'}
          title={title || alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            display: loaded ? 'block' : 'none',
            width: '100%',
            maxHeight: '480px',
            objectFit: 'cover',
            borderRadius: alt ? '14px 14px 0 0' : '14px',
            transition: 'opacity 0.3s ease-in',
          }}
        />
      )}

      {alt && (
        <figcaption
          style={{
            padding: '9px 16px',
            fontSize: '12px',
            color: '#cbd5e1',
            fontStyle: 'italic',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(10, 10, 16, 0.92)',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
          }}
        >
          <Sparkles size={12} color="#00D9FF" style={{ flexShrink: 0 }} />
          <span>{alt}</span>
        </figcaption>
      )}
    </figure>
  );
};

export const NotebookStudio: React.FC<NotebookStudioProps> = ({
  isOpen,
  onClose,
  initialContent = '',
  initialTitle = '',
  activeModel = 'speed',
  isMobile = false,
  onSaveNote,
}) => {
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle || 'Cuaderno Técnico LYAXIS');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<NotebookNote[]>([]);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'split'>('preview');
  const [savedNotice, setSavedNotice] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const meta = MODEL_META[activeModel] || MODEL_META.speed;
  const modelColor = meta.color || '#2563FF';

  // Load notes from localStorage
  const loadSavedNotes = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedNotes(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Aviso cargando notas de Notebook:', e);
    }
    return [];
  };

  useEffect(() => {
    loadSavedNotes();
  }, []);

  // Update when initialContent or initialTitle changes while opening
  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
    }
    if (initialTitle) {
      setTitle(initialTitle);
    }
    if (isOpen) {
      setViewMode('preview');
      setIsSavedDrawerOpen(false);
    }
  }, [initialContent, initialTitle, isOpen]);

  // Handle Save Note
  const handleSaveNote = () => {
    playCyberClick();
    const now = new Date().toISOString();
    const existingIndex = savedNotes.findIndex((n) => n.id === currentNoteId);

    let updated: NotebookNote[];
    let noteToSave: NotebookNote;

    if (existingIndex >= 0 && currentNoteId) {
      noteToSave = {
        ...savedNotes[existingIndex],
        title: title.trim() || 'Nota sin título',
        content,
        updatedAt: now,
      };
      updated = [...savedNotes];
      updated[existingIndex] = noteToSave;
    } else {
      const newId = `note-${Date.now()}`;
      noteToSave = {
        id: newId,
        title: title.trim() || 'Nota sin título',
        content,
        model: activeModel,
        createdAt: now,
        updatedAt: now,
      };
      setCurrentNoteId(newId);
      updated = [noteToSave, ...savedNotes];
    }

    setSavedNotes(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
    onSaveNote?.(noteToSave);
  };

  // Handle Create New Note
  const handleCreateNew = () => {
    playCyberClick();
    setCurrentNoteId(null);
    setTitle('Nueva Nota de Estudio');
    setContent('# Nueva Nota\n\nComienza a escribir aquí o abre una respuesta del chat...');
    setViewMode('edit');
    setIsSavedDrawerOpen(false);
  };

  // Handle Select Note from Library
  const handleSelectNote = (note: NotebookNote) => {
    playCyberClick();
    setCurrentNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setIsSavedDrawerOpen(false);
  };

  // Handle Delete Note
  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playCyberClick();
    const filtered = savedNotes.filter((n) => n.id !== id);
    setSavedNotes(filtered);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error(err);
    }
    if (currentNoteId === id) {
      if (filtered.length > 0) {
        handleSelectNote(filtered[0]);
      } else {
        handleCreateNew();
      }
    }
  };

  // Handle PDF Export
  const handleDownloadPdf = async () => {
    playCyberClick();
    setIsExportingPdf(true);
    try {
      const element = printAreaRef.current;
      if (!element) return;

      const safeTitle = (title || 'nota_lyaxis')
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, '_')
        .slice(0, 40);

      const opt = {
        margin: [12, 14, 12, 14],
        filename: `${safeTitle}_cuaderno_lyaxis.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.warn('Fallback a window.print():', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyMarkdown = async () => {
    playCyberClick();
    try {
      await navigator.clipboard.writeText(content);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const readingTimeMinutes = Math.max(1, Math.round(content.split(/\s+/).length / 200));

  return (
    <div
      className="lyaxis-notebook-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10500,
        backgroundColor: 'rgba(3, 3, 6, 0.78)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Main Studio Container */}
      <div
        className="lyaxis-notebook-studio"
        style={{
          width: isMobile ? '100vw' : 'min(960px, 86vw)',
          height: '100vh',
          backgroundColor: '#0A0A10',
          borderLeft: isMobile ? 'none' : '1px solid #232336',
          boxShadow: `0 10px 60px rgba(0, 0, 0, 0.95), 0 0 40px ${modelColor}18`,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Cyberpunk Toolbar */}
        <header
          style={{
            padding: isMobile ? '12px 14px' : '14px 22px',
            borderBottom: '1px solid #232336',
            backgroundColor: 'rgba(8, 8, 14, 0.92)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
            zIndex: 30,
          }}
        >
          {/* Left: Brand Badge & Editable Document Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: `${modelColor}18`,
                border: `1px solid ${modelColor}50`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 0 14px ${modelColor}33`,
              }}
            >
              <BookOpen size={16} color={modelColor} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: modelColor, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  LYAXIS NOTEBOOK // CANVAS
                </span>
                <span style={{ fontSize: '10px', color: '#71717a' }}>•</span>
                <span style={{ fontSize: '10.5px', color: '#71717a' }}>{meta.label}</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del documento..."
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 700,
                  padding: '2px 0',
                  width: '100%',
                  fontFamily: 'inherit',
                  textOverflow: 'ellipsis',
                }}
                title="Haz clic para renombrar la nota"
              />
            </div>
          </div>

          {/* Right Toolbar Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* View Mode Pills (Desktop only) */}
            {!isMobile && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '2px',
                  marginRight: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  title="Vista Lectura (Revista Cyberpunk)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: viewMode === 'preview' ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                    color: viewMode === 'preview' ? '#00D9FF' : '#a1a1aa',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Eye size={13} />
                  <span>Lectura</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  title="Editor Markdown"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: viewMode === 'edit' ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                    color: viewMode === 'edit' ? '#00D9FF' : '#a1a1aa',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Edit3 size={13} />
                  <span>Editor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  title="Vista Dividida"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: viewMode === 'split' ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                    color: viewMode === 'split' ? '#00D9FF' : '#a1a1aa',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Columns size={13} />
                  <span>Split</span>
                </button>
              </div>
            )}

            {/* Saved Notes Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsSavedDrawerOpen(!isSavedDrawerOpen)}
              title="Ver notas guardadas"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: isSavedDrawerOpen ? 'rgba(0, 217, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: isSavedDrawerOpen ? '1px solid rgba(0, 217, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: isSavedDrawerOpen ? '#00D9FF' : '#d4d4d8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Folder size={14} />
              {!isMobile && <span>Notas ({savedNotes.length})</span>}
            </button>

            {/* Guardar Nota Button */}
            <button
              type="button"
              onClick={handleSaveNote}
              title="Guardar nota actual en tu almacenamiento"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: savedNotice ? 'rgba(16, 185, 129, 0.2)' : `${modelColor}22`,
                border: savedNotice ? '1px solid #10b981' : `1px solid ${modelColor}55`,
                color: savedNotice ? '#10b981' : '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: savedNotice ? '0 0 14px rgba(16, 185, 129, 0.3)' : `0 0 12px ${modelColor}22`,
              }}
            >
              {savedNotice ? <Check size={14} color="#10b981" /> : <Save size={14} color={modelColor} />}
              <span>{savedNotice ? '¡Guardada!' : 'Guardar'}</span>
            </button>

            {/* Descargar PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              title="Descargar documento en PDF de alta calidad"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 11px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#00D9FF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isExportingPdf ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <FileDown size={14} />
              {!isMobile && <span>PDF</span>}
            </button>

            {/* Copiar Markdown */}
            <button
              type="button"
              onClick={handleCopyMarkdown}
              title="Copiar contenido Markdown"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: copiedLink ? '#10b981' : '#a1a1aa',
                cursor: 'pointer',
              }}
            >
              {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Cerrar Cuaderno"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#a1a1aa',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.color = '#a1a1aa';
              }}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Content Body Area */}
        <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
          
          {/* Saved Notes Side Drawer (Collapsible) */}
          {isSavedDrawerOpen && (
            <div
              style={{
                width: isMobile ? '100%' : '300px',
                backgroundColor: '#07070b',
                borderRight: '1px solid #232336',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 20,
                flexShrink: 0,
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #1a1a28',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  BIBLIOTECA DE NOTAS
                </span>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: `${modelColor}18`,
                    border: `1px solid ${modelColor}40`,
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={12} color={modelColor} />
                  <span>Nueva</span>
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {savedNotes.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#71717a' }}>
                    <BookOpen size={24} color="#52525b" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: '12px' }}>Aún no tienes notas guardadas.</p>
                    <span style={{ fontSize: '11px', color: '#52525b' }}>Guarda respuestas del chat con "Abrir en Notebook".</span>
                  </div>
                ) : (
                  savedNotes.map((note) => {
                    const isSelected = currentNoteId === note.id;
                    const noteMeta = MODEL_META[note.model] || meta;
                    return (
                      <div
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          marginBottom: '6px',
                          backgroundColor: isSelected ? 'rgba(0, 217, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid rgba(0, 217, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: '12.5px',
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? '#ffffff' : '#e4e4e7',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '200px',
                            }}
                          >
                            {note.title}
                          </span>
                          <button
                            type="button"
                            title="Eliminar nota"
                            onClick={(e) => handleDeleteNote(note.id, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#52525b',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#52525b'; }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#71717a' }}>
                          <span style={{ color: noteMeta.color }}>{noteMeta.label}</span>
                          <span>•</span>
                          <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Main Editing / Reading Workspace */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
            
            {/* Markdown Source Editor */}
            {(viewMode === 'edit' || (viewMode === 'split' && !isMobile)) && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRight: viewMode === 'split' ? '1px solid #232336' : 'none',
                  backgroundColor: '#06060a',
                  height: '100%',
                }}
              >
                <div style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid #1a1a24', fontSize: '11px', color: '#71717a', display: 'flex', justifyContent: 'space-between' }}>
                  <span>EDITOR MARKDOWN DIRECTO</span>
                  <span>{content.length} caracteres • {content.split(/\s+/).filter(Boolean).length} palabras</span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe o pega contenido Markdown..."
                  style={{
                    flex: 1,
                    padding: '20px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f8fafc',
                    fontFamily: "'JetBrains Mono', Consolas, monospace",
                    fontSize: '13.5px',
                    lineHeight: '1.65',
                    resize: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* Magazine Reading View (Enriched Visual Rendering) */}
            {(viewMode === 'preview' || (viewMode === 'split' && !isMobile)) && (
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: isMobile ? '16px 14px' : '32px 40px',
                  backgroundColor: '#0A0A10',
                  height: '100%',
                }}
              >
                {/* Print Area Wrapper */}
                <div
                  ref={printAreaRef}
                  id="lyaxis-notebook-print-area"
                  style={{
                    maxWidth: '820px',
                    margin: '0 auto',
                    backgroundColor: '#0A0A10',
                    color: '#f1f5f9',
                  }}
                >
                  {/* Document Magazine Header */}
                  <div
                    style={{
                      borderBottom: '1px solid #232336',
                      paddingBottom: '20px',
                      marginBottom: '28px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: modelColor,
                          backgroundColor: `${modelColor}15`,
                          border: `1px solid ${modelColor}40`,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          letterSpacing: '0.4px',
                        }}
                      >
                        LYAXIS {meta.label.toUpperCase()} NOTEBOOK
                      </span>
                      <span style={{ fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> ~{readingTimeMinutes} min de lectura
                      </span>
                    </div>

                    <h1
                      style={{
                        fontSize: isMobile ? '22px' : '30px',
                        fontWeight: 900,
                        margin: '0 0 12px 0',
                        lineHeight: '1.25',
                        letterSpacing: '-0.5px',
                        background: 'linear-gradient(180deg, #FFFFFF 0%, #cbd5e1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {title}
                    </h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#71717a' }}>
                      <span>Autor: LYAXIS AI System</span>
                      <span>•</span>
                      <span>{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Rendered Markdown Body */}
                  <div className="lyaxis-notebook-prose">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        // AI-Enriched Image with Skeleton & Caption
                        img({ src, alt, title }: any) {
                          return <AiEnrichedImage src={src} alt={alt} title={title} />;
                        },

                        // Headings
                        h1({ children }: any) {
                          return (
                            <h1
                              style={{
                                fontSize: '24px',
                                fontWeight: 800,
                                color: '#ffffff',
                                margin: '30px 0 14px',
                                borderBottom: `2px solid ${modelColor}55`,
                                paddingBottom: '6px',
                                letterSpacing: '-0.3px',
                              }}
                            >
                              {children}
                            </h1>
                          );
                        },
                        h2({ children }: any) {
                          return (
                            <h2
                              style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: '#f8fafc',
                                margin: '24px 0 12px',
                                borderLeft: `3px solid ${modelColor}`,
                                paddingLeft: '12px',
                              }}
                            >
                              {children}
                            </h2>
                          );
                        },
                        h3({ children }: any) {
                          return (
                            <h3
                              style={{
                                fontSize: '16.5px',
                                fontWeight: 700,
                                color: '#00D9FF',
                                margin: '20px 0 8px',
                              }}
                            >
                              {children}
                            </h3>
                          );
                        },

                        // Paragraphs
                        p({ children }: any) {
                          return (
                            <p
                              style={{
                                fontSize: '14.5px',
                                lineHeight: '1.75',
                                color: '#cbd5e1',
                                margin: '14px 0',
                              }}
                            >
                              {children}
                            </p>
                          );
                        },

                        // Blockquotes
                        blockquote({ children }: any) {
                          return (
                            <blockquote
                              style={{
                                borderLeft: `3px solid ${modelColor}`,
                                margin: '16px 0',
                                padding: '10px 18px',
                                backgroundColor: `${modelColor}0d`,
                                borderRadius: '0 10px 10px 0',
                                color: '#e2e8f0',
                                fontStyle: 'italic',
                              }}
                            >
                              {children}
                            </blockquote>
                          );
                        },

                        // Code Blocks with copy button
                        code({ className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeString = String(children || '').replace(/\n$/, '');

                          if (match) {
                            return <CodeBlock language={match[1]} codeString={codeString} />;
                          }
                          return (
                            <code
                              style={{
                                backgroundColor: '#111118',
                                color: '#00D9FF',
                                padding: '2px 7px',
                                borderRadius: '5px',
                                fontSize: '12.5px',
                                border: '1px solid rgba(0, 217, 255, 0.18)',
                                fontFamily: "'JetBrains Mono', Consolas, monospace",
                              }}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },

                        // Cyberpunk GFM Tables
                        table({ children, ...props }: any) {
                          return (
                            <div
                              className="lyaxis-markdown-table-wrapper"
                              style={{
                                overflowX: 'auto',
                                margin: '20px 0',
                                borderRadius: '12px',
                                border: '1px solid #2A2A3E',
                                backgroundColor: 'rgba(8, 8, 14, 0.85)',
                                boxShadow: '0 6px 25px rgba(0, 0, 0, 0.6)',
                              }}
                            >
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }} {...props}>
                                {children}
                              </table>
                            </div>
                          );
                        },
                        thead({ children, ...props }: any) {
                          return (
                            <thead style={{ backgroundColor: 'rgba(42, 42, 62, 0.45)', borderBottom: '2px solid #2A2A3E' }} {...props}>
                              {children}
                            </thead>
                          );
                        },
                        th({ children, ...props }: any) {
                          return (
                            <th
                              style={{
                                padding: '11px 16px',
                                fontWeight: 700,
                                color: '#00D9FF',
                                textAlign: 'left',
                                borderRight: '1px solid #2A2A3E',
                                letterSpacing: '0.3px',
                              }}
                              {...props}
                            >
                              {children}
                            </th>
                          );
                        },
                        td({ children, ...props }: any) {
                          return (
                            <td
                              style={{
                                padding: '10px 16px',
                                borderBottom: '1px solid rgba(42, 42, 62, 0.7)',
                                borderRight: '1px solid rgba(42, 42, 62, 0.4)',
                                color: '#e4e4e7',
                              }}
                              {...props}
                            >
                              {children}
                            </td>
                          );
                        },

                        // Lists
                        ul({ children }: any) {
                          return (
                            <ul style={{ paddingLeft: '22px', margin: '12px 0', color: '#cbd5e1', lineHeight: '1.7' }}>
                              {children}
                            </ul>
                          );
                        },
                        ol({ children }: any) {
                          return (
                            <ol style={{ paddingLeft: '22px', margin: '12px 0', color: '#cbd5e1', lineHeight: '1.7' }}>
                              {children}
                            </ol>
                          );
                        },
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>

                  {/* Document Footer */}
                  <div
                    style={{
                      marginTop: '40px',
                      paddingTop: '16px',
                      borderTop: '1px solid #1a1a24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#52525b',
                    }}
                  >
                    <span>LYAXIS NOTEBOOK STUDIO • CREATE. BREAK. REBUILD.</span>
                    <span>Documento exportable para estudio e investigación</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotebookStudio;
