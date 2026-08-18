import React, { useState, useEffect } from 'react';
import { Terminal, Sparkles, Brain, ShieldCheck, ArrowRight, Clock } from 'lucide-react';

interface LandingPageProps {
  onEnterChat: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterChat }) => {
  const targetDate = new Date('2026-10-17T00:00:00').getTime();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflowY: 'auto', overflowX: 'hidden', backgroundColor: '#000000', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar Sticky */}
      <nav style={{ height: '70px', borderBottom: '1px solid #121216', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', backgroundColor: '#000000', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563FF, #00D9FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0, 217, 255, 0.35)' }}>
            <Terminal size={20} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px' }}>LYAXIS labs™</span>
            <span style={{ display: 'block', fontSize: '10px', color: '#71717a' }}>Create. Break. Rebuild.</span>
          </div>
        </div>

        <button
          onClick={onEnterChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#2563FF',
            color: '#ffffff',
            border: 'none',
            padding: '9px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(37, 99, 255, 0.45)',
          }}
        >
          <span>Iniciar LYAXIS IA</span>
          <ArrowRight size={14} />
        </button>
      </nav>

      {/* Hero Section */}
      <section style={{ maxWidth: '1050px', margin: '0 auto', padding: '70px 24px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: '#07070a', border: '1px solid #1c1c24', marginBottom: '22px', fontSize: '12px', color: '#00D9FF' }}>
          <Sparkles size={14} />
          <span>Fase Beta 1.0 • Conteo regresivo hacia el 17 de Octubre</span>
        </div>

        {/* Titular */}
        <h1 style={{ fontSize: '48px', fontWeight: 800, lineHeight: '1.15', margin: '0 0 20px', letterSpacing: '-0.5px' }}>
          Diseñamos la primera impresión <br />
          <span style={{ background: 'linear-gradient(135deg, #2563FF, #00D9FF, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            digital y técnica de tus ideas.
          </span>
        </h1>

        <p style={{ fontSize: '16.5px', color: '#a1a1aa', maxWidth: '680px', lineHeight: '1.6', margin: '0 0 34px' }}>
          Un laboratorio de experimentación e inteligencia artificial creado para transformar el caos en código limpio, interfaces funcionales y honestidad radical.
        </p>

        {/* Botón Principal */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '50px' }}>
          <button
            onClick={onEnterChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#2563FF',
              color: '#ffffff',
              border: 'none',
              padding: '14px 30px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 28px rgba(37, 99, 255, 0.55)',
            }}
          >
            <Terminal size={18} />
            <span>Abrir Laboratorio de IA</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Cuenta Regresiva Oficial */}
        <div style={{ width: '100%', maxWidth: '620px', padding: '24px', borderRadius: '16px', backgroundColor: '#050508', border: '1px solid #181822', marginBottom: '60px', boxShadow: '0 10px 40px rgba(0,0,0,0.9)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#71717a', fontSize: '13px', marginBottom: '16px' }}>
            <Clock size={15} color="#00D9FF" />
            <span>Lanzamiento Oficial Beta • 17 de Octubre de 2026</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { label: 'Días', value: timeLeft.days },
              { label: 'Horas', value: timeLeft.hours },
              { label: 'Minutos', value: timeLeft.minutes },
              { label: 'Segundos', value: timeLeft.seconds },
            ].map((item, i) => (
              <div key={i} style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#0a0a0f', border: '1px solid #1c1c26' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', display: 'block', fontFamily: 'monospace' }}>
                  {item.value < 10 ? `0${item.value}` : item.value}
                </span>
                <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarjetas de Pilares Técnicos */}
      <section style={{ maxWidth: '1050px', margin: '0 auto', padding: '0 24px 80px', width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, textAlign: 'center', marginBottom: '32px', color: '#e4e4e7' }}>
          Arquitectura y Motores de LYAXIS
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Card 1 */}
          <div style={{ padding: '28px', borderRadius: '14px', backgroundColor: '#06060a', border: '1px solid #181822', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#2563FF22', border: '1px solid #2563FF55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="#2563FF" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, margin: 0 }}>LYAXIS Speed</h3>
            <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
              Motor optimizado para streaming instantáneo en milisegundos, asistencia ágil en desarrollo web y consultas sin tiempo de espera.
            </p>
          </div>

          {/* Card 2 */}
          <div style={{ padding: '28px', borderRadius: '14px', backgroundColor: '#06060a', border: '1px solid #181822', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#7C3AED22', border: '1px solid #7C3AED55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={20} color="#7C3AED" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, margin: 0 }}>LYAXIS Cortex</h3>
            <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
              Motor de razonamiento profundo enfocado en arquitecturas de sistemas, algoritmos complejos y depuración analítica paso a paso.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{ padding: '28px', borderRadius: '14px', backgroundColor: '#06060a', border: '1px solid #181822', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#00D9FF22', border: '1px solid #00D9FF55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="#00D9FF" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, margin: 0 }}>Honestidad Radical</h3>
            <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: '1.5', margin: 0 }}>
              Sin alucinaciones forzadas ni relleno corporativo. Si algo tiene límites técnicos, el sistema lo reconoce con precisión lógica.
            </p>
          </div>
        </div>
      </section>

      {/* Cita y Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid #121216', padding: '40px 24px 60px', backgroundColor: '#000000', textAlign: 'center', flexShrink: 0 }}>
        <p style={{ fontSize: '14px', color: '#71717a', maxWidth: '580px', margin: '0 auto 12px', fontStyle: 'italic' }}>
          "El error no es una falla fatal, sino información valiosa para la siguiente iteración."
        </p>
        <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>
          Oscar Naim Ambrocio Aguirre — Fundador de LYAXIS labs™
        </span>
        <div style={{ marginTop: '16px', fontSize: '11px', color: '#52525b' }}>
          © 2026 LYAXIS labs. Create. Break. Rebuild.
        </div>
      </footer>
    </div>
  );
};