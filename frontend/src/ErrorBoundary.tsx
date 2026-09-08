import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('LYAXIS IA Unhandled Crash caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleHardReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#050508',
            color: '#f4f4f5',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#0c0d14',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '16px',
              padding: '32px 24px',
              boxShadow: '0 0 35px rgba(239, 68, 68, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              ⚠️
            </div>

            <div>
              <h2 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>
                LYAXIS IA — Recuperación del Sistema
              </h2>
              <p style={{ fontSize: '13.5px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
                Se detectó una excepción inesperada durante la carga de la interfaz.
              </p>
            </div>

            {this.state.error && (
              <div
                style={{
                  width: '100%',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#f87171',
                  textAlign: 'left',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.name}: {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#2563FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Recargar Sistema
              </button>
              <button
                type="button"
                onClick={this.handleHardReset}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#a1a1aa',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Limpiar Caché y Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
