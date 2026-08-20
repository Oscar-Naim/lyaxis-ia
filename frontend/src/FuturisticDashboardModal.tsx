import React, { useState, useEffect } from 'react';
import { X, Activity, Cpu, ShieldCheck, Zap, Radio, BarChart3, Sliders, RefreshCw, Sparkles, CheckCircle2, Terminal } from 'lucide-react';

interface FuturisticDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: 'speed' | 'cortex' | 'architect' | 'classic' | 'phantom' | 'nexus' | 'forge' | 'magister';
  onSelectModel: (m: 'speed' | 'cortex' | 'architect' | 'classic' | 'phantom' | 'nexus' | 'forge' | 'magister') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  messageCount: number;
  conversationCount: number;
}

export const FuturisticDashboardModal: React.FC<FuturisticDashboardModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  soundEnabled,
  onToggleSound,
  messageCount,
  conversationCount,
}) => {
  const [latency, setLatency] = useState<number>(14);
  const [tokensPerSec, setTokensPerSec] = useState<number>(128);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'engine' | 'settings'>('telemetry');

  // Simulate subtle real-time telemetry fluctuations
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setLatency(Math.floor(11 + Math.random() * 6));
      setTokensPerSec(Math.floor(120 + Math.random() * 25));
    }, 1500);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const modelMetrics = {
    speed: { name: 'LYAXIS Speed v2.5', latency: '~12ms', tps: '145 t/s', focus: 'Streaming ultrarrápido', color: '#2563FF' },
    cortex: { name: 'LYAXIS Cortex Pro', latency: '~24ms', tps: '95 t/s', focus: 'Razonamiento y Algoritmos', color: '#7C3AED' },
    architect: { name: 'LYAXIS Architect AI', latency: '~18ms', tps: '110 t/s', focus: 'Mentoría & Arquitectura', color: '#10B981' },
    classic: { name: 'LYAXIS Classic', latency: '~14ms', tps: '135 t/s', focus: 'Asistente de uso diario', color: '#F59E0B' },
    phantom: { name: 'LYAXIS Phantom', latency: '~16ms', tps: '120 t/s', focus: 'Deconstructor & Auditor', color: '#EF4444' },
    nexus: { name: 'LYAXIS Nexus', latency: '~20ms', tps: '105 t/s', focus: 'Sintetizador Creativo', color: '#EC4899' },
    forge: { name: 'LYAXIS Forge', latency: '~15ms', tps: '130 t/s', focus: 'Constructor Práctico', color: '#F97316' },
    magister: { name: 'LYAXIS Magister', latency: '~17ms', tps: '125 t/s', focus: 'Planeación Docente SEP', color: '#06B6D4' },
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
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
          maxWidth: '680px',
          backgroundColor: '#09090e',
          border: '1px solid rgba(0, 217, 255, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 0 40px rgba(0, 217, 255, 0.15), 0 20px 50px rgba(0, 0, 0, 0.9)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Futuristic Scanline Accent Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(37, 99, 255, 0.12), rgba(0, 217, 255, 0.05), transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00D9FF',
              }}
            >
              <Activity size={18} className="lyaxis-hero-icon" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.5px' }}>
                PANEL DE TELEMETRÍA HUD
              </h3>
              <span style={{ fontSize: '11px', color: '#00D9FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Radio size={10} style={{ animation: 'pulse 1.5s infinite' }} /> SISTEMA OPERATIVO & ENCRYPTED
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              color: '#a1a1aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', backgroundColor: '#050508' }}>
          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'telemetry' ? '2px solid #00D9FF' : '2px solid transparent',
              color: activeTab === 'telemetry' ? '#00D9FF' : '#71717a',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <BarChart3 size={14} /> Telemetría Live
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('engine')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'engine' ? '2px solid #7C3AED' : '2px solid transparent',
              color: activeTab === 'engine' ? '#a78bfa' : '#71717a',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <Cpu size={14} /> Motor IA ({selectedModel.toUpperCase()})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '2px solid #10B981' : '2px solid transparent',
              color: activeTab === 'settings' ? '#34d399' : '#71717a',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <Sliders size={14} /> Control HUD
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {activeTab === 'telemetry' && (
            <>
              {/* Main Gauge Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(0, 217, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    LATENCIA DE STREAMING
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: '#00D9FF' }}>{latency}</span>
                    <span style={{ fontSize: '12px', color: '#00D9FF', fontWeight: 600 }}>ms</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle2 size={10} /> Ultra-Fast HTTP/2 SSE
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(124, 58, 237, 0.15)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    RENDIMIENTO DE TOKENS
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: '#a78bfa' }}>{tokensPerSec}</span>
                    <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>t/s</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#a78bfa' }}>Batching RAF activado</span>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ESTADÍSTICAS DEL CHAT
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: '#34d399' }}>{messageCount}</span>
                    <span style={{ fontSize: '11px', color: '#71717a' }}>mensajes / {conversationCount} chats</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#34d399' }}>Persistencia OK</span>
                </div>
              </div>

              {/* Holographic Signal Pulse Visualizer */}
              <div
                style={{
                  backgroundColor: '#050509',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} color="#00D9FF" /> CANAL DE TRANSPORTE Y BUFFER DE STREAMING
                  </span>
                  <span style={{ fontSize: '10px', color: '#00D9FF', fontFamily: 'monospace' }}>BUFFER: 0ms</span>
                </div>

                {/* Animated Equalizer Waves */}
                <div style={{ height: '36px', display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '4px 0' }}>
                  {[40, 70, 30, 85, 95, 60, 45, 80, 55, 90, 65, 35, 75, 50, 88, 42, 68, 92, 38, 78].map((h, idx) => (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        backgroundColor: idx % 3 === 0 ? '#00D9FF' : idx % 3 === 1 ? '#7C3AED' : '#10B981',
                        borderRadius: '2px',
                        opacity: 0.75,
                        transition: 'height 0.3s ease',
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>SELECCIONAR MOTOR DE RAZONAMIENTO ACTIVADO</span>
              {(['speed', 'cortex', 'architect', 'classic', 'phantom', 'nexus', 'forge', 'magister'] as const).map((m) => {
                const isCurrent = selectedModel === m;
                const info = modelMetrics[m];
                const color = info.color;
                return (
                  <div
                    key={m}
                    onClick={() => onSelectModel(m)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '12px',
                      backgroundColor: isCurrent ? `${color}12` : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isCurrent ? color : 'rgba(255, 255, 255, 0.08)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          boxShadow: isCurrent ? `0 0 10px ${color}` : 'none',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{info.name}</div>
                        <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{info.focus}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px' }}>
                      <span style={{ color: '#71717a' }}>{info.latency}</span>
                      <span style={{ color: color, fontWeight: 700 }}>{info.tps}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Efectos de Sonido Cyberpunk</div>
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Feedback de audio en clics y tokens</div>
                </div>
                <button
                  type="button"
                  onClick={onToggleSound}
                  style={{
                    backgroundColor: soundEnabled ? '#00D9FF22' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${soundEnabled ? '#00D9FF' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: soundEnabled ? '#00D9FF' : '#71717a',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {soundEnabled ? 'ACTIVADO' : 'DESACTIVADO'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: '#050508',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '11px', color: '#52525b', fontFamily: 'monospace' }}>LYAXIS CORE ENGINE • v2.5-FLASH</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#00D9FF',
              color: '#000000',
              border: 'none',
              padding: '6px 18px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            CERRAR HUD
          </button>
        </div>
      </div>
    </div>
  );
};
