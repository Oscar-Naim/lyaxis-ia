import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register PWA Service Worker for LYAXIS IA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('LYAXIS IA PWA Service Worker registered:', reg.scope);
    }).catch((err) => {
      console.log('Service Worker registration skipped/failed:', err);
    });
  });
}
