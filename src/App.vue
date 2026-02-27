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
:root {
  /* --- Dark Mode (默认) --- */
  --bg-grad: linear-gradient(135deg, #1a1c2e 0%, #000000 100%);
  --glass: rgba(28, 28, 30, 0.75); /* iOS System Gray 6 + Blur */
  --glass-modal: #1C1C1E;
  --glass-border: 1px solid rgba(255, 255, 255, 0.1);
  --radius: 16px;
  
  --primary: #0A84FF; /* iOS System Blue Dark */
  --primary-grad: linear-gradient(180deg, #0A84FF, #0066CC);
  --success: #30D158;
  --danger: #FF453A;
  --warning: #FFD60A;
  
  --text-main: #FFFFFF;
  --text-muted: rgba(235, 235, 245, 0.6);
  
  /* 输入框专用 */
  --input-bg: rgba(118, 118, 128, 0.24); /* iOS Search Bar Style */
  --input-placeholder: rgba(235, 235, 245, 0.3);
  --input-focus-border: rgba(10, 132, 255, 0.5);
  
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
}

/* --- Light Mode (iOS 原生感) --- */
[data-theme="light"] {
  /* 背景改为清爽的 iOS 设置页灰 */
  --bg-grad: #F2F2F7; 
  
  /* 卡片纯白 + 极其微弱的边框 */
  --glass: #FFFFFF;
  --glass-modal: #FFFFFF;
  --glass-border: 1px solid rgba(0, 0, 0, 0.04);
  
  --primary: #007AFF; /* iOS System Blue */
  --primary-grad: linear-gradient(180deg, #007AFF, #0062CC);
  --success: #34C759;
  --danger: #FF3B30;
  --warning: #FF9500;
  
  --text-main: #000000;
  --text-muted: rgba(60, 60, 67, 0.6);
  
  /* 输入框：纯白 + 阴影 */
  --input-bg: #FFFFFF;
  --input-placeholder: rgba(60, 60, 67, 0.3);
  --input-focus-border: rgba(0, 122, 255, 0.5);
}

* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-drag: none; -webkit-tap-highlight-color: transparent; }

body, html, #app {
  width: 100vw; height: 100vh; overflow: hidden;
  background: var(--bg-grad); color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased; touch-action: manipulation;
  transition: background 0.3s, color 0.3s;
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

/* 按钮通用 */
.btn {
  padding: 16px; font-size: 17px; font-weight: 600; border: none; border-radius: 14px;
  background: var(--glass); color: var(--text-main); 
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.btn:active:not(:disabled) { transform: scale(0.96); filter: brightness(0.9); }
.btn-primary { background: var(--primary-grad); color: #fff; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3); }
.btn-danger { background: rgba(255, 59, 48, 0.1); color: var(--danger); }

/* --- 核心改进：iOS 风格输入框 --- */
input, select {
  width: 100%; 
  padding: 16px; 
  border-radius: 12px; 
  border: 1px solid transparent; /* 默认无边框 */
  background: var(--input-bg); 
  color: var(--text-main); 
  font-size: 17px; 
  outline: none; 
  transition: all 0.3s ease;
  
  /* 解决 Light Mode 下看不清的问题：加一点点内阴影或外阴影 */
  box-shadow: 0 1px 2px rgba(0,0,0,0.02) inset; 
}

/* Light Mode 下给输入框加一点边框感，防止和背景融为一体 */
[data-theme="light"] input, [data-theme="light"] select {
  border: 1px solid rgba(0,0,0,0.1);
  box-shadow: 0 2px 6px rgba(0,0,0,0.03);
}

input:focus, select:focus {
  border-color: var(--primary);
  background: var(--glass); /* 聚焦时稍微变亮 */
  box-shadow: 0 0 0 4px var(--input-focus-border);
}

::placeholder { color: var(--input-placeholder); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
