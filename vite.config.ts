import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [vue()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 产物配置：目标定在 es2020（iOS 14+ / Android WebView 都够用），
  // 关掉 gzip 体积报告可以明显加快构建（它要对每个产物再压一遍）
  build: {
    target: "es2020",
    reportCompressedSize: false,
    chunkSizeWarningLimit: 600,
  },

  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    // true = 监听 0.0.0.0。写成具体 IP 时，某些 NAT/虚拟网卡环境下模拟器会连不上，
    // 表现为"装上了但一片白"，所以移动端开发统一放开所有网卡。
    host: host ? true : false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
