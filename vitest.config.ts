import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || "postgresql://test_user:test_password@localhost:5433/grading_test_template",
      NODE_ENV: "test"
    },
    testTimeout: 30000
  },
}); 