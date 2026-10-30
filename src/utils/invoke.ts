// src/utils/invoke.ts
// Tauri invoke 的统一兜底：失败时弹原生提示，而不是静默吞掉异常。
// 注意：这里返回 boolean（是否成功），**不要**改成返回原值 —— void 类的命令
// 返回值是 undefined，会被 `if (ok)` 判定为 false，导致后续跳转不执行。
import { appAlert } from './dialog';

export async function guard<T>(task: Promise<T>, message = '操作失败，请重试'): Promise<boolean> {
  try {
    await task;
    return true;
  } catch (e) {
    console.error('[BilScore][invoke-fail]', message, e);
    await appAlert(message, '出错了');
    return false;
  }
}
