<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
  // 初始化主题：读取本地存储，默认为 dark
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
/* --- 全局主题变量系统 --- */
:root {
  /* 默认深色模式 (Dark Mode) */
  --bg-grad: linear-gradient(135deg, #1a1c2e 0%, #10101a 100%);
  --glass: rgba(40, 40, 45, 0.6);
  --glass-modal: rgba(30, 30, 35, 0.95);
  --glass-border: 1px solid rgba(255, 255, 255, 0.08);
  --radius: 16px;
  
  --primary: #00a8ff;
  --primary-grad: linear-gradient(90deg, #00a8ff, #0097e6);
  --success: #5bff8a;
  --danger: #ff5b5b;
  --warning: #fcd34d;
  
  --text-main: #eef2ff;
  --text-muted: rgba(255, 255, 255, 0.5);
  --input-bg: rgba(0,0,0,0.2);
}

/* 浅色模式 (Light Mode) */
[data-theme="light"] {
  --bg-grad: linear-gradient(135deg, #f0f2f5 0%, #dfe4ea 100%);
  --glass: rgba(255, 255, 255, 0.65);
  --glass-modal: rgba(255, 255, 255, 0.95);
  --glass-border: 1px solid rgba(0, 0, 0, 0.05);
  
  --primary: #0984e3;
  --primary-grad: linear-gradient(90deg, #0984e3, #74b9ff);
  --success: #00b894;
  --danger: #d63031;
  --warning: #e17055; /* 浅色下用橙红更显眼 */
  
  --text-main: #2d3436;
  --text-muted: rgba(0, 0, 0, 0.5);
  --input-bg: rgba(255,255,255,0.5);
}

* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-drag: none; }

body, html, #app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-grad);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  touch-action: manipulation;
  transition: color 0.3s, background 0.3s; /* 平滑过渡主题 */
}

.page-container {
  display: flex; flex-direction: column; height: 100vh; padding: max(20px, env(safe-area-inset-top)) 20px 20px 20px;
}

.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0; }
.top-bar h2 { font-size: 18px; font-weight: 600; text-align: center; flex: 1; }
.icon-btn { 
  background: transparent; border: none; font-size: 16px; color: var(--primary); 
  font-weight: 500; padding: 10px 0; cursor: pointer; transition: 0.2s; 
}
.icon-btn:active { transform: scale(0.9); opacity: 0.7; }

.btn {
  padding: 16px 20px; font-size: 16px; font-weight: 600; border: none; border-radius: 14px;
  background: var(--glass); color: var(--text-main); border: var(--glass-border);
  box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.btn:active:not(:disabled) { transform: scale(0.95); opacity: 0.8; }
.btn-primary { background: var(--primary-grad); color: #fff; border: none; }
.btn-primary:active:not(:disabled) { filter: brightness(1.1); }
.btn-danger { background: rgba(255, 91, 91, 0.1); color: var(--danger); border: 1px solid var(--danger); }

input, select {
  width: 100%; padding: 16px; border-radius: 12px; border: var(--glass-border);
  background: var(--input-bg); color: var(--text-main); font-size: 16px; outline: none; transition: 0.2s;
}
input:focus, select:focus { border-color: var(--primary); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
</style>
