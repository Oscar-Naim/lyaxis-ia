import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Trash2, X, Sparkles, ArrowUpRight, Search } from 'lucide-react';
import { playCyberClick } from '../sound';

export interface SavedPrompt {
  id: string;
  title: string;
  category: string;
  content: string;
}

const DEFAULT_PROMPTS: SavedPrompt[] = [
  {
    id: 'default-1',
    title: 'Auditoría Break + Rebuild',
    category: 'Seguridad & Código',
    content:
      'Audita el siguiente código en busca de vulnerabilidades, cuellos de botella de rendimiento y condiciones de carrera. Luego, entrega la versión 100% corregida y blindada para producción:\n\n',
  },
  {
    id: 'default-2',
    title: 'Arquitectura Full-Stack Modular',
    category: 'Arquitectura',
    content:
      'Diseña la arquitectura completa, esquema de base de datos SQL y endpoints RESTful en FastAPI + React TypeScript para el siguiente sistema:\n\n',
  },
  {
    id: 'default-3',
    title: 'Planeación Didáctica SEP / NEM',
    category: 'Docencia',
    content:
      'Diseña una planeación didáctica exhaustiva alineada con la Nueva Escuela Mexicana (NEM), incluyendo PDA, secuencia por sesiones (Inicio, Desarrollo, Cierre) y rúbrica analítica en tabla Markdown sobre el tema:\n\n',
  },
  {
    id: 'default-4',
    title: 'Componente UI Cyber-Premium',
    category: 'Frontend UI',
    content:
      'Crea un componente interactivo en React + Tailwind/CSS con estética Cyber-Premium OLED, animaciones fluidas y listo para ejecutar en vivo en LYAXIS Live Canvas:\n\n',
  },
];

const STORAGE_KEY = 'lyaxis_prompt_vault_v1';

export interface PromptVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (promptContent: string) => void;
  accentColor?: string;
}

export const PromptVaultModal: React.FC<PromptVaultModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
  accentColor = '#00d9ff',
}) => {
  const [prompts, setPrompts] = useState<SavedPrompt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PROMPTS;
  });

  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Personalizado');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    } catch {}
  }, [prompts]);

  if (!isOpen) return null;

  const filtered = prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    playCyberClick();
    const item: SavedPrompt = {
      id: `prompt-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory.trim() || 'Personalizado',
      content: newContent.trim(),
    };
    setPrompts((prev) => [item, ...prev]);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playCyberClick();
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        backgroundColor: 'rgba(3, 5, 10, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '85vh',
          backgroundColor: '#060810',
          border: `1px solid ${accentColor}55`,
          borderRadius: '16px',
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.95), 0 0 30px ${accentColor}22`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#090d18',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: `${accentColor}18`,
                border: `1px solid ${accentColor}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bookmark size={17} color={accentColor} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                LYAXIS Prompt Vault
              </h3>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                // BIBLIOTECA DE PLANTILLAS Y PROMPTS REUTILIZABLES
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                playCyberClick();
                setIsAdding((prev) => !prev);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: isAdding ? 'rgba(255, 255, 255, 0.08)' : `${accentColor}22`,
                border: `1px solid ${accentColor}66`,
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>{isAdding ? 'Cancelar' : 'Nuevo Prompt'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Add Prompt Form */}
        {isAdding && (
          <form
            onSubmit={handleCreate}
            style={{
              padding: '16px 20px',
              backgroundColor: 'rgba(0, 217, 255, 0.04)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Título de la plantilla (ej. Revisión SQL)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                style={{
                  flex: 2,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#05070e',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Categoría"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#05070e',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
            </div>
            <textarea
              placeholder="Escribe el contenido del prompt reutilizable..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#05070e',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                fontSize: '12.5px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  backgroundColor: accentColor,
                  color: '#04060c',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Guardar en Vault
              </button>
            </div>
          </form>
        )}

        {/* Search Bar */}
        <div style={{ padding: '12px 20px 8px', position: 'relative' }}>
          <Search
            size={14}
            color="#64748b"
            style={{ position: 'absolute', left: '32px', top: '22px', pointerEvents: 'none' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plantilla por título, categoría o contenido..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#f8fafc',
              fontSize: '12.5px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Prompts List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                playCyberClick();
                onSelectPrompt(item.content);
                onClose();
              }}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${accentColor}66`;
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={13} color={accentColor} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{item.title}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      backgroundColor: `${accentColor}18`,
                      color: accentColor,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  >
                    {item.category}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      color: accentColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontWeight: 600,
                    }}
                  >
                    Insertar <ArrowUpRight size={12} />
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    title="Eliminar plantilla"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '3px',
                      display: 'flex',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#94a3b8',
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptVaultModal;
