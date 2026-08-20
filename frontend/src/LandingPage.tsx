import React, { useState, useEffect } from 'react';
import { Terminal, Sparkles, Brain, Compass, ShieldCheck, ArrowRight, Clock, MessageCircle, Crosshair, Waypoints } from 'lucide-react';

interface LandingPageProps {
  onEnterChat: () => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterChat, onOpenAuth }) => {
  const targetDate = new Date('2026-10-17T00:00:00').getTime();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100%', minHeight: '100vh', overflowY: 'auto', overflowX: 'hidden', backgroundColor: '#000000', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{ minHeight: '65px', borderBottom: '1px solid #121216', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', backgroundColor: '#000000', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563FF, #00D9FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(0, 217, 255, 0.35)' }}>
            <Terminal size={18} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px' }}>LYAXIS labs™</span>
            <span style={{ display: 'block', fontSize: '9.5px', color: '#71717a' }}>Create. Break. Rebuild.</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenAuth}
            style={{
              backgroundColor: '#0a0a0e',
              border: '1px solid #1c1c24',
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
            onClick={onEnterChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563FF',
              color: '#ffffff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(37, 99, 255, 0.45)',
            }}
          >
            <span>Iniciar IA</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ maxWidth: '1050px', margin: '0 auto', padding: '50px 18px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', backgroundColor: '#07070a', border: '1px solid #1c1c24', marginBottom: '18px', fontSize: '11px', color: '#00D9FF' }}>
          <Sparkles size={13} />
          <span>Fase Beta 1.0 • Conteo al 17 de Octubre</span>
        </div>

        <h1 style={{ fontSize: 'clamp(28px, 6.5vw, 48px)', fontWeight: 800, lineHeight: '1.2', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          Diseñamos la primera impresión <br />
          <span style={{ background: 'linear-gradient(135deg, #2563FF, #00D9FF, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            digital y técnica de tus ideas.
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(14px, 3.8vw, 16.5px)', color: '#a1a1aa', maxWidth: '640px', lineHeight: '1.55', margin: '0 0 28px' }}>
          Un laboratorio de experimentación e inteligencia artificial creado para transformar el caos en código limpio, interfaces funcionales y honestidad radical.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
          <button
            onClick={onEnterChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563FF',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(37, 99, 255, 0.55)',
            }}
          >
            <Terminal size={17} />
            <span>Abrir Laboratorio de IA</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Contador Responsivo */}
        <div style={{ width: '100%', maxWidth: '580px', padding: '18px', borderRadius: '16px', backgroundColor: '#050508', border: '1px solid #181822', marginBottom: '50px', boxShadow: '0 10px 40px rgba(0,0,0,0.9)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#71717a', fontSize: '12px', marginBottom: '12px' }}>
            <Clock size={14} color="#00D9FF" />
            <span>Lanzamiento Oficial Beta • 17 de Octubre de 2026</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { label: 'Días', value: timeLeft.days },
              { label: 'Horas', value: timeLeft.hours },
              { label: 'Minutos', value: timeLeft.minutes },
              { label: 'Segundos', value: timeLeft.seconds },
            ].map((item, i) => (
              <div key={i} style={{ padding: '10px 6px', borderRadius: '10px', backgroundColor: '#0a0a0f', border: '1px solid #1c1c26' }}>
                <span style={{ fontSize: 'clamp(18px, 4.5vw, 26px)', fontWeight: 800, color: '#ffffff', display: 'block', fontFamily: 'monospace' }}>
                  {item.value < 10 ? `0${item.value}` : item.value}
                </span>
                <span style={{ fontSize: '9.5px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Los 4 Motores Oficiales de LYAXIS */}
      <section style={{ maxWidth: '1050px', margin: '0 auto', padding: '0 18px 60px', width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, textAlign: 'center', marginBottom: '24px', color: '#e4e4e7' }}>
          Arquitectura y Motores de LYAXIS IA
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Motor 1: Speed */}
          <div style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#06060a', border: '1px solid #181822', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#2563FF22', border: '1px solid #2563FF55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="#2563FF" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>LYAXIS Speed</h3>
            <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
              Motor ultrarrápido optimizado para streaming instantáneo en milisegundos y desarrollo ágil.
            </p>
          </div>

          {/* Motor 2: Cortex */}
          <div style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#06060a', border: '1px solid #181822', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#7C3AED22', border: '1px solid #7C3AED55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} color="#7C3AED" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>LYAXIS Cortex</h3>
            <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
              Motor de razonamiento profundo para arquitecturas de sistemas, algoritmos y depuración analítica.
            </p>
          </div>

          {/* Motor 3: Architect */}
          <div style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#06060a', border: '1px solid #181822', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#10B98122', border: '1px solid #10B98155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Compass size={18} color="#10B981" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>LYAXIS Architect</h3>
            <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
              Arquitecto de System Prompts estructurados para producción y mentoría técnica paso a paso.
            </p>
          </div>

          {/* Motor 4: Classic */}
          <div style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#06060a', border: '1px solid #181822', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#F59E0B22', border: '1px solid #F59E0B55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={18} color="#F59E0B" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>LYAXIS Classic</h3>
            <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
              Tu compañero inteligente de uso diario. Conversación natural, versátil y amigable para cualquier tarea.
            </p>
          </div>

          {/* Motor 5: Phantom */}
          <div style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#06060a', border: '1px solid #181822', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#EF444422', border: '1px solid #EF444455', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crosshair size={18} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>LYAXIS Phantom</h3>
            <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
              El deconstructor. Encarna el "Break" — encuentra fallas, vulnerabilidades y puntos de fracaso.
            </p>
          </div>

          {/* Motor 6: Nexus */}
          <div style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#06060a', border: '1px solid #181822', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#EC489922', border: '1px solid #EC489955', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Waypoints size={18} color="#EC4899" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>LYAXIS Nexus</h3>
            <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
              Sintetizador creativo. Conecta ideas de dominios completamente diferentes para soluciones únicas.
            </p>
          </div>

          {/* Honestidad */}
          <div style={{ padding: '22px', borderRadius: '14px', backgroundColor: '#06060a', border: '1px solid #181822', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#00D9FF22', border: '1px solid #00D9FF55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} color="#00D9FF" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Honestidad Radical</h3>
            <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
              Cero alucinaciones forzadas ni relleno corporativo. Precisión técnica y código determinista.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid #121216', padding: '30px 18px 40px', backgroundColor: '#000000', textAlign: 'center', flexShrink: 0 }}>
        <p style={{ fontSize: '13px', color: '#71717a', maxWidth: '520px', margin: '0 auto 10px', fontStyle: 'italic' }}>
          "El error no es una falla fatal, sino información valiosa para la siguiente iteración."
        </p>
        <span style={{ fontSize: '11.5px', color: '#a1a1aa', fontWeight: 600 }}>
          Oscar Naim Ambrocio Aguirre — Fundador de LYAXIS labs™
        </span>
        <div style={{ marginTop: '14px', fontSize: '10.5px', color: '#52525b' }}>
          © 2026 LYAXIS labs. Create. Break. Rebuild.
        </div>
      </footer>
    </div>
  );
};