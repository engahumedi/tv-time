import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://<user>.github.io/tv-time/ in production, root in dev.
  base: command === 'build' ? '/tv-time/' : '/',
  plugins: [react()],
  build: {
    // Split heavy dependencies into their own long-cached chunks so a code
    // change doesn't invalidate vendor code and the browser downloads them in
    // parallel. Import-only libs (zip/csv parsers) land in a chunk that loads
    // lazily with the Import page.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'charts';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('react-router') || id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'react';
          if (id.includes('i18next')) return 'i18n';
          if (id.includes('dexie')) return 'dexie';
          if (id.includes('jszip') || id.includes('papaparse')) return 'import-libs';
          if (id.includes('canvas-confetti')) return 'confetti';
          if (id.includes('lucide-react')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as any));
