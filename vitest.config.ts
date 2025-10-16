import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts', './test/polyfills.ts'],
    env: {
      // Use dev database for testing with proper cleanup
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://grading_admin:password@localhost:5432/grading_db',
      NODE_ENV: 'test',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: 'dev_password',
    },
    testTimeout: 30000,
    // Run tests sequentially to avoid DB conflicts
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Force sequential execution
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
