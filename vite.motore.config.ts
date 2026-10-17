import { defineConfig } from 'vite';

/**
 * Il motore di calcolo in un file solo, per chi lo usa fuori dall'app: il
 * connettore della Mente digitale (repository `mente-digitale`), che lo copia in
 * `vendor/` con `scripts/aggiorna-motore-strutturale.mjs` e lo fa girare in Node e
 * nel Worker. Entra da `src/motore/index.ts`, e da lì niente React né browser.
 *
 * Non minificato apposta: è un file che finisce in un altro repository, e chi
 * lo apre per capire un numero deve poterlo leggere.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist-motore',
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    target: 'es2022',
    lib: {
      entry: 'src/motore/index.ts',
      formats: ['es'],
      fileName: () => 'motore-strutturale.mjs',
    },
  },
});
