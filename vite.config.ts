import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    reactRouter(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'bundle-report.html',
    }),
    tsconfigPaths(),
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['app', 'localhost', '127.0.0.1', '.localhost'],
    hmr: {
      overlay: true,
      // HMR reconnect configuration
      timeout: 30000,
    },
  },
  // Fix "Cannot read properties of null (reading 'useMemo')" during HMR
  // Force Vite to always resolve React to the same copy (prevent duplicate instances)
  // Reference: https://vitejs.dev/config/shared-options.html#resolve-dedupe
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  // Pre-optimize dependencies to prevent runtime optimization
  // This fixes the "Invalid hook call" error on first load
  //
  // Strategy: Force Vite to scan ALL route files to discover dependencies upfront
  // This prevents runtime optimization when switching between routes
  optimizeDeps: {
    // Force Vite to scan all route files (not just entry points)
    // This discovers dependencies used in teacher/student pages before they're accessed
    entries: [
      './app/entry.client.tsx',
      './app/routes/**/*.tsx',
      './app/components/**/*.tsx',
    ],

    // Exclude server-only dependencies from optimization
    exclude: [
      'google-auth-library',
      'pino',
      'pino-pretty',
      'ioredis',
      '@prisma/client',
      '@prisma/client/runtime/library',
    ],

    // Keep only critical dependencies that might not be caught by scanning
    // Most dependencies will be auto-discovered by the entries scan above
    include: [
      'react',
      'react-dom',
      'react-i18next',
      'socket.io-client',
    ],
  },
});
