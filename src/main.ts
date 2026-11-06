import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { flushOnExit } from "./store";
import { installDiagnostics, markMounted, bootLog } from "./utils/diag";
import { readTheme, applyTheme } from "./utils/theme";
import { installPressFeedback } from "./utils/press";

// 必须在挂载（乃至诊断日志）之前设置，浅色主题才不会首帧闪暗。
applyTheme(readTheme());
installDiagnostics();
installPressFeedback();

try {
  const app = createApp(App);
  app.config.errorHandler = (err, _instance, info) => {
    console.error("[BilScore][vue-error]", info, err);
  };
  app.use(router);
  app.mount("#app");
  markMounted();
} catch (e) {
  console.error("[BilScore][mount-failed]", e);
  throw e;
}

router.afterEach((to, from) => {
  bootLog('router', `${String(from.path)} -> ${String(to.path)}`);
});

// 历史记录与活跃对局写入做了防抖，这里保证切后台/关闭前一定落盘
window.addEventListener("pagehide", flushOnExit);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushOnExit();
});
