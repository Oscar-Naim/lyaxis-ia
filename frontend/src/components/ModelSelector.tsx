import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ModelType } from '../types';
import { ALL_MODELS, MODEL_META } from '../config';

export interface ModelSelectorProps {
  currentModel: ModelType;
  onSelectModel: (model: ModelType) => void;
  isMobile?: boolean;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModel,
  onSelectModel,
  isMobile = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const meta = MODEL_META[currentModel] || MODEL_META.classic;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef} className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Cambiar motor de IA"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${meta.color}55`,
          borderRadius: '10px',
          padding: isMobile ? '8px 12px' : '6px 12px',
          minHeight: isMobile ? '44px' : '36px',
          color: '#ffffff',
          cursor: 'pointer',
          boxShadow: `0 0 14px ${meta.color}22`,
          transition: 'all 0.2s ease',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: meta.color,
            boxShadow: `0 0 8px ${meta.color}`,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <span style={{ fontSize: isMobile ? '13.5px' : '13px', fontWeight: 700, letterSpacing: '0.3px', lineHeight: 1.2 }}>
            LYAXIS {meta.label}
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.2 }}>
            {meta.tagline}
          </span>
        </div>
        <ChevronDown
          size={14}
          color="#a1a1aa"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            marginLeft: '4px',
          }}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: isMobile ? 'calc(100vw - 28px)' : '300px',
            maxWidth: '340px',
            backgroundColor: '#0a0a0f',
            border: '1px solid #22222e',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 10px 35px rgba(0,0,0,0.9), 0 0 20px rgba(0, 217, 255, 0.1)',
            zIndex: 9999,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            maxHeight: '75vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 800, color: '#71717a', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Seleccionar Motor LYAXIS
          </div>
          {ALL_MODELS.map((m) => {
            const itemMeta = MODEL_META[m] || MODEL_META.classic;
            const isSelected = currentModel === m;
            return (
              <button
                key={m}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectModel(m);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: isSelected ? '#ffffff' : '#a1a1aa',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  gap: '8px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: itemMeta.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#ffffff' : '#e2e8f0',
                        lineHeight: 1.3,
                      }}
                    >
                      {itemMeta.label}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {itemMeta.tagline}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '10.5px', color: '#71717a', fontFamily: 'monospace', flexShrink: 0 }}>
                  T:{itemMeta.temperature}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
