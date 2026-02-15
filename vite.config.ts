import { defineConfig } from 'vite';

export default defineConfig({
  base: '/textdoom/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
