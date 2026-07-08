import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://<user>.github.io/tv-time/ in production, root in dev.
  base: command === 'build' ? '/tv-time/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as any));
