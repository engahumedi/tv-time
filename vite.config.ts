import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://<user>.github.io/tv-time/ in production, root in dev.
  base: command === 'build' ? '/tv-time/' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split ONLY pure, leaf libraries that never touch React at module-eval
        // time. Hand-splitting React itself previously caused a production-only
        // init-order crash ("Cannot read properties of undefined (reading
        // 'PureComponent')"), so everything React-adjacent stays in the default
        // chunk. supabase-js and dexie are framework-agnostic and safe to isolate.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('/dexie/') || id.includes('/dexie-react-hooks/')) return 'dexie';
          }
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
