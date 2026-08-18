import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { X, Phone, Terminal, ArrowLeft } from 'lucide-react';
import type { User } from './types';

const API_BASE = 'http://localhost:8000';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [step, setStep] = useState<'main' | 'phone_input' | 'verify_code'>('main');
  const [authType, setAuthType] = useState<'email' | 'phone'>('email');
  const [target, setTarget] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // 1. Enviar Código de Verificación
  const handleRequestCode = async (customTarget?: string, type?: 'email' | 'phone') => {
    const inputTarget = (customTarget || target).trim();
    const finalType = type || authType;

    if (!inputTarget) {
      setError(finalType === 'email' ? 'Por favor escribe tu correo electrónico' : 'Por favor escribe tu número de teléfono');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: inputTarget, auth_type: finalType })
      });

      const data = await res.json();
      if (res.ok) {
        setTarget(inputTarget);
        setAuthType(finalType);
        setDemoCodeHint(data.demo_code || '123456');
        setStep('verify_code');
      } else {
        setError(data.detail || 'Error al enviar código');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Validar Código de 6 Dígitos
  const handleVerifyOtp = async () => {
    const fullCode = otpCode.join('').trim();
    if (fullCode.length !== 6) {
      setError('Debes ingresar los 6 dígitos del código');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, code: fullCode, auth_type: authType })
      });

      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        setError(data.detail || 'Código de verificación incorrecto');
      }
    } catch {
      setError('Error validando el código con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Google Login
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.user);
        onClose();
      }
    } catch {
      setError('Error al autenticar con Google');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpCode];
    next[index] = val.slice(-1);
    setOtpCode(next);

    // Auto-focus al siguiente input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#09090d', border: '1px solid #1c1c28', borderRadius: '18px', padding: '32px 28px', color: '#ffffff', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.95)' }}>
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}
        >
          <X size={20} />
        </button>

        {/* LOGO y HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563FF, #00D9FF)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: '0 0 20px rgba(37, 99, 255, 0.4)' }}>
            <Terminal size={22} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
            {step === 'verify_code' ? 'Código de verificación' : 'Iniciar sesión o registrarse'}
          </h2>
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, lineHeight: '1.45' }}>
            {step === 'verify_code'
              ? `Ingresa el código de 6 dígitos que enviamos a ${target}`
              : 'Obtendrás respuestas más inteligentes, podrás guardar tu historial y más.'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#dc262622', border: '1px solid #dc262655', color: '#f87171', fontSize: '12px', marginBottom: '18px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* PANTALLA 1: PRINCIPAL (Google, Teléfono, Correo) */}
        {step === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 1. Botón Google Oficial */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '2px' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Error al conectar con Google')}
                theme="filled_black"
                shape="pill"
                size="large"
                width="324"
                text="continue_with"
              />
            </div>

            {/* 2. Botón Continuar con Teléfono */}
            <button
              onClick={() => {
                setAuthType('phone');
                setStep('phone_input');
                setError(null);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '12px',
                borderRadius: '24px',
                backgroundColor: '#121218',
                border: '1px solid #22222e',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Phone size={16} />
              <span>Continuar con el teléfono</span>
            </button>

            {/* Separador "O" */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#1c1c26' }} />
              <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>o</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#1c1c26' }} />
            </div>

            {/* 3. Input de Email */}
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  setAuthType('email');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleRequestCode(target, 'email')}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '14px 18px',
                  borderRadius: '24px',
                  backgroundColor: '#000000',
                  border: '1px solid #22222e',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  marginBottom: '12px',
                }}
              />

              <button
                onClick={() => handleRequestCode(target, 'email')}
                disabled={loading || !target.trim()}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '24px',
                  backgroundColor: target.trim() ? '#ffffff' : '#22222e',
                  color: target.trim() ? '#000000' : '#71717a',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: target.trim() ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                }}
              >
                {loading ? 'Enviando código...' : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {/* PANTALLA 2: INPUT DE TELÉFONO */}
        {step === 'phone_input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              onClick={() => setStep('main')}
              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: 0, marginBottom: '6px' }}
            >
              <ArrowLeft size={14} /> Volver a opciones
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                placeholder="+52 55 1234 5678"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRequestCode(target, 'phone')}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  borderRadius: '24px',
                  backgroundColor: '#000000',
                  border: '1px solid #22222e',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={() => handleRequestCode(target, 'phone')}
              disabled={loading || !target.trim()}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '24px',
                backgroundColor: target.trim() ? '#ffffff' : '#22222e',
                color: target.trim() ? '#000000' : '#71717a',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: target.trim() ? 'pointer' : 'default',
              }}
            >
              {loading ? 'Enviando SMS...' : 'Enviar Código'}
            </button>
          </div>
        )}

        {/* PANTALLA 3: VERIFICACIÓN DE CÓDIGO (6 DÍGITOS OTP) */}
        {step === 'verify_code' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {/* Aviso con el código generado para pruebas locales */}
            {demoCodeHint && (
              <div style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#00D9FF15', border: '1px solid #00D9FF44', color: '#00D9FF', fontSize: '12px', textAlign: 'center' }}>
                Código de prueba generado: <strong style={{ letterSpacing: '2px' }}>{demoCodeHint}</strong>
              </div>
            )}

            {/* 6 Casillas de Dígitos */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '8px 0' }}>
              {otpCode.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digit && i > 0) {
                      document.getElementById(`otp-${i - 1}`)?.focus();
                    } else if (e.key === 'Enter') {
                      handleVerifyOtp();
                    }
                  }}
                  style={{
                    width: '42px',
                    height: '48px',
                    textAlign: 'center',
                    fontSize: '20px',
                    fontWeight: 800,
                    borderRadius: '10px',
                    backgroundColor: '#000000',
                    border: digit ? '1px solid #00D9FF' : '1px solid #22222e',
                    color: '#ffffff',
                    outline: 'none',
                    boxShadow: digit ? '0 0 10px rgba(0, 217, 255, 0.3)' : 'none',
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otpCode.join('').length !== 6}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '24px',
                backgroundColor: otpCode.join('').length === 6 ? '#2563FF' : '#22222e',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: otpCode.join('').length === 6 ? 'pointer' : 'default',
                boxShadow: otpCode.join('').length === 6 ? '0 0 20px rgba(37, 99, 255, 0.4)' : 'none',
              }}
            >
              {loading ? 'Verificando...' : 'Verificar y Entrar'}
            </button>

            <button
              onClick={() => {
                setStep('main');
                setOtpCode(['', '', '', '', '', '']);
                setError(null);
              }}
              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '12px' }}
            >
              Cambiar correo o teléfono
            </button>
          </div>
        )}

      </div>
    </div>
  );
};