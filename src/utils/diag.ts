// src/utils/diag.ts
// 白屏排查用：把未捕获异常渲染到屏幕上（否则移动端只看到一片白，没有任何线索），
// 同时打到 console —— 用 `adb logcat | findstr BilScore` 可以捞到。
// 稳定后可整体移除。

const TAG = '[BilScore]';

export const bootLog = (...args: unknown[]) => {
  console.log(TAG, ...args);
};

let panel: HTMLDivElement | null = null;

function ensurePanel(): HTMLDivElement {
  if (panel && document.body.contains(panel)) return panel;
  panel = document.createElement('div');
  panel.id = 'bilscore-fatal';
  panel.style.cssText = [
    'position:fixed',
    'left:0',
    'right:0',
    'bottom:0',
    'z-index:2147483647',
    'max-height:45vh',
    'overflow:auto',
    'margin:0',
    'padding:12px 14px',
    'background:rgba(255,59,48,0.95)',
    'color:#fff',
    'font:12px/1.5 ui-monospace,Menlo,Consolas,monospace',
    'white-space:pre-wrap',
    'word-break:break-all',
    'box-shadow:0 -4px 20px rgba(0,0,0,.4)',
  ].join(';');
  panel.addEventListener('click', () => panel?.remove());
  document.body.appendChild(panel);
  return panel;
}

function showFatal(title: string, detail: string) {
  const el = ensurePanel();
  const stamp = new Date().toLocaleTimeString();
  el.textContent = `${el.textContent ? el.textContent + '\n\n' : ''}[${stamp}] ${title}\n${detail}`;
}

/** 把"正在加载"提示换成醒目的失败态：说明 main.ts 根本没跑到挂载 */
function markBootFailed() {
  const hint = document.getElementById('boot-hint');
  if (!hint) return;
  hint.dataset.failed = '1';
  hint.style.color = '#ff453a';
  hint.textContent = '前端启动失败：模块加载阶段就报错了，请查看日志（adb logcat | findstr BilScore）';
}

export function installDiagnostics() {
  bootLog('boot:start', {
    href: location.href,
    userAgent: navigator.userAgent,
    hasTauriInternals: '__TAURI_INTERNALS__' in window,
    isTauri: !!(
      (window as unknown as { isTauri?: boolean }).isTauri ||
      /tauri/i.test(navigator.userAgent)
    ),
    mode: import.meta.env.MODE,
    viteAppMode: import.meta.env.VITE_APP_MODE,
    dev: import.meta.env.DEV,
  });

  window.addEventListener('error', (e) => {
    const detail = `${e.message}\n${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack ?? ''}`;
    console.error(`${TAG}[window.error]`, detail);
    showFatal('运行时异常', detail);
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as { message?: string; stack?: string } | unknown;
    const msg = (reason as { message?: string })?.message ?? String(reason);
    const stack = (reason as { stack?: string })?.stack ?? '';
    console.error(`${TAG}[unhandledrejection]`, msg, stack);
    showFatal('未处理的 Promise 异常', `${msg}\n${stack}`);
  });

  // 10 秒还没挂载成功 = 模块阶段就挂了
  setTimeout(() => {
    if (document.getElementById('boot-hint')) markBootFailed();
  }, 10000);

  bootLog('boot:handlers-installed');
}

/** Vue 成功挂载后清掉加载提示 */
export function markMounted() {
  document.getElementById('boot-hint')?.remove();
  bootLog('boot:mounted');
}
