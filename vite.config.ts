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
    allowedHosts: [
      'app',           
      'localhost',     
      '127.0.0.1',     
      '.localhost',    
    ],
  },
});
