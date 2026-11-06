// 全局点击反馈：一次性波纹 + 明确的按钮轻震动。
// 只用 transform / opacity 做动画，节点在动画结束即移除；无常驻动画、无第三方依赖。
// 采用事件委托，整个应用只注册 4 个监听器。

const HOST_SELECTOR = [
  '.btn', '.icon-btn', '.text-btn', '.row', '.tile',
  '.start-card', '.resume-card', '.match', '.p-card',
  '.ev-btn', '.pick', '.target-btn', '.menu-item',
  '.segmented button', '.hint-btn', '.match-del', '.switch-row',
].join(',');

const HAPTIC_SELECTOR = '.btn, .icon-btn, .ev-btn, .text-btn, .segmented button';
const WAVE_MS = 420;

let installed = false;
let pressedEl: HTMLElement | null = null;

const reduced = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function release() {
  if (!pressedEl) return;
  pressedEl.classList.remove('is-pressed');
  pressedEl = null;
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  const origin = e.target as HTMLElement | null;
  const el = origin?.closest?.(HOST_SELECTOR) as HTMLElement | null;
  if (!el || (el as HTMLButtonElement).disabled) return;

  // 只给真正的按钮触觉反馈，滑动经过列表项时不会误震
  if (el.matches(HAPTIC_SELECTOR)) {
    try { navigator.vibrate?.(8); } catch { /* iOS 无此 API */ }
  }

  if (reduced()) return;

  release();
  pressedEl = el;
  el.classList.add('is-pressed');

  // 同一元素已有波纹时复用，避免连点堆叠节点
  if (el.querySelector('.press-wave')) return;

  const rect = el.getBoundingClientRect();
  const wave = document.createElement('span');
  wave.className = 'press-wave';
  wave.style.setProperty('--press-x', `${e.clientX - rect.left}px`);
  wave.style.setProperty('--press-y', `${e.clientY - rect.top}px`);
  wave.style.setProperty('--press-scale', String(Math.hypot(rect.width, rect.height) / 6));
  wave.addEventListener('animationend', () => wave.remove(), { once: true });
  el.appendChild(wave);
  // animationend 被系统省电策略吞掉时的兜底回收
  setTimeout(() => wave.remove(), WAVE_MS + 160);
}

export function installPressFeedback() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener('pointercancel', release, { passive: true });
  // 按下后开始滚动时立刻撤销按压态，避免列表项一直被按住
  document.addEventListener('scroll', release, { passive: true, capture: true });
}
