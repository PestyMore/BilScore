<script setup lang="ts">
import { onMounted } from 'vue';
onMounted(() => {
  const savedTheme = localStorage.getItem('bilscore_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
});
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
/* ============================================================
   设计系统（v1.3.0）
   目标：统一圆角/间距/字号/动效，去掉随机取值的"AI 味"，
   同时保持渲染开销低（不新增常驻动画、不滥用 backdrop-filter）
   ============================================================ */
:root {
  /* 圆角 */
  --r-xs: 8px;
  --r-sm: 12px;
  --r-md: 16px;
  --r-lg: 22px;
  --r-xl: 28px;
  --r-full: 999px;

  /* 间距 */
  --s1: 4px;
  --s2: 8px;
  --s3: 12px;
  --s4: 16px;
  --s5: 20px;
  --s6: 24px;
  --s7: 32px;

  /* 字号 */
  --f-xs: 11px;
  --f-sm: 13px;
  --f-base: 15px;
  --f-md: 17px;
  --f-lg: 20px;
  --f-xl: 24px;

  /* 动效 */
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
  --d1: 160ms;
  --d2: 240ms;

  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);

  /* ---------- Dark（默认） ---------- */
  --bg-grad: radial-gradient(120% 80% at 12% 0%, #1d2130 0%, transparent 55%),
    linear-gradient(180deg, #10111a 0%, #08080c 100%);
  --surface-solid: #15161d;
  --surface-1: rgba(255, 255, 255, 0.045);
  --surface-2: rgba(255, 255, 255, 0.08);
  --surface-3: rgba(255, 255, 255, 0.12);
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);

  --text-1: #f5f5f7;
  --text-2: rgba(245, 245, 247, 0.62);
  --text-3: rgba(245, 245, 247, 0.4);

  --primary: #0a84ff;
  --primary-grad: linear-gradient(160deg, #3b9bff, #0062dd);
  --success: #30d158;
  --danger: #ff453a;
  --warning: #ffd60a;
  --gold: #ffd60a;

  --shadow-1: none;
  --shadow-2: none;
  --shadow-3: none;
  --scrim: rgba(0, 0, 0, 0.55);
}

:root[data-theme='light'] {
  --bg-grad: linear-gradient(180deg, #f0f1f5 0%, #f7f8fa 100%);
  --surface-solid: #ffffff;
  --surface-1: rgba(255, 255, 255, 0.9);
  --surface-2: rgba(0, 0, 0, 0.04);
  --surface-3: rgba(0, 0, 0, 0.07);
  --border: rgba(0, 0, 0, 0.07);
  --border-strong: rgba(0, 0, 0, 0.14);

  --text-1: #1c1c1e;
  --text-2: rgba(60, 60, 67, 0.62);
  --text-3: rgba(60, 60, 67, 0.4);

  --primary: #007aff;
  --primary-grad: linear-gradient(160deg, #3d94ff, #0062dd);
  --success: #1ea34a;
  --danger: #e0342b;
  --warning: #f58700;
  --gold: #e0a800;

  --shadow-1: 0 1px 2px rgba(16, 20, 30, 0.05);
  --shadow-2: 0 4px 14px rgba(16, 20, 30, 0.07);
  --shadow-3: 0 10px 30px rgba(16, 20, 30, 0.1);
  --scrim: rgba(20, 22, 30, 0.35);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

body,
html,
#app {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg-grad);
  color: var(--text-1);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC',
    'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  touch-action: manipulation;
  user-select: none;
  transition: background var(--d2) var(--ease), color var(--d2) var(--ease);
}

/* ---------- 页面骨架 ---------- */
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  padding-top: calc(var(--safe-top) + var(--s2));
  padding-bottom: var(--safe-bottom);
}

/* ---------- 顶部导航 ---------- */
.nav-bar {
  flex: none;
  display: grid;
  grid-template-columns: 72px 1fr 72px;
  align-items: center;
  gap: var(--s2);
  padding: var(--s2) var(--s3);
  min-height: 52px;
}
.nav-title {
  text-align: center;
  font-size: var(--f-md);
  font-weight: 600;
  letter-spacing: -0.2px;
}
.nav-side {
  display: flex;
  align-items: center;
  gap: var(--s1);
}
.nav-side.right {
  justify-content: flex-end;
}

/* ---------- 按钮 ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s2);
  min-height: 50px;
  padding: 0 var(--s5);
  border: none;
  border-radius: var(--r-md);
  background: var(--surface-2);
  color: var(--text-1);
  font-size: var(--f-md);
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--d1) var(--ease), opacity var(--d1) var(--ease),
    background var(--d1) var(--ease);
}
.btn:active:not(:disabled) {
  transform: scale(0.972);
}
.btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.btn-primary {
  background: var(--primary-grad);
  color: #fff;
  box-shadow: 0 6px 18px rgba(0, 122, 255, 0.28);
}
.btn-danger {
  background: color-mix(in srgb, var(--danger) 14%, transparent);
  color: var(--danger);
}
.btn-danger:active:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 22%, transparent);
}
.btn-block {
  width: 100%;
}

/* 纯图标按钮 */
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-1);
  cursor: pointer;
  transition: transform var(--d1) var(--ease), background var(--d1) var(--ease),
    opacity var(--d1) var(--ease);
}
.icon-btn:active:not(:disabled) {
  transform: scale(0.92);
}
.icon-btn.ghost {
  background: transparent;
}
.icon-btn.ghost:hover {
  background: var(--surface-2);
}
.icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.icon-btn.primary {
  color: var(--primary);
}

/* 文字按钮（导航用） */
.text-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--s1);
  border: none;
  background: none;
  color: var(--primary);
  font-size: var(--f-base);
  font-weight: 500;
  padding: var(--s2);
  cursor: pointer;
}
.text-btn:active {
  opacity: 0.5;
}
.text-btn.strong {
  font-weight: 600;
}
.text-btn.muted {
  color: var(--text-2);
}

