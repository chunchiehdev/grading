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
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: process.env.REDIS_PORT || '6379',
      REDIS_PASSWORD: process.env.REDIS_PASSWORD || 'password',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
    testTimeout: 60000, 
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});