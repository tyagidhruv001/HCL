import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 8765,
    host: true,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
