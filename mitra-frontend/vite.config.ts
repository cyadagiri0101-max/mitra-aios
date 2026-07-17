import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';

// Ensure required env variables are present before building.
const REQUIRED_ENV = ['VITE_API_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.warn(`[MITRA BUILD] ⚠️ ${key} is not set. Falling back to default.`);
  }
}

export default defineConfig({
  plugins: [react(), viteTsConfigPaths()],

  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },

  build: {
    target: 'esnext',
    // Raise warning threshold slightly; a proper code-split pass can follow
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Vendor code-splitting: react, recharts, router in separate chunks
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':    ['@tanstack/react-query', 'axios'],
          'vendor-charts':   ['recharts'],
          'vendor-ui':       ['lucide-react', '@headlessui/react'],
        },
      },
    },
  },

  server: {
    port: 3000,
    // Dev proxy — avoids CORS by forwarding /api to the backend
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
