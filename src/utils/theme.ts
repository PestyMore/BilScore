// 主题：在 Vue 挂载之前就要应用，否则浅色主题首帧会闪一下暗底。
// 同时同步 theme-color，让 Android 状态栏颜色与界面一致。
const KEY = 'bilscore_theme';

export type Theme = 'dark' | 'light';

const BAR_DARK = '#0b1f1a';
const BAR_LIGHT = '#f6f4ec';

export const readTheme = (): Theme => {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

export const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? BAR_LIGHT : BAR_DARK);
};

export const toggleTheme = (): Theme => {
  const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // 存储不可用时仍可切换本次会话的主题
  }
  applyTheme(next);
  return next;
};
