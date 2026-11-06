<template>
  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
/* ============================================================
   Felt Table — BilScore v2.0 设计系统
   台呢绿 + 黄铜金 + 象牙白；全部使用显式 rgba() 变量，
   不依赖 color-mix() / 新 CSS 特性，兼容 minSdk 24 的旧 WebView。
   主题在 main.ts 挂载前写入 html[data-theme]，此处只定义 token。
   ============================================================ */
:root {
  --r-xs: 8px;
  --r-sm: 12px;
  --r-md: 16px;
  --r-lg: 22px;
  --r-xl: 28px;
  --r-full: 999px;

  --s1: 4px;
  --s2: 8px;
  --s3: 12px;
  --s4: 16px;
  --s5: 20px;
  --s6: 24px;
  --s7: 32px;

  --f-xs: 11px;
  --f-sm: 13px;
  --f-base: 15px;
  --f-md: 17px;
  --f-lg: 20px;
  --f-xl: 24px;
  --f-score: 40px;

  --ease: cubic-bezier(0.32, 0.72, 0, 1);
  --d1: 160ms;
  --d2: 240ms;

  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --page-pad: 16px;
  --content-max: 100%;
  --nav-h: 52px;

  /* ---------- Dark（默认，台呢夜场） ---------- */
  --bg-grad: radial-gradient(120% 62% at 14% 0%, #173b2e 0%, rgba(23, 59, 46, 0) 62%),
    linear-gradient(180deg, #0c1713 0%, #070d0b 100%);
  --surface-solid: #101e19;
  --surface-1: rgba(255, 255, 255, 0.04);
  --surface-2: rgba(255, 255, 255, 0.075);
  --surface-3: rgba(255, 255, 255, 0.12);
  --border: rgba(232, 226, 205, 0.1);
  --border-strong: rgba(232, 226, 205, 0.2);

  --text-1: #f3f1e7;
  --text-2: rgba(243, 241, 231, 0.62);
  --text-3: rgba(243, 241, 231, 0.38);

  --primary: #3fbf8f;
  --primary-grad: linear-gradient(160deg, #46c896, #1f8a63);
  --primary-soft: rgba(63, 191, 143, 0.14);
  --success: #4fd39a;
  --danger: #ff6b60;
  --danger-soft: rgba(255, 107, 96, 0.14);
  --gold: #e8c26b;
  --gold-soft: rgba(232, 194, 107, 0.14);

  --shadow-1: none;
  --shadow-2: none;
  --shadow-3: none;
  --scrim: rgba(3, 8, 6, 0.68);
}

:root[data-theme='light'] {
  /* ---------- Light（象牙白球台） ---------- */
  --bg-grad: radial-gradient(120% 62% at 14% 0%, #dcece0 0%, rgba(220, 236, 224, 0) 62%),
    linear-gradient(180deg, #f8f6ef 0%, #edf0e8 100%);
  --surface-solid: #ffffff;
  --surface-1: rgba(18, 58, 48, 0.035);
  --surface-2: rgba(18, 58, 48, 0.06);
  --surface-3: rgba(18, 58, 48, 0.1);
  --border: rgba(18, 58, 48, 0.1);
  --border-strong: rgba(18, 58, 48, 0.2);

  --text-1: #123a30;
  --text-2: rgba(18, 58, 48, 0.64);
  --text-3: rgba(18, 58, 48, 0.42);

  --primary: #17825c;
  --primary-grad: linear-gradient(160deg, #2aa478, #137252);
  --primary-soft: rgba(23, 130, 92, 0.1);
  --success: #17825c;
  --danger: #d5453b;
  --danger-soft: rgba(213, 69, 59, 0.1);
  --gold: #956d18;
  --gold-soft: rgba(149, 109, 24, 0.12);

  --shadow-1: 0 1px 2px rgba(10, 35, 25, 0.06);
  --shadow-2: 0 4px 14px rgba(10, 35, 25, 0.08);
  --shadow-3: 0 10px 30px rgba(10, 35, 25, 0.12);
  --scrim: rgba(10, 25, 20, 0.4);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

html {
  width: 100%;
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
}
body,
#app {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: transparent;
}
input,
textarea {
  user-select: text;
  -webkit-user-select: text;
}
button,
input {
  font-family: inherit;
}

/* 启动占位：JS 未加载时也能看到提示；颜色直接跟随主题 token，
   因此浅色模式首帧不会闪暗，也无需在 index.html 写内联 <style>。 */
#boot-hint {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  font-size: var(--f-base);
  line-height: 1.6;
  color: var(--text-3);
  background: transparent;
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
.content {
  width: 100%;
  max-width: var(--content-max);
  margin-inline: auto;
  padding-inline: var(--page-pad);
}
.scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
.scroll > .content {
  padding-top: var(--s2);
  padding-bottom: var(--s6);
}
.bottom-space {
  height: var(--s6);
}

/* ---------- 顶部导航 ---------- */
.nav-bar {
  flex: none;
  padding-block: var(--s2);
}
.nav-inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--s2);
  min-height: var(--nav-h);
}
.nav-title {
  text-align: center;
  font-size: var(--f-md);
  font-weight: 650;
  letter-spacing: -0.2px;
  white-space: nowrap;
  color: var(--text-1);
}
.nav-side {
  display: flex;
  align-items: center;
  gap: var(--s1);
  min-width: 0;
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
  font-weight: 650;
  cursor: pointer;
  transition: transform var(--d1) var(--ease), opacity var(--d1) var(--ease),
    background var(--d1) var(--ease);
}
.btn:active:not(:disabled) {
  transform: scale(0.955);
}
.btn:disabled {
  opacity: 0.42;
  cursor: default;
}
.btn-primary {
  background: var(--primary-grad);
  color: #fff;
  box-shadow: 0 6px 18px rgba(20, 120, 84, 0.24);
}
.btn-danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.btn-ghost {
  background: var(--surface-2);
}
.btn-block {
  width: 100%;
}
.btn-sm {
  min-height: 42px;
  font-size: var(--f-base);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex: none;
  border: none;
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-1);
  cursor: pointer;
  transition: transform var(--d1) var(--ease), background var(--d1) var(--ease),
    opacity var(--d1) var(--ease);
}
.icon-btn:active:not(:disabled) {
  transform: scale(0.87);
}
.icon-btn.ghost {
  background: transparent;
}
.icon-btn.ghost:active:not(:disabled) {
  background: var(--surface-2);
}
.icon-btn:disabled {
  opacity: 0.32;
  cursor: default;
}
.icon-btn.primary {
  color: var(--primary);
}
.icon-btn.gold {
  color: var(--gold);
}
.icon-btn.danger {
  color: var(--danger);
}

.text-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--s1);
  border: none;
  background: none;
  color: var(--primary);
  font-size: var(--f-base);
  font-weight: 600;
  padding: var(--s2);
  cursor: pointer;
}
.text-btn:active:not(:disabled) {
  opacity: 0.5;
}
.text-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.text-btn.muted {
  color: var(--text-2);
}

/* ---------- 点击反馈（由 utils/press.ts 驱动） ---------- */
.btn, .icon-btn, .text-btn, .row, .tile, .start-card,
.resume-card, .match, .p-card, .ev-btn, .pick, .target-btn,
.menu-item, .segmented button, .hint-btn, .match-del, .switch-row {
  position: relative;
  overflow: hidden;
}
.is-pressed {
  /* 只缩短过渡时长，让 :active 缩放立刻可见；不引入额外合成层 */
  transition-duration: 90ms;
}
.press-wave {
  position: absolute;
  left: var(--press-x, 50%);
  top: var(--press-y, 50%);
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0;
  transform: scale(0);
  pointer-events: none;
  animation: press-wave 420ms var(--ease) forwards;
}
@keyframes press-wave {
  0% { transform: scale(0); opacity: 0.2; }
  100% { transform: scale(var(--press-scale, 20)); opacity: 0; }
}

/* ---------- 入场 / 数值变化动效（只用 transform + opacity） ---------- */
@keyframes card-in {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: none; }
}
@keyframes score-pop {
  0% { transform: scale(1); }
  35% { transform: scale(1.16); }
  100% { transform: scale(1); }
}
/* backwards：仅延迟期间保持起始态，动画结束后 :active 的 transform 仍可用 */
.start-card, .resume-card { animation: card-in 320ms var(--ease) backwards; }
.tile, .match { animation: card-in 300ms var(--ease) 60ms backwards; }
.p-card {
  animation: card-in 280ms var(--ease) backwards;
  animation-delay: calc(var(--card-i, 0) * 32ms);
}
.p-score.flash { animation: score-pop 420ms var(--ease); }