/* ---------- 卡片 / 列表 ---------- */
.card {
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-1);
}
.row {
  display: flex;
  align-items: center;
  gap: var(--s3);
  min-height: 56px;
  padding: var(--s3) var(--s4);
  background: var(--surface-1);
  cursor: pointer;
  transition: transform var(--d1) var(--ease), background var(--d1) var(--ease);
}
.row + .row {
  border-top: 1px solid var(--border);
}
.row:active:not(.static) {
  background: var(--surface-3);
}
.row-main {
  flex: 1;
  min-width: 0;
}
.row-title {
  font-size: var(--f-base);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-sub {
  margin-top: 2px;
  font-size: var(--f-sm);
  color: var(--text-2);
}
.row-trail {
  display: flex;
  align-items: center;
  gap: var(--s2);
  color: var(--text-3);
  flex: none;
}

.section-title {
  padding: var(--s5) var(--s4) var(--s2);
  font-size: var(--f-xs);
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-3);
}

/* ---------- 徽章 ---------- */
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--s1);
  height: 24px;
  padding: 0 var(--s3);
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: var(--f-xs);
  font-weight: 600;
}
.chip.primary {
  background: color-mix(in srgb, var(--primary) 16%, transparent);
  color: var(--primary);
}
.chip.gold {
  background: color-mix(in srgb, var(--gold) 18%, transparent);
  color: var(--gold);
}

/* ---------- 底部固定操作区 ---------- */
.bottom-bar {
  flex: none;
  padding: var(--s3) var(--s4) calc(var(--s3) + var(--safe-bottom));
  background: var(--surface-solid);
  border-top: 1px solid var(--border);
}

/* ---------- 滚动区 ---------- */
.scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

/* ---------- 页面切换 ---------- */
.page-enter-active,
.page-leave-active {
  transition: opacity var(--d1) var(--ease), transform var(--d1) var(--ease);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--d1) var(--ease);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
