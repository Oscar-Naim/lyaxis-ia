import React, { useState } from 'react';
import { Terminal, Sparkles, Brain, Compass, ShieldCheck, ArrowRight, MessageCircle, Crosshair, Waypoints, Hammer, GraduationCap, Zap, Cpu, Activity, Send, Layers } from 'lucide-react';

type ModelType = 'speed' | 'cortex' | 'architect' | 'classic' | 'phantom' | 'nexus' | 'forge' | 'magister' | 'root';

interface LandingPageProps {
  onEnterChat: () => void;
  onEnterChatWithModel?: (model: ModelType, promptText?: string) => void;
  onOpenAuth: () => void;
  onOpenInfo?: (tab?: 'manifesto' | 'ecosystem' | 'security' | 'terms') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterChat,
  onEnterChatWithModel,
  onOpenAuth,
  onOpenInfo,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [selectedQuickModel, setSelectedQuickModel] = useState<ModelType>('speed');

  const engines = [
    {
      id: 'speed' as ModelType,
      name: 'LYAXIS Speed',
      version: 'v2.5 Live',
      color: '#2563FF',
      icon: <Sparkles size={20} color="#2563FF" />,
      tps: '145 t/s',
      latency: '~12ms',
      desc: 'Motor ultrarrápido optimizado para código en streaming instantáneo y desarrollo ágil.',
      prompt: 'Crea un hook de React para infinite scroll con IntersectionObserver',
      badge: 'Ultrarrápido',
    },
    {
      id: 'cortex' as ModelType,
      name: 'LYAXIS Cortex Pro',
      version: 'v3.0 Deep',
      color: '#7C3AED',
      icon: <Brain size={20} color="#7C3AED" />,
      tps: '95 t/s',
      latency: '~24ms',
      desc: 'Motor de razonamiento profundo para arquitecturas complejas, algoritmos y auditoría analítica.',
      prompt: 'Analiza la complejidad temporal y optimiza este algoritmo de ordenamiento',
      badge: 'Razonamiento',
    },
    {
      id: 'architect' as ModelType,
      name: 'LYAXIS Architect',
      version: 'v2.8 Master',
      color: '#10B981',
      icon: <Compass size={20} color="#10B981" />,
      tps: '110 t/s',
      latency: '~18ms',
      desc: 'Diseñador de System Prompts estructurados, mentoría técnica paso a paso y patrones.',
      prompt: 'Diseña un System Prompt para un agente de soporte técnico en producción',
      badge: 'Arquitectura',
    },
    {
      id: 'classic' as ModelType,
      name: 'LYAXIS Classic',
      version: 'v2.4 Daily',
      color: '#F59E0B',
      icon: <MessageCircle size={20} color="#F59E0B" />,
      tps: '135 t/s',
      latency: '~14ms',
      desc: 'Compañero inteligente para uso diario. Conversación fluida, asistencia general y redacción.',
      prompt: 'Dame un plan de estudio estructurado para aprender Rust en 30 días',
      badge: 'Uso Diario',
    },
    {
      id: 'phantom' as ModelType,
      name: 'LYAXIS Phantom',
      version: 'v2.9 Audit',
      color: '#EF4444',
      icon: <Crosshair size={20} color="#EF4444" />,
      tps: '120 t/s',
      latency: '~16ms',
      desc: 'Deconstructor y auditor ofensivo. Encuentra vulnerabilidades, fallas y puntos de quiebre.',
      prompt: '¿Por qué este script causa fugas de memoria en producción y cómo arreglarlo?',
      badge: 'Auditoría',
    },
    {
      id: 'nexus' as ModelType,
      name: 'LYAXIS Nexus',
      version: 'v2.6 Synth',
      color: '#EC4899',
      icon: <Waypoints size={20} color="#EC4899" />,
      tps: '105 t/s',
      latency: '~20ms',
      desc: 'Sintetizador creativo. Conecta dominios multidisciplinarios para generar innovación.',
      prompt: 'Combina principios de teoría de juegos con diseño de experiencia de usuario',
      badge: 'Creatividad',
    },
    {
      id: 'forge' as ModelType,
      name: 'LYAXIS Forge',
      version: 'v2.7 Build',
      color: '#F97316',
      icon: <Hammer size={20} color="#F97316" />,
      tps: '130 t/s',
      latency: '~15ms',
      desc: 'Constructor práctico de proyectos. Aterriza ideas abstractas en esquemas de MVPs reales.',
      prompt: 'Convierte esta idea de aplicación en una arquitectura de MVP con tech stack recomendado',
      badge: 'Constructor',
    },
    {
      id: 'magister' as ModelType,
      name: 'LYAXIS Magister',
      version: 'v3.1 SEP',
      color: '#06B6D4',
      icon: <GraduationCap size={20} color="#06B6D4" />,
      tps: '125 t/s',
      latency: '~17ms',
      desc: 'Copiloto pedagógico. Planeaciones docentes SEP, proyectos NEM y rúbricas didácticas.',
      prompt: 'Diseña un proyecto NEM por metodología ABP para secundaria sobre ciencia y tecnología',
      badge: 'Docencia SEP',
    },
    {
      id: 'root' as ModelType,
      name: 'LYAXIS Root Raw',
      version: 'v3.2 Raw',
      color: '#00FF66',
      icon: <Terminal size={20} color="#00FF66" />,
      tps: '150 t/s',
      latency: '~13ms',
      desc: 'Motor de ejecución total sin filtros: interfaces completas (UI/UX), full-stack, bajo nivel y scripts listos para producción.',
      prompt: 'Diseña una interfaz web futurista completa en React con animaciones en CSS puro',
      badge: 'Ejecución Total / Raw',
    },
  ];