/* ---------- 卡片 / 列表 ---------- */
.card {
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-1);
}
.list {
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  gap: var(--s3);
  min-height: 58px;
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
.row.static {
  cursor: default;
}
.row-main {
  flex: 1;
  min-width: 0;
}
.row-title {
  font-size: var(--f-base);
  font-weight: 600;
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
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s5) 0 var(--s2);
  font-size: var(--f-xs);
  font-weight: 700;
  letter-spacing: 1.2px;
  color: var(--text-3);
}
.eyebrow {
  font-size: var(--f-xs);
  font-weight: 700;
  letter-spacing: 1.4px;
  color: var(--gold);
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
  font-weight: 650;
  white-space: nowrap;
}
.chip.primary {
  background: var(--primary-soft);
  color: var(--primary);
}
.chip.gold {
  background: var(--gold-soft);
  color: var(--gold);
}
.chip.danger {
  background: var(--danger-soft);
  color: var(--danger);
}

/* ---------- 表单 ---------- */
.field {
  display: flex;
  flex-direction: column;
  gap: var(--s2);
  padding: var(--s3) var(--s4);
}
.field + .field {
  border-top: 1px solid var(--border);
}
.field-label {
  font-size: var(--f-sm);
  color: var(--text-2);
  font-weight: 600;
}
.field-hint {
  font-size: var(--f-xs);
  color: var(--text-3);
  line-height: 1.5;
}
.input {
  width: 100%;
  min-height: 40px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-1);
  font-size: var(--f-md);
  font-weight: 600;
}
.input::placeholder {
  color: var(--text-3);
  font-weight: 400;
}
.input.num {
  font-variant-numeric: tabular-nums;
}
.segmented {
  display: flex;
  gap: 3px;
  padding: 3px;
  background: var(--surface-2);
  border-radius: var(--r-sm);
}
.segmented button {
  flex: 1;
  min-height: 36px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text-2);
  font-size: var(--f-sm);
  font-weight: 650;
  cursor: pointer;
  transition: background var(--d1) var(--ease), color var(--d1) var(--ease);
}
.segmented button.on {
  background: var(--surface-solid);
  color: var(--text-1);
  box-shadow: var(--shadow-1);
}
.switch {
  width: 51px;
  height: 31px;
  border-radius: var(--r-full);
  background: var(--surface-3);
  position: relative;
  flex: none;
  transition: background var(--d2) var(--ease);
}
.switch.on {
  background: var(--success);
}
.switch .knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: var(--r-full);
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform var(--d2) var(--ease);
}
.switch.on .knob {
  transform: translateX(20px);
}
.empty-hint {
  text-align: center;
  color: var(--text-3);
  font-size: var(--f-sm);
  line-height: 1.6;
  padding: var(--s5) 0;
}

