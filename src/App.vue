<script setup lang="ts">
import { onMounted } from 'vue';
onMounted(() => {
  const savedTheme = localStorage.getItem('bilscore_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
});
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
/* --- 全局主题变量注册 --- */
:root {
  /* [Dark Mode 默认设置] */
  --bg-grad: linear-gradient(135deg, #1a1c2e 0%, #000000 100%);
  --glass: rgba(28, 28, 30, 0.75); 
  --glass-modal: #1C1C1E;
  --glass-border: 1px solid rgba(255, 255, 255, 0.1);
  --radius: 16px;
  
  --primary: #0A84FF;
  --primary-grad: linear-gradient(180deg, #0A84FF, #0066CC);
  --success: #30D158;
  --danger: #FF453A;
  --warning: #FFD60A;
  
  --text-main: #FFFFFF;
  --text-muted: rgba(235, 235, 245, 0.6);
  
  --input-bg: rgba(118, 118, 128, 0.24);
  --input-placeholder: rgba(235, 235, 245, 0.3);
  --input-focus-border: rgba(10, 132, 255, 0.5);
  
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);

  /* === 新增：动态组件专属变量 === */
  
  /* 你的原图是浅灰色。夜晚模式：先变纯黑，再反转为纯白，确保极致清晰 */
  --icon-filter: brightness(0) invert(1);
  
  /* Round 局数显示块 (夜晚模式低调处理) */
  --round-bg: rgba(128, 128, 128, 0.2);
  --round-border: 1px solid rgba(255, 255, 255, 0.1);
  --round-shadow: none;
  --round-label: var(--warning);
  --round-num: var(--text-main);

  /* 卡片与按钮投影 (夜晚发光弱，直接无阴影) */
  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: none;
}

/* [Light Mode 覆盖设置] 使用 :root[data-theme] 确保最高 CSS 优先级 */
:root[data-theme="light"] {
  /* 极其清透的白灰渐变，绝不会黑屏 */
  --bg-grad: linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%); 
  
  --glass: #FFFFFF;
  --glass-modal: #FFFFFF;
  --glass-border: 1px solid rgba(0, 0, 0, 0.05);
  
  --primary: #007AFF; 
  --primary-grad: linear-gradient(180deg, #007AFF, #0062CC);
  --success: #28a745;
  --danger: #FF3B30;
  --warning: #FF9500;
  
  --text-main: #1c1c1e; /* 极深灰文字，不伤眼 */
  --text-muted: rgba(60, 60, 67, 0.6);
  
  --input-bg: #FFFFFF;
  --input-placeholder: rgba(60, 60, 67, 0.3);
  --input-focus-border: rgba(0, 122, 255, 0.5);

  /* === 新增：动态组件专属变量 === */

  /* 白天模式：强行将浅灰图标压成纯黑，保证在白底上绝对显眼 */
  --icon-filter: brightness(0);

  /* Round 局数显示块 (白天模式高调处理：蓝色发光胶囊) */
  --round-bg: var(--primary-grad);
  --round-border: none;
  --round-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
  --round-label: rgba(255, 255, 255, 0.9);
  --round-num: #ffffff;

  /* 卡片与按钮投影 (白天加强立体感) */
  --shadow-sm: 0 4px 10px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.05);
}

* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-drag: none; -webkit-tap-highlight-color: transparent; }

body, html, #app {
  width: 100vw; height: 100vh; overflow: hidden;
  background: var(--bg-grad); color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased; touch-action: manipulation;
  transition: background 0.3s ease, color 0.3s ease;
}

.page-container {
  display: flex; flex-direction: column; height: 100vh;
  padding-top: calc(var(--safe-top) + 12px); padding-bottom: calc(var(--safe-bottom) + 12px);
  padding-left: 20px; padding-right: 20px;
}

.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0; }
.top-bar h2 { font-size: 17px; font-weight: 600; letter-spacing: -0.5px; text-align: center; flex: 1; }

.icon-btn { background: transparent; border: none; font-size: 17px; color: var(--primary); font-weight: 400; padding: 10px; cursor: pointer; }
.icon-btn:active { opacity: 0.5; }

.btn {
  padding: 16px; font-size: 17px; font-weight: 600; border: none; border-radius: 14px;
  background: var(--glass); color: var(--text-main); 
  box-shadow: var(--shadow-sm); /* 使用动态阴影 */
  border: var(--glass-border);
  transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.btn:active:not(:disabled) { transform: scale(0.96); filter: brightness(0.9); }
.btn-primary { background: var(--primary-grad); color: #fff; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3); border: none; }
.btn-danger { background: rgba(255, 59, 48, 0.1); color: var(--danger); border: none; }

input, select {
  width: 100%; padding: 16px; border-radius: 12px; border: 1px solid transparent; 
  background: var(--input-bg); color: var(--text-main); font-size: 17px; outline: none; transition: all 0.3s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02) inset; 
}
:root[data-theme="light"] input, :root[data-theme="light"] select {
  border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}
input:focus, select:focus {
  border-color: var(--primary); background: var(--glass); box-shadow: 0 0 0 4px var(--input-focus-border);
}
::placeholder { color: var(--input-placeholder); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