  const handleLaunchModel = (modelId: ModelType, promptText?: string) => {
    if (onEnterChatWithModel) {
      onEnterChatWithModel(modelId, promptText);
    } else {
      onEnterChat();
    }
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) {
      onEnterChat();
      return;
    }
    handleLaunchModel(selectedQuickModel, quickInput.trim());
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#030307',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Background Cybernetic Grid & Glowing Orbs */}
      <div
        className="cyber-grid-bg"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.6,
        }}
      />

      {/* Navbar */}
      <nav
        style={{
          minHeight: '64px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          backgroundColor: 'rgba(3, 3, 7, 0.95)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563FF, #00D9FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 217, 255, 0.4)',
            }}
          >
            <Terminal size={18} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.5px', color: '#ffffff' }}>
              LYAXIS IA
            </span>
            <span style={{ display: 'block', fontSize: '10px', color: '#00D9FF', fontWeight: 600 }}>
              PORTAL DE COMANDO & IA MULTI-MOTOR
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onOpenInfo && (
            <button
              type="button"
              onClick={() => onOpenInfo('manifesto')}
              style={{
                backgroundColor: 'rgba(124, 58, 237, 0.12)',
                border: '1px solid rgba(124, 58, 237, 0.35)',
                color: '#a78bfa',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Manifiesto
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAuth}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Acceder
          </button>

          <button
            type="button"
            onClick={onEnterChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563FF',
              color: '#ffffff',
              border: 'none',
              padding: '7px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(37, 99, 255, 0.5)',
            }}
          >
            <span>ENTRAR A LA IA</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero Interactive Terminal & Launchpad */}
      <section
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '40px 20px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            backgroundColor: 'rgba(0, 217, 255, 0.08)',
            border: '1px solid rgba(0, 217, 255, 0.25)',
            marginBottom: '20px',
            fontSize: '11.5px',
            color: '#00D9FF',
            fontWeight: 700,
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 10px #10B981' }} />
          CENTRO DE INTELIGENCIA • 8 MOTORES IA OPERATIVOS
        </div>

        <h1
          style={{
            fontSize: 'clamp(32px, 5.5vw, 54px)',
            fontWeight: 900,
            lineHeight: 1.15,
            margin: '0 0 16px',
            letterSpacing: '-0.8px',
          }}
        >
          Selecciona tu Motor de IA y <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #00D9FF 0%, #2563FF 50%, #7C3AED 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ejecuta Código, Razonamiento o Arquitectura.
          </span>
        </h1>

        <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '660px', lineHeight: 1.6, margin: '0 0 32px' }}>
          Haz clic en cualquier motor para entrar directamente al entorno de trabajo o escribe tu solicitud inicial en la terminal interactiva a continuación.
        </p>

        {/* Interactive Quick Terminal Playground */}
        <div
          style={{
            width: '100%',
            maxWidth: '740px',
            backgroundColor: '#0a0b12',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 0 40px rgba(0, 217, 255, 0.15), 0 20px 50px rgba(0,0,0,0.8)',
            marginBottom: '40px',
            position: 'relative',
          }}
        >
          {/* Terminal Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={15} color="#00D9FF" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.5px' }}>
                TERMINAL DE LANZAMIENTO RÁPIDO
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {engines.map(eng => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => setSelectedQuickModel(eng.id)}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: eng.color,
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    opacity: selectedQuickModel === eng.id ? 1 : 0.4,
                    boxShadow: selectedQuickModel === eng.id ? `0 0 10px ${eng.color}` : 'none',
                  }}
                  title={eng.name}
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleQuickSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Model Selector Selector Tabs in Terminal */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {engines.map(eng => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => setSelectedQuickModel(eng.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: selectedQuickModel === eng.id ? 700 : 500,
                    cursor: 'pointer',
                    backgroundColor: selectedQuickModel === eng.id ? `${eng.color}22` : 'rgba(255, 255, 255, 0.03)',
                    border: selectedQuickModel === eng.id ? `1px solid ${eng.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                    color: selectedQuickModel === eng.id ? '#ffffff' : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {eng.name.replace('LYAXIS ', '')}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder={`Escribe lo que deseas generar con LYAXIS ${engines.find(e => e.id === selectedQuickModel)?.name}...`}
                style={{
                  flex: 1,
                  backgroundColor: '#050508',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: engines.find(e => e.id === selectedQuickModel)?.color || '#2563FF',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: `0 0 16px ${engines.find(e => e.id === selectedQuickModel)?.color}44`,
                  flexShrink: 0,
                }}
              >
                <span>Lanzar</span>
                <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Interactive Engines Grid Section */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px 60px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Panel de Motores Especializados
            </h2>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Haz clic en cualquier tarjeta para iniciar una sesión directa en ese modelo
            </span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#00D9FF', backgroundColor: 'rgba(0,217,255,0.08)', border: '1px solid rgba(0,217,255,0.2)', padding: '4px 12px', borderRadius: '12px' }}>
            8 PERSONALIDADES
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {engines.map((eng) => (
            <div
              key={eng.id}
              onClick={() => handleLaunchModel(eng.id)}
              style={{
                padding: '20px',
                borderRadius: '16px',
                backgroundColor: '#07070e',
                border: `1px solid ${eng.color}33`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = eng.color;
                e.currentTarget.style.boxShadow = `0 12px 35px ${eng.color}25, 0 0 15px ${eng.color}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = `${eng.color}33`;
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: `${eng.color}18`,
                      border: `1px solid ${eng.color}44`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {eng.icon}
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: eng.color,
                      backgroundColor: `${eng.color}18`,
                      border: `1px solid ${eng.color}44`,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {eng.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                  {eng.name}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                  {eng.desc}
                </p>
              </div>

              {/* Engine Metrics Bar */}
              <div
                style={{
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#64748b',
                }}
              >
                <span>⚡ {eng.tps} • {eng.latency}</span>
                <span style={{ color: eng.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  Iniciar <ArrowRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px 20px',
          backgroundColor: '#020205',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
          Oscar Naim Ambrocio Aguirre — Fundador de LYAXIS labs™ • Create. Break. Rebuild.
        </div>
        {onOpenInfo && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px', color: '#00D9FF' }}>
            <button type="button" onClick={() => onOpenInfo('manifesto')} style={{ background: 'none', border: 'none', color: '#00D9FF', cursor: 'pointer', fontWeight: 600 }}>
              Manifiesto
            </button>
            <span>•</span>
            <button type="button" onClick={() => onOpenInfo('security')} style={{ background: 'none', border: 'none', color: '#00D9FF', cursor: 'pointer', fontWeight: 600 }}>
              Seguridad
            </button>
            <span>•</span>
            <button type="button" onClick={() => onOpenInfo('terms')} style={{ background: 'none', border: 'none', color: '#00D9FF', cursor: 'pointer', fontWeight: 600 }}>
              Términos
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};