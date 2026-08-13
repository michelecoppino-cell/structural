import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// base = '/structural/' su GitHub Pages (project page), '/' in locale.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: env.GITHUB_PAGES === 'true' ? '/structural/' : '/',
    build: { outDir: 'dist', sourcemap: true },
  };
});
