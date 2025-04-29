import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { visualizer } from 'rollup-plugin-visualizer';

// No longer needed with React Router
// declare module "@remix-run/node" {
//   interface Future {
//     v3_singleFetch: true;
//   }
// }

export default defineConfig({
  plugins: [
    reactRouter(),
    visualizer({
      open: true,            // build 完成後自動打開瀏覽器
      gzipSize: true,         // 顯示 gzip 後大小
      brotliSize: true,       // 顯示 brotli 後大小
      filename: 'bundle-report.html', // 生成的報告檔名
    }),
    tsconfigPaths(),
  ],
});