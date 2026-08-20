import React, { useState } from 'react';
import { X, ShieldCheck, BookOpen, Layers, Lock, Cpu, Sparkles, Terminal, Flame, Zap, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface LyaxisInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'manifesto' | 'ecosystem' | 'security' | 'terms';
}

export const LyaxisInfoDrawer: React.FC<LyaxisInfoDrawerProps> = ({
  isOpen,
  onClose,
  initialTab = 'manifesto',
}) => {
  const [activeTab, setActiveTab] = useState<'manifesto' | 'ecosystem' | 'security' | 'terms'>(initialTab);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        transition: 'opacity 0.3s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100vh',
          backgroundColor: '#050508',
          borderLeft: '1px solid rgba(0, 217, 255, 0.2)',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 217, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'drawerSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#08080d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 217, 255, 0.15)',
                border: '1px solid rgba(0, 217, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} color="#00D9FF" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '0.5px' }}>
                LYAXIS labs™
              </h2>
              <span style={{ fontSize: '11px', color: '#00D9FF', fontFamily: 'monospace' }}>
                experiments • interfaces • ideas
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#030305',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            overflowX: 'auto',
          }}
        >
          {[
            { key: 'manifesto', label: 'Manifiesto', icon: <BookOpen size={13} /> },
            { key: 'ecosystem', label: 'Ecosistema', icon: <Layers size={13} /> },
            { key: 'security', label: 'Seguridad', icon: <Lock size={13} /> },
            { key: 'terms', label: 'Términos', icon: <FileText size={13} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1,
                minWidth: '100px',
                padding: '12px 10px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #00D9FF' : '2px solid transparent',
                color: activeTab === tab.key ? '#00D9FF' : '#71717a',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TAB 1: MANIFIESTO & FILOSOFÍA */}
          {activeTab === 'manifesto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Lema Hero Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(37, 99, 255, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)',
                  border: '1px solid rgba(0, 217, 255, 0.25)',
                  borderRadius: '14px',
                  padding: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ fontSize: '10px', color: '#00D9FF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                  LEMA OFICIAL
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                  "Create. Break. Rebuild."
                </div>
                <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                  "Las ideas no tienen que quedarse como ideas. Crear desde el caos."
                </p>
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#71717a' }}>
                  <span>Fundador: <strong style={{ color: '#ffffff' }}>Oscar Naim Ambrocio Aguirre</strong></span>
                  <span>Beta 1.0: <strong style={{ color: '#00D9FF' }}>17 Octubre 2026</strong></span>
                </div>
              </div>

              {/* 6 Principios Inmutables */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#00D9FF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={14} /> Los 6 Principios Inmutables
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  {[
                    { num: '01', title: 'Construir antes de presumir', desc: 'La ejecución y los prototipos funcionales preceden a la narrativa y al marketing.', color: '#2563FF' },
                    { num: '02', title: 'Experimentar antes de decidir', desc: 'La práctica técnica y las pruebas reales revelan lo que la teoría abstracta oculta.', color: '#7C3AED' },
                    { num: '03', title: 'Fallar también es información', desc: 'El error no es una falla fatal, sino un dato técnico esencial para la siguiente iteración (Break & Rebuild).', color: '#EF4444' },
                    { num: '04', title: 'La tecnología debe servir a las personas', desc: 'La técnica es un instrumento mediador de claridad humana, no un fin egoísta.', color: '#10B981' },
                    { num: '05', title: 'No todo tiene que ser comercial', desc: 'Espacio reservado para la investigación pura, el aprendizaje y el código open source.', color: '#F59E0B' },
                    { num: '06', title: 'Evolucionar constantemente', desc: 'Libertad absoluta para transformar rumbos y rediseñar herramientas desde cero.', color: '#EC4899' },
                  ].map((p) => (
                    <div
                      key={p.num}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${p.color}33`,
                        display: 'flex',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 900, color: p.color, fontFamily: 'monospace' }}>
                        {p.num}
                      </span>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>{p.title}</div>
                        <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '3px', lineHeight: '1.45' }}>{p.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matriz de Identidad */}
              <div
                style={{
                  backgroundColor: '#08080e',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e4e4e7' }}>MATRIZ DE IDENTIDAD DE LYAXIS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> ES
                    </div>
                    <p style={{ fontSize: '11.5px', color: '#a1a1aa', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                      Laboratorio experimental, taller técnico, honestidad radical, aprendizaje continuo y estética premium.
                    </p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} /> NO ES
                    </div>
                    <p style={{ fontSize: '11.5px', color: '#a1a1aa', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                      Lenguaje corporativo vacío, promesas infladas sin código o mercantilización forzada de experimentos.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ECOSISTEMA MODULAR */}
          {activeTab === 'ecosystem' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>PROYECTOS Y MÓDULOS DE LYAXIS LABS™</span>

              {[
                { name: 'LYAXIS labs™', type: 'Casa Matriz', desc: 'Núcleo de dirección, filosofía, investigación y gobernanza técnica.', icon: <Sparkles size={16} color="#00D9FF" />, tag: 'Core' },
                { name: 'LYAXIS IA', type: 'Producto Insignia', desc: 'Plataforma conversacional multi-motor de alta velocidad y streaming en tiempo real sin relleno.', icon: <Cpu size={16} color="#7C3AED" />, tag: 'Live v2.5' },
                { name: 'LYAXIS OS', type: 'Sistemas e Interfaces', desc: 'Investigación en entornos deterministas, soberanía digital y permisos granulares.', icon: <Terminal size={16} color="#10B981" />, tag: 'R&D' },
                { name: 'LYAXIS Canvas', type: 'Live Web Sandbox', desc: 'Entorno de prototipado HTML/JS/CSS en vivo para pruebas rápidas de interfaz.', icon: <Flame size={16} color="#F59E0B" />, tag: 'En desarrollo' },
                { name: 'Chaos Fuzzer', type: 'Pruebas de Estrés', desc: 'Simulador para detectar vulnerabilidades, memory leaks y puntos de quiebre en código.', icon: <Zap size={16} color="#EF4444" />, tag: 'Lab Tool' },
              ].map((proj, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {proj.icon}
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{proj.name}</span>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>• {proj.type}</span>
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(0, 217, 255, 0.1)', color: '#00D9FF', border: '1px solid rgba(0, 217, 255, 0.3)' }}>
                      {proj.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#a1a1aa', margin: 0, lineHeight: '1.45' }}>{proj.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: SEGURIDAD & BLINDAJE */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheck size={28} color="#10B981" />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Blindaje Cibernético Activo</div>
                  <div style={{ fontSize: '12px', color: '#a1a1aa' }}>Mitigación OWASP Top 10 para LLMs & Sanitización Estricta</div>
                </div>
              </div>

              {[
                { title: 'Protección contra Prompt Injection', desc: 'Sanitización de entradas que neutraliza intentos de jailbreak y alteración de system prompts.' },
                { title: 'Aislamiento de Claves de API', desc: 'Claves reservadas en variables de entorno seguras en la nube (Render & Vercel), inaccesibles desde el cliente.' },
                { title: 'Rate Limiting Inteligente', desc: 'Control de tráfico configurado a 30 peticiones por minuto por usuario para evitar saturación.' },
                { title: 'Cero Venta ni Rastreo de Datos', desc: 'Las conversaciones no se comparten con terceros ni se utilizan para venta comercial de publicidad.' },
              ].map((sec, i) => (
                <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#00D9FF' }}>{sec.title}</div>
                  <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px', lineHeight: '1.45' }}>{sec.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: TÉRMINOS & HONESTIDAD */}
          {activeTab === 'terms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>TÉRMINOS DE SERVICIO Y GARANTÍA DE HONESTIDAD</div>
              <p style={{ fontSize: '12.5px', color: '#a1a1aa', lineHeight: '1.55', margin: 0 }}>
                LYAXIS IA es un proyecto de investigación y desarrollo operado por LYAXIS labs™. Al utilizar la plataforma aceptas los siguientes términos:
              </p>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#F59E0B' }}>1. Garantía de Honestidad Radical</div>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, lineHeight: '1.45' }}>
                  Nuestros modelos están programados para admitir cuando no tienen suficiente información en vez de inventar o alucinar respuestas comerciales.
                </p>

                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#F59E0B' }}>2. Uso Responsable de Inteligencia Artificial</div>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, lineHeight: '1.45' }}>
                  El usuario es responsable de verificar el código y las recomendaciones generadas antes de desplegarlas en entornos críticos de producción.
                </p>

                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#F59E0B' }}>3. Derechos de Propiedad Intelectual</div>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, lineHeight: '1.45' }}>
                  El código y las respuestas generadas por los motores de LYAXIS pertenecen al usuario que las genera.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: '#030305',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '11px', color: '#52525b', fontFamily: 'monospace' }}>
            LYAXIS labs™ • Create. Break. Rebuild.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
