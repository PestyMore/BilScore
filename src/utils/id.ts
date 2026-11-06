// 本地实体 id：优先用 WebView 提供的 UUID；非安全上下文（部分 Android / iOS WebView）
// 退回「时间戳 + 随机数」，仍比裸 Date.now() 难碰撞得多，且不引入任何依赖。
export const newId = (prefix: string): string => {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
};
