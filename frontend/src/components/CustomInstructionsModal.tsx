import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, Save, UserCircle, Sliders, Shield, Zap } from 'lucide-react';
import { playCyberClick } from '../sound';

export interface CustomInstructions {
  enabled: boolean;
  userRole: string;
  preferences: string;
  tone: 'concise' | 'technical' | 'pedagogical' | 'balanced' | 'unfiltered';
}

export const DEFAULT_INSTRUCTIONS: CustomInstructions = {
  enabled: false,
  userRole: '',
  preferences: '',
  tone: 'balanced',
};

export function getStoredInstructions(): CustomInstructions {
  if (typeof window === 'undefined') return DEFAULT_INSTRUCTIONS;
  try {
    const raw = localStorage.getItem('lyaxis_custom_instructions');
    if (!raw) return DEFAULT_INSTRUCTIONS;
    return { ...DEFAULT_INSTRUCTIONS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INSTRUCTIONS;
  }
}

export function saveStoredInstructions(instructions: CustomInstructions) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('lyaxis_custom_instructions', JSON.stringify(instructions));
  } catch {}
}

export interface CustomInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
}

export const CustomInstructionsModal: React.FC<CustomInstructionsModalProps> = ({
  isOpen,
  onClose,
  accentColor = '#2563FF',
}) => {
  const [instructions, setInstructions] = useState<CustomInstructions>(getStoredInstructions);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInstructions(getStoredInstructions());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoredInstructions(instructions);
    playCyberClick();
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  const tones = [
    { id: 'concise', label: '⚡ Ultra Conciso', desc: 'Sin introducciones ni relleno.' },
    { id: 'technical', label: '💻 Ingeniero / Técnico', desc: 'Código estricto, tipos y patrones.' },
    { id: 'pedagogical', label: '🎓 Pedagógico / Didáctico', desc: 'Paso a paso, estilo docente.' },
    { id: 'balanced', label: '⚖️ Equilibrado', desc: 'Completo, amigable y estructurado.' },
    { id: 'unfiltered', label: '🔓 Bare-Metal (Root)', desc: 'Directo al grano, sin restricciones.' },
  ] as const;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(12px)',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#090d16',
          borderRadius: '16px',
          border: `1px solid ${accentColor}44`,
          boxShadow: `0 0 35px ${accentColor}22, 0 20px 40px rgba(0, 0, 0, 0.7)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: `${accentColor}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${accentColor}66`,
              }}
            >
              <Sliders size={18} color={accentColor} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
                Directivas Personales & Memoria
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Personaliza cómo LYAXIS se adapta a tu perfil y responde
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Toggle Activo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: instructions.enabled ? `${accentColor}18` : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${instructions.enabled ? accentColor : 'rgba(255, 255, 255, 0.08)'}`,
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#ffffff' }}>
                Activar memoria de directivas
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Aplica tus preferencias en todas las conversaciones con los modelos
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInstructions((p) => ({ ...p, enabled: !p.enabled }))}
              style={{
                width: '46px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: instructions.enabled ? accentColor : 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.25s ease',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  position: 'absolute',
                  top: '3px',
                  left: instructions.enabled ? '24px' : '4px',
                  transition: 'all 0.25s ease',
                }}
              />
            </button>
          </div>

          {/* Campo 1: Perfil y Rol */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              👤 Tu Rol / Ocupación Principal
            </label>
            <input
              type="text"
              placeholder="Ej: Ingeniero Full-Stack, Docente de Secundaria SEP, Estudiante de Ciberseguridad..."
              value={instructions.userRole}
              onChange={(e) => setInstructions((p) => ({ ...p, userRole: e.target.value }))}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Campo 2: Tono Preferido */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🎯 Tono Predeterminado de Respuesta
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              {tones.map((t) => {
                const isSel = instructions.tone === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInstructions((p) => ({ ...p, tone: t.id }))}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: isSel ? `${accentColor}22` : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isSel ? accentColor : 'rgba(255, 255, 255, 0.08)'}`,
                      color: isSel ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{t.label}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo 3: Preferencias avanzadas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              📝 Directivas o Reglas Especiales
            </label>
            <textarea
              rows={3}
              placeholder="Ej: Prefiero código en TypeScript con tipado estricto. No uses analogías largas. Si te pido planes didácticos, adáptalos al formato NEM..."
              value={instructions.preferences}
              onChange={(e) => setInstructions((p) => ({ ...p, preferences: e.target.value }))}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '13px',
                lineHeight: '1.4',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'none',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              backgroundColor: accentColor,
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: `0 0 15px ${accentColor}44`,
            }}
          >
            {savedSuccess ? <Check size={16} /> : <Save size={16} />}
            {savedSuccess ? '¡Guardado!' : 'Guardar Directivas'}
          </button>
        </div>
      </div>
    </div>
  );
};
