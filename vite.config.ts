import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          )
            return 'react-vendor';
          if (id.includes('@firebase/firestore')) return 'firebase-firestore';
          if (id.includes('@firebase/auth')) return 'firebase-auth';
          if (id.includes('node_modules/@firebase'))
            return 'firebase-core';
          if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion'))
            return 'motion';
        },
      },
    },
  },
});
