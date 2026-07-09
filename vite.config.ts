import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://<user>.github.io/tv-time/ in production, root in dev.
  base: command === 'build' ? '/tv-time/' : '/',
  plugins: [react()],
  // NOTE: no custom manualChunks — hand-splitting React into its own chunk
  // caused a production-only init-order crash ("Cannot read properties of
  // undefined (reading 'PureComponent')"). Route-level lazy imports already put
  // recharts and the ZIP/CSV parsers in their own on-demand chunks, so Rollup's
  // default chunking is both correct and adequate.
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as any));
