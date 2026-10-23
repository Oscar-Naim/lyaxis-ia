import React from 'react';
import { X, Zap, Sparkles } from 'lucide-react';

export interface TriadQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  triadTimeFormatted: string;
  onContinueWithSpeed: () => void;
}

export const TriadQuotaModal: React.FC<TriadQuotaModalProps> = ({
  isOpen,
  onClose,
  triadTimeFormatted,
  onContinueWithSpeed,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(5, 5, 5, 0.88)',
        backdropFilter: 'blur(16px)',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#050505',
          border: '1px solid rgba(124, 58, 237, 0.45)',
          borderRadius: '16px',
          padding: '26px',
          position: 'relative',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(124, 58, 237, 0.2)',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #7C3AED, #00D9FF, #FF007F)',
          }}
        />

        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#71717a',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(124, 58, 237, 0.15)',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(124, 58, 237, 0.25)',
              flexShrink: 0,
            }}
          >
            <Zap size={22} color="#00D9FF" />
          </div>
          <div>
            <div
              style={{
                fontSize: '10.5px',
                fontFamily: 'monospace',
                fontWeight: 800,
                color: '#d8b4fe',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              LÍMITE DE CONCURRENCIA // SLIDING WINDOW
            </div>
            <h3
              style={{
                margin: '2px 0 0 0',
                fontSize: '18px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.3px',
              }}
            >
              Cuota de LYAXIS TRIAD™ Agotada
            </h3>
          </div>
        </div>

        <p
          style={{
            fontSize: '13px',
            lineHeight: 1.6,
            color: '#94a3b8',
            margin: '0 0 18px 0',
          }}
        >
          El motor concurrente <strong style={{ color: '#ffffff' }}>LYAXIS TRIAD™</strong> orquesta 3 núcleos a la
          par (<span style={{ color: '#38bdf8' }}>Speed</span>, <span style={{ color: '#ef4444' }}>Phantom</span> y{' '}
          <span style={{ color: '#c084fc' }}>Cortex Pro</span>), consumiendo un volumen elevado de tokens. Para
          garantizar la disponibilidad de la red, está limitado a{' '}
          <strong style={{ color: '#00d9ff' }}>3 consultas cada 6 horas</strong>.
        </p>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: '11px',
                color: '#71717a',
                textTransform: 'uppercase',
                fontWeight: 700,
                fontFamily: 'monospace',
              }}
            >
              Usos Disponibles
            </span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#f87171', fontFamily: 'monospace' }}>
              0 / 3 consultas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <span
              style={{
                fontSize: '11px',
                color: '#71717a',
                textTransform: 'uppercase',
                fontWeight: 700,
                fontFamily: 'monospace',
              }}
            >
              Próxima Recarga
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#00d9ff',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
                border: '1px solid rgba(0, 217, 255, 0.25)',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {triadTimeFormatted}
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: '12px',
            color: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '10px 14px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sparkles size={16} color="#10b981" style={{ flexShrink: 0 }} />
          <span>
            Las consultas con núcleos individuales estándar (como <strong>Speed</strong>, <strong>Classic</strong> o{' '}
            <strong>Cortex</strong>) son <strong>100% ilimitadas</strong>.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={onContinueWithSpeed}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              color: '#050505',
              border: 'none',
              fontSize: '13px',
              fontWeight: 800,
              fontFamily: 'monospace',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255, 255, 255, 0.15)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Zap size={15} color="#050505" />
            <span>Continuar con LYAXIS Speed (Ilimitado)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: 'transparent',
              color: '#a1a1aa',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default TriadQuotaModal;
