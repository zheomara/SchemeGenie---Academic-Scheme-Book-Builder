
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vite replaces this string everywhere in your code with the actual key value
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    sourcemap: false
  },
  server: {
    port: 3000
  }
});
