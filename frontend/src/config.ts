// Detección automática: Localhost vs Servidor Render en Producción
export const API_BASE = 
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : 'https://lyaxis-ia.onrender.com';

export const GOOGLE_CLIENT_ID = "1073688660808-amgupffpqddmmo89vemaaupje20531t6.apps.googleusercontent.com";