/* ---------- 底部固定操作区 ---------- */
.bottom-bar {
  flex: none;
  padding-top: var(--s3);
  padding-bottom: calc(var(--s3) + var(--safe-bottom));
  background: var(--surface-solid);
  border-top: 1px solid var(--border);
}
.bottom-bar .content {
  display: flex;
  flex-direction: column;
  gap: var(--s2);
}

/* ---------- 遮罩 / 抽屉 / 弹窗 ---------- */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--scrim);
}
.sheet-overlay {
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  max-width: var(--content-max);
  margin-inline: auto;
  max-height: 86dvh;
  overflow-y: auto;
  background: var(--surface-solid);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  border-top: 1px solid var(--border);
  padding: var(--s2) var(--page-pad) calc(var(--s4) + var(--safe-bottom));
  box-shadow: var(--shadow-3);
  animation: rise var(--d2) var(--ease);
}
.handle {
  width: 38px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-strong);
  margin: 0 auto var(--s4);
}
.modal-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--s5);
  z-index: 200;
}
.modal {
  width: 100%;
  max-width: 400px;
  max-height: 80dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: var(--s5) var(--s4) var(--s4);
  box-shadow: var(--shadow-3);
}
@keyframes rise {
  from {
    transform: translateY(14%);
    opacity: 0.4;
  }
}

/* ---------- 响应式 ---------- */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--s3);
}
@media (min-width: 600px) {
  :root {
    --content-max: 600px;
    --page-pad: 20px;
  }
  .grid-2 {
    grid-template-columns: 1fr 1fr;
  }
}
@media (min-width: 900px) {
  :root {
    --content-max: 860px;
    --page-pad: 24px;
  }
}
@media (min-width: 1200px) {
  :root {
    --content-max: 1120px;
    --page-pad: 28px;
  }
}
@media (max-width: 359px) {
  :root {
    --page-pad: 12px;
    --f-md: 16px;
    --f-lg: 19px;
    --f-xl: 22px;
    --f-score: 34px;
  }
  .nav-title {
    font-size: var(--f-base);
  }
}
@media (max-height: 500px) and (orientation: landscape) {
  :root {
    --s7: 20px;
    --s6: 16px;
    --nav-h: 42px;
  }
  .page {
    padding-top: calc(var(--safe-top) + 2px);
  }
  .btn {
    min-height: 44px;
  }
}

/* ---------- 过渡 ---------- */
.page-enter-active,
.page-leave-active {
  transition: opacity var(--d1) var(--ease), transform var(--d1) var(--ease);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
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
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
