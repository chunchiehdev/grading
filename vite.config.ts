import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { visualizer } from 'rollup-plugin-visualizer';

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },

      
    }),
    visualizer({
      open: true,            // build 完成後自動打開瀏覽器
      gzipSize: true,         // 顯示 gzip 後大小
      brotliSize: true,       // 顯示 brotli 後大小
      filename: 'bundle-report.html', // 生成的報告檔名
    }),
    tsconfigPaths(),
  ],
});
