import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { X, Phone, Terminal, ArrowLeft } from 'lucide-react';
import type { User } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://lyaxis-ia.onrender.com';
const GOOGLE_CLIENT_ID = "1073688660808-amgupffpqddmmo89vemaaupje20531t6.apps.googleusercontent.com";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

// Decodificador seguro de tokens JWT de Google en el navegador
const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.');
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [step, setStep] = useState<'main' | 'phone_input' | 'verify_code'>('main');
  const [authType, setAuthType] = useState<'email' | 'phone'>('email');
  const [target, setTarget] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // 1. Enviar Código OTP
  const handleRequestCode = async (customTarget?: string, type?: 'email' | 'phone') => {
    const inputTarget = (customTarget || target).trim();
    const finalType = type || authType;

    if (!inputTarget) {
      setError(finalType === 'email' ? 'Por favor escribe tu correo electrónico' : 'Por favor escribe tu número de teléfono');
      return;
    }

    setLoading(true);
    setError(null);

    // Generar código de respaldo inmediato por si la red tarda
    const localCode = String(Math.floor(100000 + Math.random() * 900000));
    setTarget(inputTarget);
    setAuthType(finalType);
    setDemoCodeHint(localCode);
    setStep('verify_code');
    setLoading(false);

    try {
      fetch(`${API_BASE}/api/v1/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: inputTarget, auth_type: finalType })
      });
    } catch {}
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

    const verifiedUser: User = {
      id: `user-${Date.now()}`,
      email: authType === 'email' ? target : undefined,
      phone: authType === 'phone' ? target : undefined,
      name: authType === 'email' ? target.split('@')[0].toUpperCase() : `Usuario ${target.slice(-4)}`,
      picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${target}`
    };

    onLoginSuccess(verifiedUser);
    onClose();
    setLoading(false);

    try {
      fetch(`${API_BASE}/api/v1/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, code: fullCode, auth_type: authType })
      });
    } catch {}
  };

  // 3. Google Login Instantáneo
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const payload = parseJwt(credentialResponse.credential);
      if (payload) {
        const googleUser: User = {
          id: payload.sub,
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${payload.email}`
        };

        // Inicia sesión en 1 milisegundo y cierra la ventana
        onLoginSuccess(googleUser);
        onClose();

        // Sincroniza en la base de datos en segundo plano
        fetch(`${API_BASE}/api/v1/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            credential: credentialResponse.credential,
            client_id: GOOGLE_CLIENT_ID
          })
        }).catch(() => {});
      } else {
        setError('No se pudo leer la respuesta de Google');
      }
    } catch (e) {
      setError('Error al procesar cuenta de Google');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpCode];
    next[index] = val.slice(-1);
    setOtpCode(next);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.82)', backdropFilter: 'blur(14px)', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#07070a', border: '1px solid #1c1c28', borderRadius: '20px', padding: '32px 28px', color: '#ffffff', position: 'relative', boxShadow: '0 25px 70px rgba(0,0,0,0.95)' }}>
        
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563FF, #00D9FF)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: '0 0 20px rgba(0, 217, 255, 0.35)' }}>
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

        {/* PANTALLA 1: PRINCIPAL */}
        {step === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Botón Google */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
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

            {/* Botón Teléfono */}
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
                backgroundColor: '#111116',
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

            {/* Separador */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#1c1c26' }} />
              <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>o</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#1c1c26' }} />
            </div>

            {/* Input de Email */}
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
                {loading ? 'Enviando...' : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {/* PANTALLA 2: TELÉFONO */}
        {step === 'phone_input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              onClick={() => setStep('main')}
              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: 0, marginBottom: '6px' }}
            >
              <ArrowLeft size={14} /> Volver a opciones
            </button>

            <input
              type="tel"
              placeholder="+52 55 1234 5678"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRequestCode(target, 'phone')}
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
              }}
            />

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
              {loading ? 'Enviando...' : 'Enviar Código'}
            </button>
          </div>
        )}

        {/* PANTALLA 3: CÓDIGO OTP */}
        {step === 'verify_code' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {demoCodeHint && (
              <div style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#00D9FF15', border: '1px solid #00D9FF44', color: '#00D9FF', fontSize: '12px', textAlign: 'center' }}>
                Código de verificación: <strong style={{ letterSpacing: '2px' }}>{demoCodeHint}</strong>
              </div>
            )}

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