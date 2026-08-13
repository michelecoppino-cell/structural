import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// L'app è servita dalla radice del dominio (Cloudflare Pages), quindi base = '/'.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    // le tabelle dei comuni e dei parametri sismici pesano più del codice e
    // cambiano di rado: in un chunk a parte restano in cache fra un deploy e
    // l'altro invece di essere riscaricate a ogni modifica dell'app.
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [{ name: 'dati-comuni', test: /src[\\/]data[\\/](comuni|parametri-sismici)\.ts$/ }],
        },
      },
    },
  },
});
