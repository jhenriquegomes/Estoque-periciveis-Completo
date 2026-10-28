import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Service Worker registration: only in production to prevent caching Vite dev chunks
if ('serviceWorker' in navigator) {
  const isProd = Boolean((import.meta as any).env?.PROD);
  if (isProd) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('PWA Service Worker registration failed:', err);
        });
    });
  } else {
    // In development mode, unregister any existing service worker and purge dev caches
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
