import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: { include: ['@bjorn3/browser_wasi_shim'] },
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 700 },
});
