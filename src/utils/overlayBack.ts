import { onMounted, onUnmounted, type Ref } from 'vue';

/**
 * Android 返回键：遮罩打开时优先关闭遮罩，而不是让 vue-router 直接回退页面。
 *
 * 做法：打开遮罩时 push 一条「同 URL」的历史记录（保留 vue-router 的 state 字段），
 * 返回键 pop 它时只关闭遮罩；主动点关闭则消费掉这条记录。
 * 因为 URL 始终没变，vue-router 收到的重复 popstate 不会造成页面跳转。
 */
export function useOverlayBack(isOpen: Ref<boolean>, close: () => void) {
  let pushed = false;

  const onPop = () => {
    if (!pushed) return;
    pushed = false;
    if (isOpen.value) close();
  };

  onMounted(() => window.addEventListener('popstate', onPop));
  onUnmounted(() => window.removeEventListener('popstate', onPop));

  const push = () => {
    if (pushed) return;
    try {
      history.pushState({ ...history.state, bilscoreOverlay: true }, '');
      pushed = true;
    } catch {
      // 个别 WebView 限制 pushState 时退化为不拦截，功能本身不受影响
    }
  };

  const pop = () => {
    if (!pushed) return;
    pushed = false;
    try {
      history.back();
    } catch {
      // 同上
    }
  };

  return { push, pop };
}
