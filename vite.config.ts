import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// L'app è servita dalla radice del dominio (Cloudflare Pages), quindi base = '/'.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: true },
});
