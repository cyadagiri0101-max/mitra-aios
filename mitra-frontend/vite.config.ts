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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
              return 'vendor-motion';
            }
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('@tanstack/react-query') || id.includes('axios')) return 'vendor-query';
            if (id.includes('lucide-react') || id.includes('@headlessui/react')) return 'vendor-ui';
            if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react';
            }
          }
          return undefined;
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
