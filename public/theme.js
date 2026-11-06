// 首帧主题：同步脚本，在 body 绘制之前写入 data-theme。
// main.ts 是 module（defer），来不及阻止浅色主题的暗色闪帧；
// 生产 CSP 禁止内联脚本，因此用同源外部脚本（default-src 'self' 允许）。
(function () {
  try {
    if (localStorage.getItem('bilscore_theme') === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#f6f4ec');
    }
  } catch (e) {
    // 存储不可用时保持默认深色
  }
})();
