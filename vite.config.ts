/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode single` produit un unique fichier HTML autonome
// (polices et scripts inclus), utilisé pour la version jouable en ligne.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  base: './',
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
  },
  test: {
    environment: 'node',
    // les tests de distribution simulent des milliers de boosters : trop lents pour 5 s sur une petite machine
    testTimeout: 30_000,
  },
}));
