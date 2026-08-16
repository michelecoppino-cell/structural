import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './state/store';
import './styles/app.css';

/**
 * Service worker: rende l'app installabile (icona propria su cellulare e su
 * PC) e la fa partire anche senza rete. Solo in produzione — in sviluppo
 * servirebbe file vecchi al posto di quelli appena modificati.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // niente service worker (contesto non sicuro, o utente che l'ha negato):
      // l'app funziona lo stesso, solo senza installazione e senza offline
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
